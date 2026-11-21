from fastapi import APIRouter, Depends, Query, status

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.schemas.common import ERROR_RESPONSES, Page, PageParams
from app.schemas.producto import ProductoCreate, ProductoOut, ProductoUpdate
from app.services.producto import ProductoService

router = APIRouter(prefix="/productos", tags=["Productos"], responses=ERROR_RESPONSES)


@router.get("", response_model=Page[ProductoOut])
def listar(
    db: DbSession,
    usuario: CurrentUser,
    params: PageParams = Depends(),
    categoria_id: int | None = Query(None),
    activo: bool | None = Query(None, description="Solo ADMIN. El CLIENTE siempre ve únicamente activos"),
):
    """Catálogo. Búsqueda en sku, nombre y descripción. Orden: id, sku, nombre, precio_venta, created_at."""
    return ProductoService(db).list(params, usuario, categoria_id, activo)


@router.get("/{producto_id}", response_model=ProductoOut)
def obtener(producto_id: int, db: DbSession, usuario: CurrentUser):
    service = ProductoService(db)
    return service.to_out(service.get(producto_id, usuario), usuario)


@router.post("", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
def crear(data: ProductoCreate, db: DbSession, admin: AdminUser):
    service = ProductoService(db)
    return service.to_out(service.create(data, admin), admin)


@router.patch("/{producto_id}", response_model=ProductoOut)
def actualizar(producto_id: int, data: ProductoUpdate, db: DbSession, admin: AdminUser):
    service = ProductoService(db)
    return service.to_out(service.update(producto_id, data), admin)


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar(producto_id: int, db: DbSession, _: AdminUser):
    """Soft delete: el producto queda inactivo y deja de aparecer en el catálogo del cliente."""
    ProductoService(db).deactivate(producto_id)
