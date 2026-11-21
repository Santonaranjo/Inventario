from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.inventario import Inventario


class Categoria(TimestampMixin, Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())


class Producto(TimestampMixin, Base):
    __tablename__ = "productos"
    __table_args__ = (
        CheckConstraint("precio_venta >= 0", name="precio_venta_no_negativo"),
        CheckConstraint("costo >= 0", name="costo_no_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True)
    nombre: Mapped[str] = mapped_column(String(150), index=True)
    descripcion: Mapped[str | None] = mapped_column(Text)
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id", ondelete="RESTRICT"), index=True)
    precio_venta: Mapped[Decimal]
    costo: Mapped[Decimal]
    # Soft delete: los productos nunca se borran físicamente.
    activo: Mapped[bool] = mapped_column(default=True, server_default=true(), index=True)

    categoria: Mapped[Categoria | None] = relationship(lazy="selectin")
    inventario: Mapped["Inventario"] = relationship(back_populates="producto", lazy="selectin", uselist=False)

    @property
    def stock(self) -> int:
        return self.inventario.stock if self.inventario else 0

    @property
    def stock_minimo(self) -> int:
        return self.inventario.stock_minimo if self.inventario else 0
