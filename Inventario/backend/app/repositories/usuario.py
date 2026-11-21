from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import RefreshToken, Usuario
from app.models.enums import RolUsuario
from app.repositories.base import paginate
from app.schemas.common import PageParams


class UsuarioRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, usuario_id: int) -> Usuario | None:
        return self.db.get(Usuario, usuario_id)

    def get_by_email(self, email: str) -> Usuario | None:
        return self.db.scalar(select(Usuario).where(Usuario.email == email.lower()))

    def add(self, usuario: Usuario) -> Usuario:
        self.db.add(usuario)
        self.db.flush()
        return usuario

    def list(self, params: PageParams, rol: RolUsuario | None, activo: bool | None):
        stmt = select(Usuario)
        if rol:
            stmt = stmt.where(Usuario.rol == rol)
        if activo is not None:
            stmt = stmt.where(Usuario.activo == activo)
        return paginate(
            self.db,
            stmt,
            params,
            search_columns=(Usuario.email, Usuario.nombre),
            sort_fields={"id": Usuario.id, "email": Usuario.email, "nombre": Usuario.nombre, "created_at": Usuario.created_at},
            default_sort=[Usuario.id.asc()],
        )


class RefreshTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, token: RefreshToken) -> None:
        self.db.add(token)

    def get_by_jti_for_update(self, jti: str) -> RefreshToken | None:
        return self.db.scalar(select(RefreshToken).where(RefreshToken.jti == jti).with_for_update())

    def revoke_all(self, usuario_id: int) -> None:
        self.db.execute(
            update(RefreshToken).where(RefreshToken.usuario_id == usuario_id, RefreshToken.revocado.is_(False)).values(revocado=True)
        )
