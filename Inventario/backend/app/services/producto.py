from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import Categoria, Inventario, Producto, Usuario
from app.models.enums import RolUsuario, TipoMovimiento
from app.repositories.producto import CategoriaRepository, ProductoRepository
from app.schemas.common import Page, PageParams
from app.schemas.producto import CategoriaCreate, CategoriaOut, CategoriaUpdate, ProductoCreate, ProductoOut, ProductoUpdate


def es_admin(usuario: Usuario) -> bool:
    return usuario.rol == RolUsuario.ADMIN


class CategoriaService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CategoriaRepository(db)

    def get(self, categoria_id: int, usuario: Usuario | None = None) -> Categoria:
        categoria = self.repo.get(categoria_id)
        if categoria is None or (usuario and not es_admin(usuario) and not categoria.activo):
            raise NotFoundError("Categoría no encontrada")
        return categoria

    def list(self, params: PageParams, usuario: Usuario, activo: bool | None) -> Page[CategoriaOut]:
        if not es_admin(usuario):
            activo = True
        items, total = self.repo.list(params, activo)
        return Page.build([CategoriaOut.model_validate(c) for c in items], total, params.page, params.size)

    def _validar_nombre(self, nombre: str, categoria_id: int | None = None) -> None:
        existente = self.repo.get_by_nombre(nombre)
        if existente and existente.id != categoria_id:
            raise ConflictError("Ya existe una categoría con ese nombre", "CATEGORIA_DUPLICADA")

    def create(self, data: CategoriaCreate) -> Categoria:
        self._validar_nombre(data.nombre)
        categoria = self.repo.add(Categoria(nombre=data.nombre.strip(), descripcion=data.descripcion))
        self.db.commit()
        return categoria

    def update(self, categoria_id: int, data: CategoriaUpdate) -> Categoria:
        categoria = self.get(categoria_id)
        fields = data.model_dump(exclude_unset=True)
        if fields.get("nombre"):
            self._validar_nombre(fields["nombre"], categoria.id)
            fields["nombre"] = fields["nombre"].strip()
        for campo, valor in fields.items():
            if valor is None and campo in ("nombre", "activo"):
                continue
            setattr(categoria, campo, valor)
        self.db.commit()
        self.db.refresh(categoria)
        return categoria

    def deactivate(self, categoria_id: int) -> None:
        categoria = self.get(categoria_id)
        categoria.activo = False
        self.db.commit()


class ProductoService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProductoRepository(db)
        self.categorias = CategoriaRepository(db)

    @staticmethod
    def to_out(producto: Producto, usuario: Usuario) -> ProductoOut:
        out = ProductoOut.model_validate(producto)
        if not es_admin(usuario):
            out.costo = None
        return out

    def get(self, producto_id: int, usuario: Usuario | None = None) -> Producto:
        producto = self.repo.get(producto_id)
        if producto is None or (usuario and not es_admin(usuario) and not producto.activo):
            raise NotFoundError("Producto no encontrado")
        return producto

    def list(self, params: PageParams, usuario: Usuario, categoria_id: int | None, activo: bool | None) -> Page[ProductoOut]:
        if not es_admin(usuario):
            activo = True  # el cliente solo ve el catálogo activo
        items, total = self.repo.list(params, categoria_id, activo)
        return Page.build([self.to_out(p, usuario) for p in items], total, params.page, params.size)

    def _validar_sku(self, sku: str, producto_id: int | None = None) -> None:
        existente = self.repo.get_by_sku(sku)
        if existente and existente.id != producto_id:
            raise ConflictError(f"Ya existe un producto con el SKU {sku}", "SKU_DUPLICADO")

    def _validar_categoria(self, categoria_id: int | None) -> None:
        if categoria_id is not None and self.categorias.get(categoria_id) is None:
            raise NotFoundError("Categoría no encontrada")

    def _crear_producto(self, data: ProductoCreate) -> Producto:
        self._validar_sku(data.sku)
        self._validar_categoria(data.categoria_id)
        campos = data.model_dump(include={"sku", "nombre", "descripcion", "categoria_id", "precio_venta", "costo", "activo"})
        campos["sku"] = campos["sku"].strip().upper()
        return self.repo.add(Producto(**campos))

    def create(self, data: ProductoCreate, usuario: Usuario) -> Producto:
        """Crea el producto y su fila de inventario en la misma transacción."""
        from app.services.inventario import InventarioService

        producto = self._crear_producto(data)
        inv = Inventario(producto_id=producto.id, stock=0, stock_minimo=data.stock_minimo)
        producto.inventario = inv
        self.db.flush()
        if data.stock_inicial > 0:
            InventarioService(self.db).aplicar_movimiento(
                inv, TipoMovimiento.ENTRADA, data.stock_inicial, "Stock inicial", usuario.id
            )
        self.db.commit()
        self.db.refresh(producto)
        return producto

    def update(self, producto_id: int, data: ProductoUpdate) -> Producto:
        producto = self.get(producto_id)
        fields = data.model_dump(exclude_unset=True)
        for obligatorio in ("sku", "nombre", "precio_venta", "costo", "activo"):
            if obligatorio in fields and fields[obligatorio] is None:
                fields.pop(obligatorio)
        if "sku" in fields:
            fields["sku"] = fields["sku"].strip().upper()
            self._validar_sku(fields["sku"], producto.id)
        if fields.get("categoria_id") is not None:
            self._validar_categoria(fields["categoria_id"])
        for campo, valor in fields.items():
            setattr(producto, campo, valor)
        self.db.commit()
        self.db.refresh(producto)
        return producto

    def deactivate(self, producto_id: int) -> None:
        producto = self.get(producto_id)
        producto.activo = False
        self.db.commit()
