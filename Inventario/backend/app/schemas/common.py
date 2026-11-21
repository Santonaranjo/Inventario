from math import ceil
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ErrorOut(BaseModel):
    detail: str = Field(examples=["Stock insuficiente para: CAM-001 (disponible: 2, solicitado: 5)"])
    code: str = Field(examples=["STOCK_INSUFICIENTE"])


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int = Field(description="Total de registros que cumplen el filtro", examples=[42])
    page: int = Field(examples=[1])
    size: int = Field(examples=[20])
    pages: int = Field(description="Total de páginas", examples=[3])

    @classmethod
    def build(cls, items: list, total: int, page: int, size: int) -> "Page[T]":
        return cls(items=items, total=total, page=page, size=size, pages=ceil(total / size) if total else 0)


class PageParams:
    """Parámetros comunes de listados: ?page=1&size=20&search=texto&sort=-created_at,nombre"""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Número de página (desde 1)"),
        size: int = Query(20, ge=1, le=100, description="Registros por página (máx. 100)"),
        search: str | None = Query(None, max_length=100, description="Texto a buscar (no distingue mayúsculas)"),
        sort: str | None = Query(
            None,
            description="Campos separados por coma; prefijo '-' para descendente. Ej: -created_at,nombre",
        ),
    ):
        self.page = page
        self.size = size
        self.search = search.strip() if search and search.strip() else None
        self.sort = sort


ERROR_RESPONSES = {
    400: {"model": ErrorOut, "description": "Solicitud inválida"},
    401: {"model": ErrorOut, "description": "No autenticado o token inválido/expirado"},
    403: {"model": ErrorOut, "description": "Sin permisos para la acción"},
    404: {"model": ErrorOut, "description": "Recurso no encontrado"},
    409: {"model": ErrorOut, "description": "Conflicto con el estado actual (duplicado, stock, estado)"},
}
