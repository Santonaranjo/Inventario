from fastapi import APIRouter, Depends, Query, status

from app.core.deps import AdminUser, DbSession
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate
from app.schemas.common import ERROR_RESPONSES, Page, PageParams
from app.services.cliente import ClienteService

router = APIRouter(prefix="/clientes", tags=["Clientes (ADMIN)"], responses=ERROR_RESPONSES)


@router.get("", response_model=Page[ClienteOut])
def listar(db: DbSession, _: AdminUser, params: PageParams = Depends(), activo: bool | None = Query(None)):
    """Búsqueda en documento, nombre y email. Orden: id, nombre, documento, created_at."""
    return ClienteService(db).list(params, activo)


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def crear(data: ClienteCreate, db: DbSession, _: AdminUser):
    return ClienteService(db).create(data)


@router.get("/{cliente_id}", response_model=ClienteOut)
def obtener(cliente_id: int, db: DbSession, _: AdminUser):
    return ClienteService(db).get(cliente_id)


@router.patch("/{cliente_id}", response_model=ClienteOut)
def actualizar(cliente_id: int, data: ClienteUpdate, db: DbSession, _: AdminUser):
    return ClienteService(db).update(cliente_id, data)


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar(cliente_id: int, db: DbSession, _: AdminUser):
    """Soft delete: marca el cliente como inactivo."""
    ClienteService(db).deactivate(cliente_id)
