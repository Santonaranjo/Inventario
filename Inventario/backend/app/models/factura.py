from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, Sequence, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.venta import Venta

# Secuencia de PostgreSQL para el número consecutivo de facturas (creada en la migración 0004).
FACTURA_SEQ = Sequence("factura_consecutivo_seq", metadata=Base.metadata)
PREFIJO_FACTURA = "FAC-"


class Factura(Base):
    __tablename__ = "facturas"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="subtotal_no_negativo"),
        CheckConstraint("impuestos >= 0", name="impuestos_no_negativo"),
        CheckConstraint("porcentaje_iva >= 0 AND porcentaje_iva <= 100", name="porcentaje_iva_rango"),
        CheckConstraint("total = subtotal + impuestos", name="total_cuadra"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    consecutivo: Mapped[int] = mapped_column(unique=True)
    numero: Mapped[str] = mapped_column(String(20), unique=True)  # FAC-000001
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id", ondelete="RESTRICT"), unique=True)
    subtotal: Mapped[Decimal]
    porcentaje_iva: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    impuestos: Mapped[Decimal]
    total: Mapped[Decimal]
    fecha_emision: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)
    anulada: Mapped[bool] = mapped_column(default=False, server_default="false")
    anulada_at: Mapped[datetime | None]

    venta: Mapped["Venta"] = relationship(back_populates="factura", lazy="selectin")

    @property
    def cliente(self):
        return self.venta.cliente

    @property
    def detalles(self):
        return self.venta.detalles
