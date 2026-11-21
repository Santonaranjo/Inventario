from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Cliente, Factura, Venta
from app.models.enums import EstadoVenta
from app.models.factura import FACTURA_SEQ
from app.repositories.base import paginate
from app.schemas.common import PageParams


class VentaRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, venta_id: int) -> Venta | None:
        return self.db.get(Venta, venta_id)

    def get_for_update(self, venta_id: int) -> Venta | None:
        stmt = select(Venta).where(Venta.id == venta_id).with_for_update().execution_options(populate_existing=True)
        return self.db.scalar(stmt)

    def add(self, venta: Venta) -> Venta:
        self.db.add(venta)
        self.db.flush()
        return venta

    def delete(self, venta: Venta) -> None:
        self.db.delete(venta)

    def list(
        self,
        params: PageParams,
        cliente_id: int | None,
        estado: EstadoVenta | None,
        fecha_desde: datetime | None,
        fecha_hasta: datetime | None,
    ):
        stmt = select(Venta).join(Venta.cliente)
        if cliente_id is not None:
            stmt = stmt.where(Venta.cliente_id == cliente_id)
        if estado is not None:
            stmt = stmt.where(Venta.estado == estado)
        if fecha_desde is not None:
            stmt = stmt.where(Venta.created_at >= fecha_desde)
        if fecha_hasta is not None:
            stmt = stmt.where(Venta.created_at <= fecha_hasta)
        return paginate(
            self.db,
            stmt,
            params,
            search_columns=(Cliente.nombre, Cliente.documento),
            sort_fields={"id": Venta.id, "created_at": Venta.created_at, "total": Venta.total, "estado": Venta.estado},
            default_sort=[Venta.created_at.desc(), Venta.id.desc()],
        )


class FacturaRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, factura_id: int) -> Factura | None:
        return self.db.get(Factura, factura_id)

    def next_consecutivo(self) -> int:
        return self.db.scalar(select(FACTURA_SEQ.next_value()))

    def add(self, factura: Factura) -> Factura:
        self.db.add(factura)
        self.db.flush()
        return factura

    def list(
        self,
        params: PageParams,
        cliente_id: int | None,
        anulada: bool | None,
        fecha_desde: datetime | None,
        fecha_hasta: datetime | None,
    ):
        stmt = select(Factura).join(Factura.venta).join(Venta.cliente)
        if cliente_id is not None:
            stmt = stmt.where(Venta.cliente_id == cliente_id)
        if anulada is not None:
            stmt = stmt.where(Factura.anulada == anulada)
        if fecha_desde is not None:
            stmt = stmt.where(Factura.fecha_emision >= fecha_desde)
        if fecha_hasta is not None:
            stmt = stmt.where(Factura.fecha_emision <= fecha_hasta)
        return paginate(
            self.db,
            stmt,
            params,
            search_columns=(Factura.numero, Cliente.nombre, Cliente.documento),
            sort_fields={
                "id": Factura.id,
                "numero": Factura.consecutivo,
                "fecha_emision": Factura.fecha_emision,
                "total": Factura.total,
            },
            default_sort=[Factura.consecutivo.desc()],
        )
