from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

Money = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


# ---------------------------------------------------------------- Categorías
class CategoriaResumen(ORMModel):
    id: int = Field(examples=[1])
    nombre: str = Field(examples=["Papelería"])


class CategoriaOut(CategoriaResumen):
    descripcion: str | None = None
    activo: bool
    created_at: datetime
    updated_at: datetime


class CategoriaCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100, examples=["Papelería"])
    descripcion: str | None = Field(default=None, max_length=255, examples=["Cuadernos, lapiceros y útiles"])


class CategoriaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=255)
    activo: bool | None = None


# ---------------------------------------------------------------- Productos
class ProductoOut(ORMModel):
    id: int = Field(examples=[1])
    sku: str = Field(examples=["PAP-001"])
    nombre: str = Field(examples=["Cuaderno argollado 100 hojas"])
    descripcion: str | None = None
    categoria: CategoriaResumen | None = None
    precio_venta: Decimal = Field(examples=["8500.00"])
    costo: Decimal | None = Field(default=None, description="Solo visible para ADMIN (null para CLIENTE)", examples=["5200.00"])
    activo: bool
    stock: int = Field(description="Unidades disponibles", examples=[40])
    stock_minimo: int = Field(examples=[10])
    created_at: datetime
    updated_at: datetime


class ProductoCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=50, pattern=r"^[A-Za-z0-9._-]+$", examples=["PAP-001"])
    nombre: str = Field(min_length=2, max_length=150, examples=["Cuaderno argollado 100 hojas"])
    descripcion: str | None = Field(default=None, examples=["Cuaderno cuadriculado tamaño carta"])
    categoria_id: int | None = Field(default=None, examples=[1])
    precio_venta: Money = Field(examples=["8500.00"])
    costo: Money = Field(examples=["5200.00"])
    activo: bool = True
    stock_minimo: int = Field(default=0, ge=0, examples=[10])
    stock_inicial: int = Field(default=0, ge=0, description="Si es > 0 se registra una ENTRADA", examples=[40])


class ProductoUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=2, max_length=50, pattern=r"^[A-Za-z0-9._-]+$")
    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    descripcion: str | None = None
    categoria_id: int | None = None
    precio_venta: Money | None = None
    costo: Money | None = None
    activo: bool | None = None

    model_config = {"json_schema_extra": {"examples": [{"precio_venta": "9000.00", "activo": True}]}}
