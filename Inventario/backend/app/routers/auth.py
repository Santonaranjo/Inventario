from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.auth import LoginIn, MeOut, MeUpdate, RefreshIn, RegisterIn, TokenOut
from app.schemas.common import ERROR_RESPONSES
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"], responses=ERROR_RESPONSES)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: DbSession):
    """Registro público. Crea un usuario con rol CLIENTE y su ficha de cliente, y devuelve tokens."""
    return AuthService(db).register(data)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: DbSession):
    return AuthService(db).login(data)


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: DbSession):
    """Intercambia un refresh_token válido por un par nuevo. El refresh usado deja de servir."""
    return AuthService(db).refresh(data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: RefreshIn, db: DbSession):
    """Revoca el refresh_token. El frontend debe borrar ambos tokens."""
    AuthService(db).logout(data.refresh_token)


@router.get("/me", response_model=MeOut)
def me(usuario: CurrentUser):
    return usuario


@router.patch("/me", response_model=MeOut)
def update_me(data: MeUpdate, usuario: CurrentUser, db: DbSession):
    """Actualiza nombre, teléfono, dirección o contraseña del usuario autenticado."""
    return AuthService(db).update_me(usuario, data)
