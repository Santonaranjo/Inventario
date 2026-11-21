from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import RolUsuario
from app.schemas.common import ORMModel

Password = Field(min_length=8, max_length=72, description="Entre 8 y 72 caracteres")


class UsuarioOut(ORMModel):
    id: int = Field(examples=[1])
    email: EmailStr = Field(examples=["admin@inventario.com"])
    nombre: str = Field(examples=["Administrador"])
    rol: RolUsuario = Field(examples=["ADMIN"])
    activo: bool = Field(examples=[True])
    created_at: datetime


class UsuarioCreate(BaseModel):
    email: EmailStr = Field(examples=["vendedor@inventario.com"])
    password: str = Field(min_length=8, max_length=72, examples=["Clave123*"])
    nombre: str = Field(min_length=2, max_length=150, examples=["Laura Gómez"])
    rol: RolUsuario = Field(default=RolUsuario.CLIENTE, examples=["ADMIN"])


class UsuarioUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    rol: RolUsuario | None = None
    activo: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=72)

    model_config = {"json_schema_extra": {"examples": [{"rol": "ADMIN", "activo": True}]}}
