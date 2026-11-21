# Backend: Inventario API

FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL 16. Autenticación JWT (access + refresh) y contraseñas con bcrypt.

- API: http://localhost:8000/api/v1
- Swagger: http://localhost:8000/docs · ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/health

Todos los comandos son para **PowerShell en Windows**. La ruta tiene espacios: úsala siempre **entre comillas**.

```powershell
cd "C:\Users\Santiago\Documents\Ucaldas\5to Semestre\Programacion web ll\Inventario\backend"
```

---

## Opción A: con Docker Desktop (recomendada)

Requisito: Docker Desktop abierto.

```powershell
Copy-Item .env.example .env              # solo la primera vez
docker compose up -d --build             # levanta Postgres 16 y la API (aplica migraciones al arrancar)
docker compose exec api python -m app.seed   # admin + datos de prueba
```

Abre http://localhost:8000/docs.

| Tarea | Comando |
|---|---|
| Ver logs | `docker compose logs -f api` |
| Correr pruebas | `docker compose exec api pytest` |
| Aplicar migraciones | `docker compose exec api alembic upgrade head` |
| Consola SQL | `docker compose exec db psql -U inventario -d inventario` |
| Reconstruir tras cambiar código | `docker compose up -d --build` |
| Apagar | `docker compose down` |
| Apagar y **borrar la BD** | `docker compose down -v` |

> La base `inventario_test` la crea `docker/init-test-db.sql` **solo la primera vez** que se crea el volumen.
> Si ya tenías el volumen de antes: `docker compose exec db psql -U inventario -c "CREATE DATABASE inventario_test;"`

> **El puerto 5432 está ocupado** (por ejemplo, porque ya tienes PostgreSQL instalado en Windows): en
> `docker-compose.yml` cambia `"5432:5432"` por `"5433:5432"` y, si usas la opción C, pon el puerto 5433
> en `DATABASE_URL`.

## Opción B: sin Docker (Python y PostgreSQL instalados en Windows)

Requisitos: **Python 3.12** y **PostgreSQL 16** (con `psql` en el PATH).

```powershell
# 1. Entorno virtual
python -m venv .venv
.venv\Scripts\Activate.ps1
#    Si PowerShell bloquea el script:
#    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# 2. Dependencias y configuración
pip install -r requirements.txt
Copy-Item .env.example .env

# 3. Usuario y bases de datos (te pedirá la contraseña del usuario postgres)
psql -U postgres -c "CREATE USER inventario WITH PASSWORD 'inventario';"
psql -U postgres -c "CREATE DATABASE inventario OWNER inventario;"
psql -U postgres -c "CREATE DATABASE inventario_test OWNER inventario;"

# 4. Migraciones, datos de prueba y arranque
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

## Opción C: Postgres en Docker y la API en tu venv (cómodo para desarrollar)

```powershell
docker compose up -d db
.venv\Scripts\Activate.ps1
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```
Con el `.env` por defecto (`localhost:5432`, usuario `inventario`) no hay que cambiar nada.

---

## Migraciones (Alembic)

La **fuente de verdad del esquema son las migraciones** de `alembic/versions/`.

```powershell
alembic upgrade head                                   # aplica todo
alembic current                                        # versión actual
alembic downgrade -1                                   # revierte la última
alembic revision --autogenerate -m "agrega X a Y"      # después de cambiar app/models/
alembic check                                          # verifica que modelos y migraciones coinciden
```
Revisa siempre el archivo que genera `--autogenerate` antes de aplicarlo. Detalles en
[`docs/HANDOFF_DB.md`](../docs/HANDOFF_DB.md).

## Seed

```powershell
python -m app.seed               # admin + 3 categorías, 8 productos (3 en alerta), 2 clientes, 3 ventas, 1 factura
python -m app.seed --solo-admin  # solo el administrador
```
Es idempotente: si ya hay productos, no duplica nada.

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@inventario.com` (`ADMIN_EMAIL`) | `Admin123*` (`ADMIN_PASSWORD`) |
| CLIENTE | `cliente@inventario.com` | `Cliente123*` |

## Pruebas

```powershell
pytest             # todas
pytest -v          # con nombres
pytest tests/test_ventas.py -k anular
```
Usan una **PostgreSQL real** (`TEST_DATABASE_URL`, por defecto `inventario_test`). Al empezar aplican las
migraciones desde cero y antes de cada prueba vacían las tablas. **Nunca apuntes `TEST_DATABASE_URL` a la BD principal.**

Cubren: auth (registro, login, refresh con rotación, logout, perfil), permisos por rol, CRUD con soft delete,
paginación, filtros y orden, movimientos y alertas de inventario, venta con descuento de stock, stock
insuficiente (al crear y al confirmar, sin cambios parciales), **confirmaciones concurrentes sin sobreventa**,
anulación con reversión de stock, facturación (consecutivo, IVA, duplicados) y el seed.

## Variables de entorno (`.env`)

| Variable | Default | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://inventario:inventario@localhost:5432/inventario` | BD principal |
| `TEST_DATABASE_URL` | `…/inventario_test` | BD de pruebas (se borra) |
| `JWT_SECRET_KEY` | — | **Cámbiala.** `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | |
| `BCRYPT_ROUNDS` | `12` | Costo de bcrypt (las pruebas usan 4) |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Orígenes del frontend, separados por coma |
| `IVA_PORCENTAJE` | `19.00` | IVA aplicado al generar facturas |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NOMBRE` | | Admin que crea el seed |

## Arquitectura

```
app/
  core/          config (Settings), db (engine/sesión), security (JWT, bcrypt), errors, deps (usuario actual, roles)
  models/        SQLAlchemy: tablas, relaciones y constraints
  schemas/       Pydantic v2: entrada y salida de la API (con ejemplos para /docs)
  repositories/  acceso a datos: consultas, paginación, bloqueos FOR UPDATE
  services/      reglas de negocio y transacciones (aquí se hace commit)
  routers/       endpoints HTTP: validan permisos y delegan en services
  main.py        app FastAPI, CORS, handlers de error
  seed.py        datos iniciales
alembic/         migraciones (fuente de verdad del esquema)
tests/           pytest + TestClient contra PostgreSQL real
```

Flujo de un request: `router → service → repository → model`. Los services son los únicos que hacen
`commit`. Si se lanza un error antes, la sesión se cierra sin commit y no se guarda nada.

Decisiones de diseño:
- **Venta en dos pasos:** `POST /ventas` crea la venta PENDIENTE (valida stock, no lo descuenta) y
  `POST /ventas/{id}/confirmar` la paga y descuenta el stock en una sola transacción, con las filas de
  inventario bloqueadas (`SELECT … FOR UPDATE`, en orden de `producto_id`).
- **Montos** con `Decimal` y `NUMERIC(12,2)`. En JSON viajan como string (`"8500.00"`).
- **Soft delete** en productos, clientes, categorías y usuarios (`activo = false`).
- **Errores** con formato uniforme `{detail, code}` (ver `app/core/errors.py`).
- **Refresh tokens** guardados en BD (por `jti`) para rotarlos y revocarlos al cerrar sesión.

Pendientes y mejoras: [`docs/PENDIENTES.md`](../docs/PENDIENTES.md).
