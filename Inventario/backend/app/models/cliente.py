from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, pg_enum
from app.models.enums import TipoDocumento

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class Cliente(TimestampMixin, Base):
    __tablename__ = "clientes"
    __table_args__ = (UniqueConstraint("tipo_documento", "documento", name="uq_clientes_tipo_documento_documento"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # Vínculo opcional 1:1 con un usuario de rol CLIENTE.
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"), unique=True)
    tipo_documento: Mapped[TipoDocumento] = mapped_column(
        pg_enum(TipoDocumento, "tipo_documento"), default=TipoDocumento.CC, server_default=TipoDocumento.CC.value
    )
    documento: Mapped[str] = mapped_column(String(30))
    nombre: Mapped[str] = mapped_column(String(150), index=True)
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    telefono: Mapped[str | None] = mapped_column(String(30))
    direccion: Mapped[str | None] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())

    usuario: Mapped["Usuario | None"] = relationship(back_populates="cliente")
