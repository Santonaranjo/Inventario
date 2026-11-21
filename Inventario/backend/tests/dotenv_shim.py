"""Resuelve la URL de la BD de pruebas sin dependencias extra.

Prioridad: variable de entorno TEST_DATABASE_URL > TEST_DATABASE_URL en backend/.env >
valor por defecto (Postgres local con usuario inventario).
"""
import os
from pathlib import Path

DEFAULT = "postgresql+psycopg://inventario:inventario@localhost:5432/inventario_test"


def load_test_env() -> str:
    if os.getenv("TEST_DATABASE_URL"):
        return os.environ["TEST_DATABASE_URL"]
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("TEST_DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return DEFAULT
