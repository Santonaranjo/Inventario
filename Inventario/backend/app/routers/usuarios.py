from fastapi import APIRouter, Depends, Query, status

from app.core.deps import AdminUser, DbSession
from app.models.enums import RolUsuario
from app.schemas.common import ERROR_RESPONSES, Page, PageParams
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate
from app.services.usuario import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["Usuarios (ADMIN)"], responses=ERROR_RESPONSES)


@router.get("", response_model=Page[UsuarioOut])
def listar(
    db: DbSession,
    _: AdminUser,
    params: PageParams = Depends(),
    rol: RolUsuario | None = Query(None),
    activo: bool | None = Query(None),
):
    """Orden permitido: id, email, nombre, created_at. Búsqueda en email y nombre."""
    return UsuarioService(db).list(params, rol, activo)


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear(data: UsuarioCreate, db: DbSession, _: AdminUser):
    return UsuarioService(db).create(data)


@router.get("/{usuario_id}", response_model=UsuarioOut)
def obtener(usuario_id: int, db: DbSession, _: AdminUser):
    return UsuarioService(db).get(usuario_id)


@router.patch("/{usuario_id}", response_model=UsuarioOut)
def actualizar(usuario_id: int, data: UsuarioUpdate, db: DbSession, admin: AdminUser):
    return UsuarioService(db).update(usuario_id, data, admin)


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar(usuario_id: int, db: DbSession, admin: AdminUser):
    """No borra: marca el usuario como inactivo y revoca sus sesiones."""
    UsuarioService(db).deactivate(usuario_id, admin)
