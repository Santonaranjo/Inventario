from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, pg_enum
from app.models.enums import TipoMovimiento

if TYPE_CHECKING:
    from app.models.producto import Producto
    from app.models.usuario import Usuario


class Inventario(Base):
    """Stock actual de un producto (relación 1:1 con productos)."""

    __tablename__ = "inventario"
    __table_args__ = (
        CheckConstraint("stock >= 0", name="stock_no_negativo"),
        CheckConstraint("stock_minimo >= 0", name="stock_minimo_no_negativo"),
    )

    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True)
    stock: Mapped[int] = mapped_column(default=0, server_default="0")
    stock_minimo: Mapped[int] = mapped_column(default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    producto: Mapped["Producto"] = relationship(back_populates="inventario", lazy="selectin")

    @property
    def sku(self) -> str:
        return self.producto.sku

    @property
    def producto_nombre(self) -> str:
        return self.producto.nombre

    @property
    def producto_activo(self) -> bool:
        return self.producto.activo

    @property
    def en_alerta(self) -> bool:
        return self.stock <= self.stock_minimo


class MovimientoInventario(Base):
    """Historial inmutable de cambios de stock."""

    __tablename__ = "movimientos_inventario"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="cantidad_positiva"),
        CheckConstraint("stock_nuevo >= 0", name="stock_nuevo_no_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="RESTRICT"), index=True)
    tipo: Mapped[TipoMovimiento] = mapped_column(pg_enum(TipoMovimiento, "tipo_movimiento"))
    # Siempre positiva. En AJUSTE la dirección se deduce de stock_anterior → stock_nuevo.
    cantidad: Mapped[int]
    stock_anterior: Mapped[int]
    stock_nuevo: Mapped[int]
    motivo: Mapped[str] = mapped_column(String(255))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"), index=True)
    venta_id: Mapped[int | None] = mapped_column(ForeignKey("ventas.id", ondelete="RESTRICT"), index=True)
    fecha: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    producto: Mapped["Producto"] = relationship(lazy="selectin")
    usuario: Mapped["Usuario"] = relationship(lazy="selectin")

    @property
    def sku(self) -> str:
        return self.producto.sku

    @property
    def producto_nombre(self) -> str:
        return self.producto.nombre

    @property
    def usuario_nombre(self) -> str:
        return self.usuario.nombre
