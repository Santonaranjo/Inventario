from datetime import datetime

from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.models import Inventario, MovimientoInventario, Usuario
from app.models.enums import TipoMovimiento
from app.repositories.inventario import InventarioRepository, MovimientoRepository
from app.schemas.common import Page, PageParams
from app.schemas.inventario import InventarioOut, MovimientoCreate, MovimientoOut


class InventarioService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = InventarioRepository(db)
        self.movimientos = MovimientoRepository(db)

    # ------------------------------------------------------------------ núcleo
    def aplicar_movimiento(
        self,
        inv: Inventario,
        tipo: TipoMovimiento,
        cantidad: int,
        motivo: str,
        usuario_id: int,
        venta_id: int | None = None,
    ) -> MovimientoInventario:
        """Aplica ENTRADA/SALIDA sobre una fila de inventario YA bloqueada. No hace commit:
        quien llama decide la transacción (p. ej. confirmar una venta completa)."""
        if cantidad <= 0:
            raise BadRequestError("La cantidad debe ser mayor que cero")
        anterior = inv.stock
        if tipo == TipoMovimiento.ENTRADA:
            nuevo = anterior + cantidad
        elif tipo == TipoMovimiento.SALIDA:
            if cantidad > anterior:
                raise ConflictError(
                    f"Stock insuficiente para {inv.sku} (disponible: {anterior}, solicitado: {cantidad})",
                    "STOCK_INSUFICIENTE",
                )
            nuevo = anterior - cantidad
        else:
            raise BadRequestError("Usa ajustar() para movimientos de tipo AJUSTE")
        inv.stock = nuevo
        return self._registrar(inv, tipo, cantidad, anterior, nuevo, motivo, usuario_id, venta_id)

    def ajustar(self, inv: Inventario, stock_nuevo: int, motivo: str, usuario_id: int) -> MovimientoInventario:
        anterior = inv.stock
        if stock_nuevo == anterior:
            raise BadRequestError("El stock nuevo es igual al actual; no hay nada que ajustar", "AJUSTE_SIN_CAMBIO")
        inv.stock = stock_nuevo
        return self._registrar(inv, TipoMovimiento.AJUSTE, abs(stock_nuevo - anterior), anterior, stock_nuevo, motivo, usuario_id)

    def _registrar(self, inv, tipo, cantidad, anterior, nuevo, motivo, usuario_id, venta_id=None) -> MovimientoInventario:
        datos = dict(
            producto_id=inv.producto_id,
            tipo=tipo,
            cantidad=cantidad,
            stock_anterior=anterior,
            stock_nuevo=nuevo,
            motivo=motivo,
            usuario_id=usuario_id,
        )
        if venta_id is not None:
            datos["venta_id"] = venta_id
        return self.movimientos.add(MovimientoInventario(**datos))

    # ------------------------------------------------------------------ casos de uso
    def get(self, producto_id: int) -> Inventario:
        inv = self.repo.get(producto_id)
        if inv is None:
            raise NotFoundError("Producto no encontrado")
        return inv

    def list(self, params: PageParams, activo: bool | None, solo_alertas: bool = False) -> Page[InventarioOut]:
        items, total = self.repo.list(params, activo, solo_alertas)
        return Page.build([InventarioOut.model_validate(i) for i in items], total, params.page, params.size)

    def alertas(self, params: PageParams) -> Page[InventarioOut]:
        """Productos activos con stock en o por debajo del mínimo (los más críticos primero)."""
        return self.list(params, activo=True, solo_alertas=True)

    def actualizar_stock_minimo(self, producto_id: int, stock_minimo: int) -> Inventario:
        inv = self.repo.lock(producto_id)
        if inv is None:
            raise NotFoundError("Producto no encontrado")
        inv.stock_minimo = stock_minimo
        self.db.commit()
        self.db.refresh(inv)
        return inv

    def movimiento_manual(self, data: MovimientoCreate, usuario: Usuario) -> MovimientoInventario:
        inv = self.repo.lock(data.producto_id)
        if inv is None:
            raise NotFoundError("Producto no encontrado")
        if data.tipo == TipoMovimiento.AJUSTE:
            mov = self.ajustar(inv, data.stock_nuevo, data.motivo, usuario.id)
        else:
            mov = self.aplicar_movimiento(inv, data.tipo, data.cantidad, data.motivo, usuario.id)
        self.db.commit()
        self.db.refresh(mov)
        return mov

    def list_movimientos(
        self,
        params: PageParams,
        producto_id: int | None = None,
        tipo: TipoMovimiento | None = None,
        venta_id: int | None = None,
        fecha_desde: datetime | None = None,
        fecha_hasta: datetime | None = None,
    ) -> Page[MovimientoOut]:
        items, total = self.movimientos.list(params, producto_id, tipo, venta_id, fecha_desde, fecha_hasta)
        return Page.build([MovimientoOut.model_validate(m) for m in items], total, params.page, params.size)
