# Inventario

Aplicativo de inventario para **Programación Web II** (Ingeniería Informática, Universidad de Caldas, 5.º semestre).

Gestiona productos, stock y movimientos de inventario, clientes, ventas y facturación, con dos roles:
- **ADMIN:** administra todo (productos, inventario, clientes, ventas, facturas y usuarios).
- **CLIENTE:** ve el catálogo, compra y consulta sus ventas y facturas.

## Equipo

| Área | Responsable | Estado |
|---|---|---|
| Backend (FastAPI) | Santiago Naranjo | ✅ Primera versión lista |
| Frontend (Next.js) | Juliana | ⏳ Por iniciar |
| Base de datos (PostgreSQL) | Equipo de BD | ⏳ Revisando la propuesta de esquema |

## Estructura

```
Inventario/
  backend/    API REST en Python: FastAPI, SQLAlchemy, Alembic, PostgreSQL 16
  frontend/   Next.js (Juliana)
  docs/
    HANDOFF_FRONTEND.md   guía para consumir la API
    HANDOFF_DB.md         modelo ER, diccionario de datos y puntos abiertos
    DIAGRAMA_ER.md        diagrama entidad-relación (Mermaid)
    PENDIENTES.md         decisiones tomadas y próximos pasos
```

## Inicio rápido (Windows, Docker Desktop)

```powershell
cd "C:\Users\Santiago\Documents\Ucaldas\5to Semestre\Programacion web ll\Inventario\backend"
Copy-Item .env.example .env
docker compose up -d --build
docker compose exec api python -m app.seed
```

- API: http://localhost:8000/api/v1
- Documentación: http://localhost:8000/docs
- Admin de prueba: `admin@inventario.com` / `Admin123*`

Instrucciones sin Docker, migraciones y pruebas: [`backend/README.md`](backend/README.md).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| ORM / migraciones | SQLAlchemy 2, Alembic |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT (access + refresh), bcrypt |
| Pruebas | pytest, httpx (TestClient) |
| Entorno | Docker, docker-compose |
| Frontend | Next.js |

## Flujo de Git

- Rama principal: `main`. Para cambios grandes, usar ramas `feature/<nombre>` y Pull Request.
- Commits en el formato `tipo(área): descripción`, por ejemplo `feat(ventas): …` o `fix(auth): …`.
- Nunca subir `.env` (ya está en `.gitignore`).
