from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.core.errors import BadRequestError
from app.schemas.common import PageParams


def parse_sort(sort: str | None, allowed: dict[str, ColumnElement]) -> list:
    """Convierte '-created_at,nombre' en cláusulas ORDER BY validando contra una lista blanca."""
    if not sort:
        return []
    clauses = []
    for raw in sort.split(","):
        field = raw.strip()
        if not field:
            continue
        desc = field.startswith("-")
        name = field.lstrip("-+")
        if name not in allowed:
            raise BadRequestError(
                f"No se puede ordenar por '{name}'. Campos permitidos: {', '.join(sorted(allowed))}",
                "INVALID_SORT",
            )
        col = allowed[name]
        clauses.append(col.desc() if desc else col.asc())
    return clauses


def paginate(
    db: Session,
    stmt: Select,
    params: PageParams,
    *,
    search_columns: tuple = (),
    sort_fields: dict[str, ColumnElement],
    default_sort: list,
) -> tuple[list, int]:
    if params.search and search_columns:
        term = f"%{params.search}%"
        stmt = stmt.where(or_(*(c.ilike(term) for c in search_columns)))

    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    order = parse_sort(params.sort, sort_fields) or default_sort
    items = db.scalars(stmt.order_by(*order).offset((params.page - 1) * params.size).limit(params.size)).all()
    return list(items), total
