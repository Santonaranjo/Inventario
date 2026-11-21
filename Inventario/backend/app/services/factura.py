from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ConflictError, NotFoundError
from app.models import Factura, Usuario
from app.models.enums import EstadoVenta
from app.models.factura import PREFIJO_FACTURA
from app.repositories.cliente import ClienteRepository
from app.repositories.venta import FacturaRepository, VentaRepository
from app.schemas.common import Page, PageParams
from app.schemas.factura import FacturaOut
from app.services.producto import es_admin

CENTAVOS = Decimal("0.01")


def calcular_iva(subtotal: Decimal, porcentaje: Decimal) -> Decimal:
    return (subtotal * porcentaje / Decimal("100")).quantize(CENTAVOS, rounding=ROUND_HALF_UP)


class FacturaService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FacturaRepository(db)
        self.ventas = VentaRepository(db)
        self.clientes = ClienteRepository(db)

    def generar(self, venta_id: int) -> Factura:
        venta = self.ventas.get_for_update(venta_id)  # evita dos facturas simultáneas para la misma venta
        if venta is None:
            raise NotFoundError("Venta no encontrada")
        if venta.estado != EstadoVenta.PAGADA:
            raise ConflictError(
                f"Solo se facturan ventas PAGADAS (estado actual: {venta.estado.value})", "VENTA_NO_PAGADA"
            )
        if venta.factura is not None:
            raise ConflictError(f"La venta ya tiene la factura {venta.factura.numero}", "FACTURA_EXISTENTE")

        porcentaje = settings.IVA_PORCENTAJE.quantize(CENTAVOS)
        subtotal = venta.total
        impuestos = calcular_iva(subtotal, porcentaje)
        consecutivo = self.repo.next_consecutivo()
        factura = self.repo.add(
            Factura(
                consecutivo=consecutivo,
                numero=f"{PREFIJO_FACTURA}{consecutivo:06d}",
                venta_id=venta.id,
                subtotal=subtotal,
                porcentaje_iva=porcentaje,
                impuestos=impuestos,
                total=subtotal + impuestos,
            )
        )
        self.db.commit()
        self.db.refresh(factura)
        return factura

    def get(self, factura_id: int, usuario: Usuario) -> Factura:
        factura = self.repo.get(factura_id)
        if factura is None or (not es_admin(usuario) and factura.venta.cliente.usuario_id != usuario.id):
            raise NotFoundError("Factura no encontrada")
        return factura

    def list(
        self,
        params: PageParams,
        usuario: Usuario,
        cliente_id: int | None = None,
        anulada: bool | None = None,
        fecha_desde: datetime | None = None,
        fecha_hasta: datetime | None = None,
    ) -> Page[FacturaOut]:
        if not es_admin(usuario):
            cliente = self.clientes.get_by_usuario(usuario.id)
            if cliente is None:
                return Page.build([], 0, params.page, params.size)
            cliente_id = cliente.id
        items, total = self.repo.list(params, cliente_id, anulada, fecha_desde, fecha_hasta)
        return Page.build([FacturaOut.model_validate(f) for f in items], total, params.page, params.size)
