from fastapi import APIRouter, Depends, Query, status

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.schemas.common import ERROR_RESPONSES, Page, PageParams
from app.schemas.producto import CategoriaCreate, CategoriaOut, CategoriaUpdate
from app.services.producto import CategoriaService

router = APIRouter(prefix="/categorias", tags=["Categorías"], responses=ERROR_RESPONSES)


@router.get("", response_model=Page[CategoriaOut])
def listar(db: DbSession, usuario: CurrentUser, params: PageParams = Depends(), activo: bool | None = Query(None)):
    """Cualquier usuario autenticado. El CLIENTE solo ve categorías activas."""
    return CategoriaService(db).list(params, usuario, activo)


@router.get("/{categoria_id}", response_model=CategoriaOut)
def obtener(categoria_id: int, db: DbSession, usuario: CurrentUser):
    return CategoriaService(db).get(categoria_id, usuario)


@router.post("", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
def crear(data: CategoriaCreate, db: DbSession, _: AdminUser):
    return CategoriaService(db).create(data)


@router.patch("/{categoria_id}", response_model=CategoriaOut)
def actualizar(categoria_id: int, data: CategoriaUpdate, db: DbSession, _: AdminUser):
    return CategoriaService(db).update(categoria_id, data)


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar(categoria_id: int, db: DbSession, _: AdminUser):
    """Soft delete: marca la categoría como inactiva."""
    CategoriaService(db).deactivate(categoria_id)
