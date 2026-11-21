from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.cliente import ClienteResumen
from app.schemas.common import ORMModel
from app.schemas.venta import DetalleVentaOut


class FacturaOut(ORMModel):
    id: int = Field(examples=[1])
    numero: str = Field(examples=["FAC-000001"])
    venta_id: int = Field(examples=[5])
    cliente: ClienteResumen
    subtotal: Decimal = Field(examples=["17000.00"])
    porcentaje_iva: Decimal = Field(examples=["19.00"])
    impuestos: Decimal = Field(examples=["3230.00"])
    total: Decimal = Field(examples=["20230.00"])
    fecha_emision: datetime
    anulada: bool = Field(examples=[False])
    anulada_at: datetime | None = None


class FacturaDetalleOut(FacturaOut):
    detalles: list[DetalleVentaOut]
