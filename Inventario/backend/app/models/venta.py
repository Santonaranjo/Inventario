from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, pg_enum
from app.models.enums import EstadoVenta

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.factura import Factura
    from app.models.producto import Producto


class Venta(TimestampMixin, Base):
    """Encabezado de la venta. created_at es la fecha de la venta."""

    __tablename__ = "ventas"
    __table_args__ = (CheckConstraint("total >= 0", name="total_no_negativo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="RESTRICT"), index=True)
    # Usuario que registró la venta (el propio cliente o un ADMIN).
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"), index=True)
    estado: Mapped[EstadoVenta] = mapped_column(
        pg_enum(EstadoVenta, "estado_venta"),
        default=EstadoVenta.PENDIENTE,
        server_default=EstadoVenta.PENDIENTE.value,
        index=True,
    )
    # Suma de subtotales del detalle, ANTES de IVA (el IVA se calcula en la factura).
    total: Mapped[Decimal] = mapped_column(default=Decimal("0.00"), server_default="0")
    observaciones: Mapped[str | None] = mapped_column(String(255))
    pagada_at: Mapped[datetime | None]
    anulada_at: Mapped[datetime | None]
    motivo_anulacion: Mapped[str | None] = mapped_column(String(255))

    cliente: Mapped["Cliente"] = relationship(lazy="selectin")
    detalles: Mapped[list["VentaDetalle"]] = relationship(
        back_populates="venta", lazy="selectin", cascade="all, delete-orphan", order_by="VentaDetalle.id"
    )
    factura: Mapped["Factura | None"] = relationship(back_populates="venta", lazy="selectin", uselist=False)

    @property
    def factura_id(self) -> int | None:
        return self.factura.id if self.factura else None

    @property
    def numero_factura(self) -> str | None:
        return self.factura.numero if self.factura else None


class VentaDetalle(Base):
    __tablename__ = "venta_detalles"
    __table_args__ = (
        UniqueConstraint("venta_id", "producto_id", name="uq_venta_detalles_venta_producto"),
        CheckConstraint("cantidad > 0", name="cantidad_positiva"),
        CheckConstraint("precio_unitario >= 0", name="precio_unitario_no_negativo"),
        CheckConstraint("subtotal >= 0", name="subtotal_no_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id", ondelete="CASCADE"), index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="RESTRICT"), index=True)
    cantidad: Mapped[int]
    # Precio copiado del producto al crear la venta (no cambia si luego cambia el precio).
    precio_unitario: Mapped[Decimal]
    subtotal: Mapped[Decimal]

    venta: Mapped[Venta] = relationship(back_populates="detalles")
    producto: Mapped["Producto"] = relationship(lazy="selectin")

    @property
    def sku(self) -> str:
        return self.producto.sku

    @property
    def producto_nombre(self) -> str:
        return self.producto.nombre
