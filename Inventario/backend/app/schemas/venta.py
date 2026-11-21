from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import EstadoVenta
from app.schemas.cliente import ClienteResumen
from app.schemas.common import ORMModel


class ItemVentaIn(BaseModel):
    producto_id: int = Field(examples=[1])
    cantidad: int = Field(gt=0, le=10_000, examples=[2])


class VentaCreate(BaseModel):
    cliente_id: int | None = Field(
        default=None,
        description="Obligatorio para ADMIN. Para CLIENTE se ignora: la venta siempre queda a su nombre.",
        examples=[1],
    )
    items: list[ItemVentaIn] = Field(min_length=1, max_length=100)
    observaciones: str | None = Field(default=None, max_length=255, examples=["Entregar en portería"])

    model_config = {
        "json_schema_extra": {
            "examples": [{"items": [{"producto_id": 1, "cantidad": 2}, {"producto_id": 3, "cantidad": 1}]}]
        }
    }


class AnularIn(BaseModel):
    motivo: str = Field(min_length=3, max_length=255, examples=["El cliente desistió de la compra"])


class DetalleVentaOut(ORMModel):
    id: int
    producto_id: int = Field(examples=[1])
    sku: str = Field(examples=["PAP-001"])
    producto_nombre: str = Field(examples=["Cuaderno argollado 100 hojas"])
    cantidad: int = Field(examples=[2])
    precio_unitario: Decimal = Field(examples=["8500.00"])
    subtotal: Decimal = Field(examples=["17000.00"])


class VentaOut(ORMModel):
    id: int = Field(examples=[5])
    cliente: ClienteResumen
    usuario_id: int = Field(description="Usuario que registró la venta", examples=[2])
    estado: EstadoVenta = Field(examples=["PAGADA"])
    total: Decimal = Field(description="Suma de subtotales, antes de IVA", examples=["17000.00"])
    observaciones: str | None = None
    detalles: list[DetalleVentaOut]
    factura_id: int | None = Field(default=None, examples=[1])
    numero_factura: str | None = Field(default=None, examples=["FAC-000001"])
    created_at: datetime = Field(description="Fecha de la venta")
    updated_at: datetime
    pagada_at: datetime | None = None
    anulada_at: datetime | None = None
    motivo_anulacion: str | None = None
