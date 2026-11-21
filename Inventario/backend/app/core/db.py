from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Una sesión por request. Los services hacen commit; si algo falla
    antes del commit, close() descarta la transacción (rollback)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
