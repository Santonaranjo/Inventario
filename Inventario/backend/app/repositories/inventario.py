from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Inventario, MovimientoInventario, Producto
from app.models.enums import TipoMovimiento
from app.repositories.base import paginate
from app.schemas.common import PageParams


class InventarioRepository:
    SORT_FIELDS = {
        "producto_id": Inventario.producto_id,
        "stock": Inventario.stock,
        "stock_minimo": Inventario.stock_minimo,
        "sku": Producto.sku,
        "nombre": Producto.nombre,
        "updated_at": Inventario.updated_at,
    }

    def __init__(self, db: Session):
        self.db = db

    def get(self, producto_id: int) -> Inventario | None:
        return self.db.get(Inventario, producto_id)

    def lock(self, producto_id: int) -> Inventario | None:
        """SELECT ... FOR UPDATE: bloquea la fila hasta el fin de la transacción."""
        stmt = (
            select(Inventario)
            .where(Inventario.producto_id == producto_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return self.db.scalar(stmt)

    def lock_many(self, producto_ids: list[int]) -> dict[int, Inventario]:
        # Orden fijo por producto_id para evitar deadlocks entre transacciones concurrentes.
        stmt = (
            select(Inventario)
            .where(Inventario.producto_id.in_(producto_ids))
            .order_by(Inventario.producto_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return {inv.producto_id: inv for inv in self.db.scalars(stmt)}

    def add(self, inventario: Inventario) -> None:
        self.db.add(inventario)

    def list(self, params: PageParams, activo: bool | None, solo_alertas: bool):
        stmt = select(Inventario).join(Inventario.producto)
        if activo is not None:
            stmt = stmt.where(Producto.activo == activo)
        if solo_alertas:
            stmt = stmt.where(Inventario.stock <= Inventario.stock_minimo)
        return paginate(
            self.db,
            stmt,
            params,
            search_columns=(Producto.sku, Producto.nombre),
            sort_fields=self.SORT_FIELDS,
            default_sort=[Producto.nombre.asc()] if not solo_alertas else [(Inventario.stock - Inventario.stock_minimo).asc()],
        )


class MovimientoRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, movimiento: MovimientoInventario) -> MovimientoInventario:
        self.db.add(movimiento)
        self.db.flush()
        return movimiento

    def list(
        self,
        params: PageParams,
        producto_id: int | None,
        tipo: TipoMovimiento | None,
        venta_id: int | None,
        fecha_desde: datetime | None,
        fecha_hasta: datetime | None,
    ):
        stmt = select(MovimientoInventario).join(MovimientoInventario.producto)
        if producto_id is not None:
            stmt = stmt.where(MovimientoInventario.producto_id == producto_id)
        if tipo is not None:
            stmt = stmt.where(MovimientoInventario.tipo == tipo)
        if venta_id is not None:
            stmt = stmt.where(MovimientoInventario.venta_id == venta_id)
        if fecha_desde is not None:
            stmt = stmt.where(MovimientoInventario.fecha >= fecha_desde)
        if fecha_hasta is not None:
            stmt = stmt.where(MovimientoInventario.fecha <= fecha_hasta)
        return paginate(
            self.db,
            stmt,
            params,
            search_columns=(Producto.sku, Producto.nombre, MovimientoInventario.motivo),
            sort_fields={"id": MovimientoInventario.id, "fecha": MovimientoInventario.fecha, "cantidad": MovimientoInventario.cantidad},
            default_sort=[MovimientoInventario.fecha.desc(), MovimientoInventario.id.desc()],
        )
