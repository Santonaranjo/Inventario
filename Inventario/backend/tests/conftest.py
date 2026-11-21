"""Configuración de pruebas.

Usa una base PostgreSQL real (TEST_DATABASE_URL). Al inicio de la sesión aplica las
migraciones de Alembic desde cero y antes de cada prueba vacía las tablas.
"""
import os
from pathlib import Path

from tests.dotenv_shim import load_test_env

# Debe ir ANTES de importar la app: la app crea el engine con DATABASE_URL.
os.environ["DATABASE_URL"] = load_test_env()
os.environ["BCRYPT_ROUNDS"] = "4"  # hashing rápido solo en pruebas

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.db import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session", autouse=True)
def _schema():
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.attributes["configure_logger"] = False
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def _clean_tables():
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        if tables:
            conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
        conn.execute(
            text(
                "DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'factura_consecutivo_seq') "
                "THEN ALTER SEQUENCE factura_consecutivo_seq RESTART WITH 1; END IF; END $$;"
            )
        )
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


# ---------------------------------------------------------------- helpers de auth
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123*"
CLIENTE_PASSWORD = "Cliente123*"


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def login(client, email: str, password: str) -> dict:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()


def registrar_cliente(client, email: str, documento: str, nombre: str = "Cliente Prueba") -> dict:
    res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": CLIENTE_PASSWORD, "nombre": nombre, "documento": documento},
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest.fixture
def admin_user(db):
    from app.core.security import hash_password
    from app.models import Usuario
    from app.models.enums import RolUsuario

    user = Usuario(email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD), nombre="Admin", rol=RolUsuario.ADMIN)
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def admin_headers(client, admin_user) -> dict:
    return auth_header(login(client, ADMIN_EMAIL, ADMIN_PASSWORD)["access_token"])


@pytest.fixture
def cliente_headers(client) -> dict:
    return auth_header(registrar_cliente(client, "cliente1@correo.com", "1001", "Cliente Uno")["access_token"])


@pytest.fixture
def otro_cliente_headers(client) -> dict:
    return auth_header(registrar_cliente(client, "cliente2@correo.com", "1002", "Cliente Dos")["access_token"])
