from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.routers import api_router
from app.routers.health import router as health_router

DESCRIPTION = """
API del **aplicativo de inventario** (Programación Web II – Universidad de Caldas).

* Autenticación JWT: `POST /api/v1/auth/login` devuelve `access_token` y `refresh_token`.
  Usa el botón **Authorize** y pega el `access_token`.
* Errores con formato uniforme: `{ "detail": "...", "code": "..." }`.
* Listados paginados: `?page=1&size=20&search=texto&sort=-created_at`.
* Los montos viajan como **string decimal** (ej. `"12500.00"`) para no perder precisión.
"""

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health_router)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
