from datetime import datetime

from fastapi import APIRouter, Depends, Query, status

from app.core.deps import AdminUser, DbSession
from app.models.enums import TipoMovimiento
from app.schemas.common import ERROR_RESPONSES, Page, PageParams
from app.schemas.inventario import InventarioOut, MovimientoCreate, MovimientoOut, StockMinimoUpdate
from app.services.inventario import InventarioService

router = APIRouter(prefix="/inventario", tags=["Inventario (ADMIN)"], responses=ERROR_RESPONSES)


@router.get("", response_model=Page[InventarioOut])
def listar(
    db: DbSession,
    _: AdminUser,
    params: PageParams = Depends(),
    activo: bool | None = Query(None, description="Filtra por estado del producto"),
):
    """Stock de todos los productos. Búsqueda en sku y nombre. Orden: stock, stock_minimo, sku, nombre, updated_at."""
    return InventarioService(db).list(params, activo)


@router.get("/alertas", response_model=Page[InventarioOut])
def alertas(db: DbSession, _: AdminUser, params: PageParams = Depends()):
    """Productos activos con stock <= stock mínimo. Por defecto, los más críticos primero."""
    return InventarioService(db).alertas(params)


@router.get("/movimientos", response_model=Page[MovimientoOut])
def listar_movimientos(
    db: DbSession,
    _: AdminUser,
    params: PageParams = Depends(),
    producto_id: int | None = Query(None),
    tipo: TipoMovimiento | None = Query(None),
    venta_id: int | None = Query(None),
    fecha_desde: datetime | None = Query(None, examples=["2026-11-01T00:00:00-05:00"]),
    fecha_hasta: datetime | None = Query(None),
):
    """Historial (más recientes primero). Búsqueda en sku, nombre y motivo. Orden: id, fecha, cantidad."""
    return InventarioService(db).list_movimientos(params, producto_id, tipo, venta_id, fecha_desde, fecha_hasta)


@router.post("/movimientos", response_model=MovimientoOut, status_code=status.HTTP_201_CREATED)
def crear_movimiento(data: MovimientoCreate, db: DbSession, admin: AdminUser):
    """ENTRADA (compra), SALIDA (merma/daño) o AJUSTE (conteo físico). Las ventas generan sus SALIDAS solas."""
    return InventarioService(db).movimiento_manual(data, admin)


@router.get("/{producto_id}", response_model=InventarioOut)
def obtener(producto_id: int, db: DbSession, _: AdminUser):
    return InventarioService(db).get(producto_id)


@router.patch("/{producto_id}", response_model=InventarioOut)
def actualizar_stock_minimo(producto_id: int, data: StockMinimoUpdate, db: DbSession, _: AdminUser):
    """Cambia el stock mínimo. El stock solo cambia mediante movimientos."""
    return InventarioService(db).actualizar_stock_minimo(producto_id, data.stock_minimo)
