from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ConflictError, ForbiddenError, UnauthorizedError, BadRequestError
from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    utcnow,
    verify_password,
)
from app.models import Cliente, RefreshToken, Usuario
from app.models.enums import RolUsuario
from app.repositories.cliente import ClienteRepository
from app.repositories.usuario import RefreshTokenRepository, UsuarioRepository
from app.schemas.auth import LoginIn, MeUpdate, RegisterIn, TokenOut
from app.schemas.usuario import UsuarioOut


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.usuarios = UsuarioRepository(db)
        self.clientes = ClienteRepository(db)
        self.tokens = RefreshTokenRepository(db)

    # ---------- helpers ----------
    def _issue_tokens(self, usuario: Usuario) -> TokenOut:
        refresh, jti, expires = create_refresh_token(usuario.id)
        self.tokens.add(RefreshToken(usuario_id=usuario.id, jti=jti, expires_at=expires))
        return TokenOut(
            access_token=create_access_token(usuario.id, usuario.rol.value),
            refresh_token=refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            usuario=UsuarioOut.model_validate(usuario),
        )

    # ---------- casos de uso ----------
    def register(self, data: RegisterIn) -> TokenOut:
        email = data.email.lower()
        if self.usuarios.get_by_email(email):
            raise ConflictError("Ya existe un usuario con ese email", "EMAIL_DUPLICADO")
        if self.clientes.get_by_documento(data.tipo_documento, data.documento):
            raise ConflictError(
                "Ya existe un cliente con ese documento. Pide al administrador que vincule tu usuario.",
                "DOCUMENTO_DUPLICADO",
            )
        usuario = self.usuarios.add(
            Usuario(email=email, password_hash=hash_password(data.password), nombre=data.nombre, rol=RolUsuario.CLIENTE)
        )
        self.clientes.add(
            Cliente(
                usuario_id=usuario.id,
                tipo_documento=data.tipo_documento,
                documento=data.documento,
                nombre=data.nombre,
                email=email,
                telefono=data.telefono,
                direccion=data.direccion,
            )
        )
        tokens = self._issue_tokens(usuario)
        self.db.commit()
        return tokens

    def login(self, data: LoginIn) -> TokenOut:
        usuario = self.usuarios.get_by_email(data.email)
        if usuario is None or not verify_password(data.password, usuario.password_hash):
            raise UnauthorizedError("Email o contraseña incorrectos", "CREDENCIALES_INVALIDAS")
        if not usuario.activo:
            raise ForbiddenError("El usuario está inactivo", "USUARIO_INACTIVO")
        tokens = self._issue_tokens(usuario)
        self.db.commit()
        return tokens

    def refresh(self, refresh_token: str) -> TokenOut:
        """Rotación: el refresh usado queda revocado y se emite un par nuevo.
        Si llega un refresh ya revocado (posible robo), se revocan todos los del usuario."""
        payload = decode_token(refresh_token, REFRESH)
        stored = self.tokens.get_by_jti_for_update(payload.get("jti", ""))
        if stored is None:
            raise UnauthorizedError("Refresh token inválido", "TOKEN_INVALIDO")
        if stored.revocado:
            self.tokens.revoke_all(stored.usuario_id)
            self.db.commit()
            raise UnauthorizedError("Refresh token revocado. Inicia sesión de nuevo.", "TOKEN_REVOCADO")
        if stored.expires_at <= utcnow():
            raise UnauthorizedError("El refresh token expiró", "TOKEN_EXPIRADO")
        usuario = self.usuarios.get(stored.usuario_id)
        if usuario is None or not usuario.activo:
            raise ForbiddenError("El usuario está inactivo", "USUARIO_INACTIVO")
        stored.revocado = True
        tokens = self._issue_tokens(usuario)
        self.db.commit()
        return tokens

    def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token, REFRESH)
        except UnauthorizedError:
            return  # logout es idempotente: un token inválido/expirado ya no sirve
        stored = self.tokens.get_by_jti_for_update(payload.get("jti", ""))
        if stored and not stored.revocado:
            stored.revocado = True
            self.db.commit()

    def update_me(self, usuario: Usuario, data: MeUpdate) -> Usuario:
        if data.password_nuevo:
            if not verify_password(data.password_actual or "", usuario.password_hash):
                raise BadRequestError("La contraseña actual no es correcta", "PASSWORD_INCORRECTO")
            usuario.password_hash = hash_password(data.password_nuevo)
            self.tokens.revoke_all(usuario.id)
        if data.nombre:
            usuario.nombre = data.nombre
        cliente = usuario.cliente
        if cliente:
            if data.nombre:
                cliente.nombre = data.nombre
            fields = data.model_dump(exclude_unset=True)
            for campo in ("telefono", "direccion"):
                if campo in fields:
                    setattr(cliente, campo, fields[campo])
        self.db.commit()
        self.db.refresh(usuario)
        return usuario
