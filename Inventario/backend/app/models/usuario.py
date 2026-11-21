from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, pg_enum
from app.models.enums import RolUsuario

if TYPE_CHECKING:
    from app.models.cliente import Cliente


class Usuario(TimestampMixin, Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    nombre: Mapped[str] = mapped_column(String(150))
    rol: Mapped[RolUsuario] = mapped_column(
        pg_enum(RolUsuario, "rol_usuario"), default=RolUsuario.CLIENTE, server_default=RolUsuario.CLIENTE.value
    )
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())

    cliente: Mapped["Cliente | None"] = relationship(back_populates="usuario", lazy="selectin")


class RefreshToken(Base):
    """Refresh tokens emitidos. Permite rotación y logout (revocación)."""

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime]
    revocado: Mapped[bool] = mapped_column(default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
