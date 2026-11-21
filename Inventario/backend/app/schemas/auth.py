from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.enums import TipoDocumento
from app.schemas.cliente import ClienteOut
from app.schemas.usuario import UsuarioOut


class LoginIn(BaseModel):
    email: EmailStr = Field(examples=["admin@inventario.com"])
    password: str = Field(min_length=1, max_length=72, examples=["Admin123*"])


class RegisterIn(BaseModel):
    """Registro público: crea un usuario CLIENTE y su ficha de cliente."""

    email: EmailStr = Field(examples=["carlos@correo.com"])
    password: str = Field(min_length=8, max_length=72, examples=["Clave123*"])
    nombre: str = Field(min_length=2, max_length=150, examples=["Carlos Pérez"])
    tipo_documento: TipoDocumento = Field(default=TipoDocumento.CC, examples=["CC"])
    documento: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9-]+$", examples=["1053800123"])
    telefono: str | None = Field(default=None, max_length=30, examples=["3001234567"])
    direccion: str | None = Field(default=None, max_length=255, examples=["Cra 23 #45-10, Manizales"])


class RefreshIn(BaseModel):
    refresh_token: str = Field(examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."])


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Segundos de vida del access_token", examples=[1800])
    usuario: UsuarioOut


class MeOut(UsuarioOut):
    cliente: ClienteOut | None = Field(default=None, description="Ficha de cliente (solo usuarios CLIENTE vinculados)")


class MeUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    telefono: str | None = Field(default=None, max_length=30)
    direccion: str | None = Field(default=None, max_length=255)
    password_actual: str | None = Field(default=None, max_length=72)
    password_nuevo: str | None = Field(default=None, min_length=8, max_length=72)

    model_config = {
        "json_schema_extra": {"examples": [{"telefono": "3109876543", "password_actual": "Clave123*", "password_nuevo": "NuevaClave1*"}]}
    }

    @model_validator(mode="after")
    def _password_pair(self):
        if self.password_nuevo and not self.password_actual:
            raise ValueError("Para cambiar la contraseña envía password_actual")
        return self
