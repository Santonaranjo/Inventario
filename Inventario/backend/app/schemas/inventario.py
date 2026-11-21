from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.enums import TipoMovimiento
from app.schemas.common import ORMModel


class InventarioOut(ORMModel):
    producto_id: int = Field(examples=[1])
    sku: str = Field(examples=["PAP-001"])
    producto_nombre: str = Field(examples=["Cuaderno argollado 100 hojas"])
    producto_activo: bool
    stock: int = Field(examples=[8])
    stock_minimo: int = Field(examples=[10])
    en_alerta: bool = Field(description="true si stock <= stock_minimo", examples=[True])
    updated_at: datetime


class StockMinimoUpdate(BaseModel):
    stock_minimo: int = Field(ge=0, examples=[15])


class MovimientoCreate(BaseModel):
    """Movimiento manual.
    - ENTRADA / SALIDA: envía `cantidad` (> 0).
    - AJUSTE: envía `stock_nuevo` (conteo físico); se registra la diferencia.
    """

    producto_id: int = Field(examples=[1])
    tipo: TipoMovimiento = Field(examples=["ENTRADA"])
    cantidad: int | None = Field(default=None, gt=0, le=1_000_000, examples=[50])
    stock_nuevo: int | None = Field(default=None, ge=0, le=1_000_000, examples=[None])
    motivo: str = Field(min_length=3, max_length=255, examples=["Compra a proveedor, factura 123"])

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"producto_id": 1, "tipo": "ENTRADA", "cantidad": 50, "motivo": "Compra a proveedor"},
                {"producto_id": 1, "tipo": "AJUSTE", "stock_nuevo": 37, "motivo": "Conteo físico mensual"},
            ]
        }
    }

    @model_validator(mode="after")
    def _campos_por_tipo(self):
        if self.tipo == TipoMovimiento.AJUSTE:
            if self.stock_nuevo is None:
                raise ValueError("Para AJUSTE envía stock_nuevo")
        elif self.cantidad is None:
            raise ValueError(f"Para {self.tipo.value} envía cantidad")
        return self


class MovimientoOut(ORMModel):
    id: int = Field(examples=[10])
    producto_id: int = Field(examples=[1])
    sku: str = Field(examples=["PAP-001"])
    producto_nombre: str = Field(examples=["Cuaderno argollado 100 hojas"])
    tipo: TipoMovimiento = Field(examples=["SALIDA"])
    cantidad: int = Field(examples=[3])
    stock_anterior: int = Field(examples=[20])
    stock_nuevo: int = Field(examples=[17])
    motivo: str = Field(examples=["Venta #5"])
    usuario_id: int = Field(examples=[1])
    usuario_nombre: str = Field(examples=["Administrador"])
    venta_id: int | None = Field(default=None, examples=[5])
    fecha: datetime
