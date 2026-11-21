from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db

router = APIRouter(tags=["Health"])


class HealthOut(BaseModel):
    status: str = Field(examples=["ok"])
    database: str = Field(examples=["ok"])
    app: str = Field(examples=["Inventario API"])


@router.get("/health", response_model=HealthOut, responses={503: {"model": HealthOut}})
def health(db: Session = Depends(get_db)):
    """Verifica que la API responde y que hay conexión a la base de datos."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"
    body = {"status": "ok" if db_status == "ok" else "degraded", "database": db_status, "app": settings.APP_NAME}
    return JSONResponse(status_code=200 if db_status == "ok" else 503, content=body)
