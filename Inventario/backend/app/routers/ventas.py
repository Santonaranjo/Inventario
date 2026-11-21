from datetime import datetime

from fastapi import APIRouter, Depends, Query, status

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.models.enums import EstadoVenta
from app.schemas.common import ERROR_RESPONSES, Page, PageParams
from app.schemas.factura import FacturaDetalleOut
from app.schemas.venta import AnularIn, VentaCreate, VentaOut
from app.services.factura import FacturaService
from app.services.venta import VentaService

router = APIRouter(prefix="/ventas", tags=["Ventas"], responses=ERROR_RESPONSES)


@router.get("", response_model=Page[VentaOut])
def listar(
    db: DbSession,
    usuario: CurrentUser,
    params: PageParams = Depends(),
    estado: EstadoVenta | None = Query(None),
    cliente_id: int | None = Query(None, description="Solo ADMIN"),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
):
    """ADMIN ve todas; CLIENTE solo las suyas. Búsqueda por nombre/documento del cliente.
    Orden: id, created_at, total, estado (por defecto, más recientes primero)."""
    return VentaService(db).list(params, usuario, estado, cliente_id, fecha_desde, fecha_hasta)


@router.post("", response_model=VentaOut, status_code=status.HTTP_201_CREATED)
def crear(data: VentaCreate, db: DbSession, usuario: CurrentUser):
    """Crea la venta en PENDIENTE con los precios actuales. Valida stock pero NO lo descuenta todavía."""
    return VentaService(db).create(data, usuario)


@router.get("/{venta_id}", response_model=VentaOut)
def obtener(venta_id: int, db: DbSession, usuario: CurrentUser):
    return VentaService(db).get(venta_id, usuario)


@router.post("/{venta_id}/confirmar", response_model=VentaOut)
def confirmar(venta_id: int, db: DbSession, usuario: CurrentUser):
    """Pago (simulado). En una sola transacción descuenta el stock, registra las SALIDAS y pasa a PAGADA.
    Si no alcanza el stock responde 409 STOCK_INSUFICIENTE y no cambia nada."""
    return VentaService(db).confirmar(venta_id, usuario)


@router.post("/{venta_id}/anular", response_model=VentaOut)
def anular(venta_id: int, data: AnularIn, db: DbSession, admin: AdminUser):
    """Solo ADMIN. Si estaba PAGADA, devuelve el stock con ENTRADAS y anula la factura asociada."""
    return VentaService(db).anular(venta_id, data.motivo, admin)


@router.delete("/{venta_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(venta_id: int, db: DbSession, admin: AdminUser):
    """Solo ADMIN y solo ventas PENDIENTES. Las pagadas o facturadas no se eliminan: se anulan."""
    VentaService(db).eliminar(venta_id, admin)


@router.post("/{venta_id}/factura", response_model=FacturaDetalleOut, status_code=status.HTTP_201_CREATED)
def generar_factura(venta_id: int, db: DbSession, _: AdminUser):
    """Solo ADMIN. Genera la factura (número consecutivo, IVA configurable) de una venta PAGADA."""
    return FacturaService(db).generar(venta_id)
