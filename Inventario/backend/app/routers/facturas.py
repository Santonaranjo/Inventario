from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser, DbSession
from app.schemas.common import ERROR_RESPONSES, Page, PageParams
from app.schemas.factura import FacturaDetalleOut, FacturaOut
from app.services.factura import FacturaService

router = APIRouter(prefix="/facturas", tags=["Facturas"], responses=ERROR_RESPONSES)


@router.get("", response_model=Page[FacturaOut])
def listar(
    db: DbSession,
    usuario: CurrentUser,
    params: PageParams = Depends(),
    cliente_id: int | None = Query(None, description="Solo ADMIN"),
    anulada: bool | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
):
    """ADMIN ve todas; CLIENTE solo las suyas. Búsqueda por número o cliente.
    Orden: id, numero, fecha_emision, total (por defecto, número descendente).
    Para generar una factura: POST /ventas/{venta_id}/factura."""
    return FacturaService(db).list(params, usuario, cliente_id, anulada, fecha_desde, fecha_hasta)


@router.get("/{factura_id}", response_model=FacturaDetalleOut)
def obtener(factura_id: int, db: DbSession, usuario: CurrentUser):
    """Factura con su detalle de productos (lista para imprimir)."""
    return FacturaService(db).get(factura_id, usuario)
