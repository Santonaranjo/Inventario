from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import ACCESS, decode_token
from app.models import Usuario
from app.models.enums import RolUsuario

bearer_scheme = HTTPBearer(auto_error=False, description="Pega aquí el access_token (sin la palabra Bearer)")

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Usuario:
    if credentials is None:
        raise UnauthorizedError("No autenticado. Envía el header Authorization: Bearer <access_token>")
    payload = decode_token(credentials.credentials, ACCESS)
    usuario = db.get(Usuario, int(payload["sub"]))
    if usuario is None:
        raise UnauthorizedError("Token inválido", "TOKEN_INVALIDO")
    if not usuario.activo:
        raise ForbiddenError("El usuario está inactivo", "USUARIO_INACTIVO")
    return usuario


def require_roles(*roles: RolUsuario):
    def _dependency(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.rol not in roles:
            raise ForbiddenError("No tienes permisos para realizar esta acción")
        return usuario

    return _dependency


CurrentUser = Annotated[Usuario, Depends(get_current_user)]
AdminUser = Annotated[Usuario, Depends(require_roles(RolUsuario.ADMIN))]
