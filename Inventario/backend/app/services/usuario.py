from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models import Usuario
from app.models.enums import RolUsuario
from app.repositories.usuario import RefreshTokenRepository, UsuarioRepository
from app.schemas.common import Page, PageParams
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate


class UsuarioService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UsuarioRepository(db)
        self.tokens = RefreshTokenRepository(db)

    def get(self, usuario_id: int) -> Usuario:
        usuario = self.repo.get(usuario_id)
        if usuario is None:
            raise NotFoundError("Usuario no encontrado")
        return usuario

    def list(self, params: PageParams, rol: RolUsuario | None, activo: bool | None) -> Page[UsuarioOut]:
        items, total = self.repo.list(params, rol, activo)
        return Page.build([UsuarioOut.model_validate(u) for u in items], total, params.page, params.size)

    def create(self, data: UsuarioCreate) -> Usuario:
        email = data.email.lower()
        if self.repo.get_by_email(email):
            raise ConflictError("Ya existe un usuario con ese email", "EMAIL_DUPLICADO")
        usuario = self.repo.add(
            Usuario(email=email, password_hash=hash_password(data.password), nombre=data.nombre, rol=data.rol)
        )
        self.db.commit()
        return usuario

    def update(self, usuario_id: int, data: UsuarioUpdate, actor: Usuario) -> Usuario:
        usuario = self.get(usuario_id)
        fields = data.model_dump(exclude_unset=True, exclude_none=True)
        if usuario.id == actor.id and (fields.get("activo") is False or fields.get("rol") == RolUsuario.CLIENTE):
            raise ConflictError("No puedes desactivarte ni quitarte el rol ADMIN a ti mismo", "OPERACION_NO_PERMITIDA")
        if "password" in fields:
            usuario.password_hash = hash_password(fields.pop("password"))
            self.tokens.revoke_all(usuario.id)
        for campo, valor in fields.items():
            setattr(usuario, campo, valor)
        if fields.get("activo") is False:
            self.tokens.revoke_all(usuario.id)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def deactivate(self, usuario_id: int, actor: Usuario) -> None:
        self.update(usuario_id, UsuarioUpdate(activo=False), actor)
