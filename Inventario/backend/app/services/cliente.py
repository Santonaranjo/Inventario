from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.models import Cliente
from app.models.enums import RolUsuario
from app.repositories.cliente import ClienteRepository
from app.repositories.usuario import UsuarioRepository
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate
from app.schemas.common import Page, PageParams


class ClienteService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ClienteRepository(db)
        self.usuarios = UsuarioRepository(db)

    def get(self, cliente_id: int) -> Cliente:
        cliente = self.repo.get(cliente_id)
        if cliente is None:
            raise NotFoundError("Cliente no encontrado")
        return cliente

    def list(self, params: PageParams, activo: bool | None) -> Page[ClienteOut]:
        items, total = self.repo.list(params, activo)
        return Page.build([ClienteOut.model_validate(c) for c in items], total, params.page, params.size)

    def _validar_usuario(self, usuario_id: int, cliente_id: int | None = None) -> None:
        usuario = self.usuarios.get(usuario_id)
        if usuario is None:
            raise NotFoundError("Usuario a vincular no encontrado")
        if usuario.rol != RolUsuario.CLIENTE:
            raise BadRequestError("Solo se pueden vincular usuarios con rol CLIENTE", "USUARIO_NO_CLIENTE")
        vinculado = self.repo.get_by_usuario(usuario_id)
        if vinculado and vinculado.id != cliente_id:
            raise ConflictError("Ese usuario ya está vinculado a otro cliente", "USUARIO_YA_VINCULADO")

    def _validar_documento(self, tipo, documento, cliente_id: int | None = None) -> None:
        existente = self.repo.get_by_documento(tipo, documento)
        if existente and existente.id != cliente_id:
            raise ConflictError("Ya existe un cliente con ese documento", "DOCUMENTO_DUPLICADO")

    def create(self, data: ClienteCreate) -> Cliente:
        self._validar_documento(data.tipo_documento, data.documento)
        if data.usuario_id is not None:
            self._validar_usuario(data.usuario_id)
        cliente = self.repo.add(Cliente(**data.model_dump()))
        self.db.commit()
        return cliente

    def update(self, cliente_id: int, data: ClienteUpdate) -> Cliente:
        cliente = self.get(cliente_id)
        fields = data.model_dump(exclude_unset=True)
        for obligatorio in ("tipo_documento", "documento", "nombre", "activo"):
            if obligatorio in fields and fields[obligatorio] is None:
                fields.pop(obligatorio)
        if "tipo_documento" in fields or "documento" in fields:
            self._validar_documento(
                fields.get("tipo_documento", cliente.tipo_documento), fields.get("documento", cliente.documento), cliente.id
            )
        if fields.get("usuario_id") is not None:
            self._validar_usuario(fields["usuario_id"], cliente.id)
        for campo, valor in fields.items():
            setattr(cliente, campo, valor)
        self.db.commit()
        self.db.refresh(cliente)
        return cliente

    def deactivate(self, cliente_id: int) -> None:
        cliente = self.get(cliente_id)
        cliente.activo = False
        self.db.commit()
