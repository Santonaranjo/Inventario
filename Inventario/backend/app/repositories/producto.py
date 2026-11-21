from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Categoria, Producto
from app.repositories.base import paginate
from app.schemas.common import PageParams


class CategoriaRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, categoria_id: int) -> Categoria | None:
        return self.db.get(Categoria, categoria_id)

    def get_by_nombre(self, nombre: str) -> Categoria | None:
        return self.db.scalar(select(Categoria).where(func.lower(Categoria.nombre) == nombre.strip().lower()))

    def add(self, categoria: Categoria) -> Categoria:
        self.db.add(categoria)
        self.db.flush()
        return categoria

    def list(self, params: PageParams, activo: bool | None):
        stmt = select(Categoria)
        if activo is not None:
            stmt = stmt.where(Categoria.activo == activo)
        return paginate(
            self.db,
            stmt,
            params,
            search_columns=(Categoria.nombre,),
            sort_fields={"id": Categoria.id, "nombre": Categoria.nombre, "created_at": Categoria.created_at},
            default_sort=[Categoria.nombre.asc()],
        )


class ProductoRepository:
    SORT_FIELDS = {
        "id": Producto.id,
        "sku": Producto.sku,
        "nombre": Producto.nombre,
        "precio_venta": Producto.precio_venta,
        "created_at": Producto.created_at,
    }

    def __init__(self, db: Session):
        self.db = db

    def get(self, producto_id: int) -> Producto | None:
        return self.db.get(Producto, producto_id)

    def get_by_sku(self, sku: str) -> Producto | None:
        return self.db.scalar(select(Producto).where(func.upper(Producto.sku) == sku.strip().upper()))

    def add(self, producto: Producto) -> Producto:
        self.db.add(producto)
        self.db.flush()
        return producto

    def list(self, params: PageParams, categoria_id: int | None, activo: bool | None):
        stmt = select(Producto)
        if categoria_id is not None:
            stmt = stmt.where(Producto.categoria_id == categoria_id)
        if activo is not None:
            stmt = stmt.where(Producto.activo == activo)
        return paginate(
            self.db,
            stmt,
            params,
            search_columns=(Producto.sku, Producto.nombre, Producto.descripcion),
            sort_fields=self.SORT_FIELDS,
            default_sort=[Producto.nombre.asc()],
        )
