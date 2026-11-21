from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Cliente
from app.models.enums import TipoDocumento
from app.repositories.base import paginate
from app.schemas.common import PageParams


class ClienteRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, cliente_id: int) -> Cliente | None:
        return self.db.get(Cliente, cliente_id)

    def get_by_documento(self, tipo: TipoDocumento, documento: str) -> Cliente | None:
        return self.db.scalar(select(Cliente).where(Cliente.tipo_documento == tipo, Cliente.documento == documento))

    def get_by_usuario(self, usuario_id: int) -> Cliente | None:
        return self.db.scalar(select(Cliente).where(Cliente.usuario_id == usuario_id))

    def add(self, cliente: Cliente) -> Cliente:
        self.db.add(cliente)
        self.db.flush()
        return cliente

    def list(self, params: PageParams, activo: bool | None):
        stmt = select(Cliente)
        if activo is not None:
            stmt = stmt.where(Cliente.activo == activo)
        return paginate(
            self.db,
            stmt,
            params,
            search_columns=(Cliente.documento, Cliente.nombre, Cliente.email),
            sort_fields={
                "id": Cliente.id,
                "nombre": Cliente.nombre,
                "documento": Cliente.documento,
                "created_at": Cliente.created_at,
            },
            default_sort=[Cliente.nombre.asc()],
        )
