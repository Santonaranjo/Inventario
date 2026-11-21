from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import TipoDocumento
from app.schemas.common import ORMModel


class ClienteResumen(ORMModel):
    id: int = Field(examples=[1])
    tipo_documento: TipoDocumento = Field(examples=["CC"])
    documento: str = Field(examples=["1053800123"])
    nombre: str = Field(examples=["Carlos Pérez"])
    email: EmailStr | None = Field(default=None, examples=["carlos@correo.com"])


class ClienteOut(ClienteResumen):
    telefono: str | None = Field(default=None, examples=["3001234567"])
    direccion: str | None = Field(default=None, examples=["Cra 23 #45-10, Manizales"])
    usuario_id: int | None = Field(default=None, examples=[2])
    activo: bool
    created_at: datetime
    updated_at: datetime


class ClienteCreate(BaseModel):
    tipo_documento: TipoDocumento = TipoDocumento.CC
    documento: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9-]+$", examples=["1053800123"])
    nombre: str = Field(min_length=2, max_length=150, examples=["Carlos Pérez"])
    email: EmailStr | None = Field(default=None, examples=["carlos@correo.com"])
    telefono: str | None = Field(default=None, max_length=30, examples=["3001234567"])
    direccion: str | None = Field(default=None, max_length=255, examples=["Cra 23 #45-10, Manizales"])
    usuario_id: int | None = Field(default=None, description="Usuario de rol CLIENTE a vincular (opcional)")


class ClienteUpdate(BaseModel):
    tipo_documento: TipoDocumento | None = None
    documento: str | None = Field(default=None, min_length=3, max_length=30, pattern=r"^[A-Za-z0-9-]+$")
    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    email: EmailStr | None = None
    telefono: str | None = Field(default=None, max_length=30)
    direccion: str | None = Field(default=None, max_length=255)
    usuario_id: int | None = Field(default=None, description="Envía null para desvincular")
    activo: bool | None = None

    model_config = {"json_schema_extra": {"examples": [{"telefono": "3109876543"}]}}
