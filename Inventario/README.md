# Inventario

Aplicativo de inventario para **Programación Web II** (Ingeniería Informática, Universidad de Caldas, 5.º semestre).

Gestiona productos, stock y movimientos de inventario, clientes, ventas y facturación, con dos roles:
- **ADMIN:** administra todo (productos, inventario, clientes, ventas, facturas y usuarios).
- **CLIENTE:** ve el catálogo, compra y consulta sus ventas y facturas.

## Equipo

| Área | Responsable | Estado |
|---|---|---|
| Backend (FastAPI) | Santiago Naranjo | ✅ Primera versión lista |
| Frontend (Next.js) | Juliana | ✅ Primera versión lista (rama `feature/frontend`) |
| Base de datos (PostgreSQL) | Equipo de BD | ✅ Esquema adaptado al backend en PostgreSQL 17 |

El detalle de todo lo que se hizo en frontend, base de datos y backend está en [`CAMBIOS.md`](CAMBIOS.md).

## Usuarios de prueba

Son credenciales **solo para desarrollo**. Dependen de la base de datos que use la API:

**Base `inventario` en PostgreSQL 17** (puerto 5434; la que usa la API en este equipo, cargada con
[`database/inventario_backend.sql`](database/inventario_backend.sql)):

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@inventario.com` | `Admin123*` |
| CLIENTE | `carlos.ramirez@correo.com` | `Cliente123*` |

**Base de Docker con el seed del backend** (`docker compose exec api python -m app.seed`):

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@inventario.com` | `Admin123*` |
| CLIENTE | `cliente@inventario.com` | `Cliente123*` |

También se puede crear una cuenta de cliente nueva desde la pantalla **Registrarse** del frontend.

## Estructura

```
Inventario/
  backend/    API REST en Python: FastAPI, SQLAlchemy, Alembic, PostgreSQL 16
  frontend/   Next.js 16 + TypeScript (Juliana) — ver frontend/README.md
  database/
    inventario_backend.sql  base completa (esquema del backend + datos de prueba + vistas)
  CAMBIOS.md  registro de cambios de frontend, base de datos y backend
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
- Usuarios: ver [Usuarios de prueba](#usuarios-de-prueba).

Instrucciones sin Docker, migraciones y pruebas: [`backend/README.md`](backend/README.md).

> **En este equipo** el puerto 5432 está ocupado y la API usa PostgreSQL 17 (puerto 5434) mediante un
> `backend/docker-compose.override.yml` local; la imagen ya está construida, así que se levanta con
> `docker compose up -d --no-build`. Detalle en [`CAMBIOS.md`](CAMBIOS.md#3-backend-backend).

Frontend:
```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```
Abrir http://localhost:3000. Instalación, variables y pruebas: [`frontend/README.md`](frontend/README.md).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| ORM / migraciones | SQLAlchemy 2, Alembic |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT (access + refresh), bcrypt |
| Pruebas | pytest, httpx (TestClient) |
| Entorno | Docker, docker-compose |
| Frontend | Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, React Hook Form + Zod |
| Pruebas frontend | Vitest, Testing Library, MSW, Playwright |

## Flujo de Git

- Rama principal: `main`. Para cambios grandes, usar ramas `feature/<nombre>` y Pull Request.
- Commits en el formato `tipo(área): descripción`, por ejemplo `feat(ventas): …` o `fix(auth): …`.
- Nunca subir `.env` ni `.env.local`. El frontend los ignora en `frontend/.gitignore`; **el backend aún no
  tiene `.gitignore`**, así que hay que tener cuidado de no agregar `backend/.env` ni
  `backend/docker-compose.override.yml`.
