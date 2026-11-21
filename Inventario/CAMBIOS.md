# Registro de cambios (frontend, base de datos y backend)

Este documento resume todo lo que se hizo en la rama `feature/frontend`: el frontend completo, la base de
datos en PostgreSQL 17 adaptada al backend y la configuración local con la que se probó. Los usuarios y
contraseñas de prueba están en el [README](README.md#usuarios-de-prueba).

---

## 1. Frontend (`frontend/`)

Proyecto nuevo en **Next.js 16** (App Router) + TypeScript estricto + Tailwind CSS 4 + shadcn/ui (Base UI) +
TanStack Query + React Hook Form + Zod. Detalle técnico en [`frontend/README.md`](frontend/README.md) y
decisiones en [`frontend/PENDIENTES.md`](frontend/PENDIENTES.md).

### Commits (en orden)

| Commit | Qué incluye |
|---|---|
| `9468723` feat(front): setup Next.js, cliente HTTP con refresh single-flight y auth | Proyecto base, tipos generados del OpenAPI, cliente HTTP único, sesión, login y registro |
| `1eb010b` feat(front): layouts por rol, protección de rutas y perfil | Menú por rol, protección de rutas, perfil y cambio de contraseña, página 404 |
| `3c4d1bc` feat(front): catálogo, carrito y compras del cliente | Catálogo, detalle de producto, carrito, pago, mis compras y mis facturas |
| `9de8169` feat(front): productos, categorías, inventario y dashboard (admin) | CRUD de productos y categorías, inventario, kardex, alertas y dashboard |
| `d2f57ee` feat(front): ventas y facturas (admin) | Ventas (lista, venta de mostrador, detalle con confirmar/facturar/anular) y facturas imprimibles |
| `63097de` feat(front): clientes y usuarios (admin) y build de producción | CRUD de clientes y usuarios; ajuste para que `next build` funcione |
| `a9153a5` feat(front): pruebas, README y PENDIENTES | Pruebas Vitest + MSW, e2e Playwright y documentación |
| `d4d8fea` fix(front): desactivar la validación de instant navigation en rutas privadas | Quita un error de desarrollo de Next 16 en cada página |
| `c36c358` fix(front): ajustes tras probar contra la API real en Docker | Errores marcados en su campo, logout sin `?next=`, accesibilidad del carrito |
| `57443eb` test(front): credenciales del e2e configurables por variables de entorno | Permite correr el e2e contra cualquier base |

### Funcionalidad

**Común:** login, registro de cliente, perfil (datos y cambio de contraseña) y logout. Después del login,
ADMIN va a `/admin` y CLIENTE a `/tienda`. Cada zona está protegida por rol.

**ADMIN (`/admin`):**
- Dashboard: productos en alerta, ventas pendientes y ventas recientes.
- Productos: lista con búsqueda, filtros (categoría, estado) y orden; crear, editar, desactivar y reactivar.
- Categorías: crear, editar, desactivar y reactivar.
- Inventario: stock por producto, editar stock mínimo, registrar ENTRADA / SALIDA / AJUSTE y kardex con filtros.
- Alertas de stock.
- Ventas: lista con filtros (estado, fechas, cliente), venta de mostrador y detalle con confirmar pago,
  generar factura, anular (con motivo) y eliminar pendientes.
- Facturas: lista y detalle imprimible (subtotal, IVA y total).
- Clientes y usuarios: CRUD con desactivar/reactivar.

**CLIENTE (`/tienda`):**
- Catálogo con búsqueda, categorías y orden; detalle de producto.
- Carrito guardado en el navegador. Al pagar se llama `POST /ventas` y luego `POST /ventas/{id}/confirmar`.
  Si no hay stock suficiente se muestra el mensaje del backend y la venta queda PENDIENTE.
- Mis compras (con opción de confirmar una pendiente) y mis facturas.

### Cómo se comunica con la API

- **Un solo cliente HTTP** (`src/lib/api/client.ts`); ningún componente llama a `fetch` directamente.
- **JWT:** envía `Authorization: Bearer <access_token>`. Si la API responde `TOKEN_EXPIRADO`, renueva los
  tokens **una sola vez** aunque fallen varios requests a la vez (*single flight*) y reintenta.
- **Errores** `{detail, code}`: se muestra `detail`; los 422 y los códigos ligados a un campo
  (`SKU_DUPLICADO`, `EMAIL_DUPLICADO`, `STOCK_INSUFICIENTE`…) marcan el input correspondiente.
- **Montos** como texto decimal: solo se formatean en pesos colombianos; los totales los calcula el backend.
- **Tipos** generados del OpenAPI del backend (`npm run gen:types`), no escritos a mano.

### Pruebas

- **Vitest + Testing Library + MSW (20 pruebas):** cliente HTTP (refresh, single flight, errores),
  login/logout, carrito → compra (incluido `STOCK_INSUFICIENTE`) y manejo de errores de formularios.
- **Playwright (2 pruebas e2e)** contra la API real: login/logout de ADMIN y compra de CLIENTE.
- **Verificado a mano contra la API real** (Docker y PostgreSQL 17): refresh real con 3 requests
  simultáneos → 1 solo refresh, ventas (confirmar, facturar, anular), stock insuficiente al crear y al
  confirmar, 404 al ver una venta ajena, y contraseña actual incorrecta.

---

## 2. Base de datos (PostgreSQL 17, puerto 5434)

El archivo propuesto `inventario.sql` tenía un esquema distinto al del backend (por ejemplo
`detalle_ventas`, `inventario.stock_actual`, facturas con número entero, sin `tipo_documento` ni tabla de
sesiones), así que la API no podía funcionar sobre él. Se reconstruyó así:

1. La base cargada con `inventario.sql` se **conservó** con el nombre `inventario_original`.
2. Se creó el rol **`inventario`** (contraseña de desarrollo `inventario`) y una base **`inventario`** nueva.
3. Se aplicaron las **migraciones del backend** (Alembic `0001` → `0004`).
4. Se cargaron **los mismos datos de `inventario.sql`** usando los servicios del backend, para que stock,
   movimientos, totales e IVA queden calculados igual que en la API:
   - 3 categorías, 10 productos con su inventario inicial y 2 ajustes de conteo físico.
   - 2 clientes (Carlos Andrés Ramírez, con usuario, y Distribuciones El Cafetal S.A.S.).
   - 4 ventas: 2 pagadas con factura (FAC-000001 = $323.680 y FAC-000002 = $2.752.470), 1 pendiente y 1 anulada.
   - Fechas históricas como en el archivo original (hace 30, 10, 6, 3, 2 y 1 días).
5. Se recrearon las **5 vistas de reporte** (`vw_productos_stock_bajo`, `vw_ventas_totales`,
   `vw_ventas_por_cliente`, `vw_facturas_detalle`, `vw_kardex`) adaptadas a las tablas del backend.

**Diferencias con `inventario.sql`:**
- Tablas y columnas del backend (`venta_detalles`, `inventario.stock`, `ventas.total`,
  `clientes.tipo_documento`, facturas `FAC-000001` + `consecutivo`, `refresh_tokens`, etc.).
- **Sin triggers de stock:** el backend actualiza el stock al registrar cada movimiento; con el trigger se
  contaría dos veces.
- `admin@inventario.local` pasó a `admin@inventario.com` (el backend no acepta dominios `.local`).
- Contraseñas con hash bcrypt real en lugar de marcadores.

**Archivo para recrear la base:** [`database/inventario_backend.sql`](database/inventario_backend.sql)
(esquema + datos + vistas, sin sesiones). Las instrucciones de uso están en su encabezado. Se probó
restaurándolo en una base vacía. Los cambios futuros de esquema deben hacerse con **migraciones del
backend**, no editando este archivo.

---

## 3. Backend (`backend/`)

**No se modificó ningún archivo versionado del backend ni de `docs/`.** Solo se crearon archivos
**locales** para poder ejecutarlo en este equipo (no se suben al repo):

| Archivo local | Para qué |
|---|---|
| `backend/.env` | El repo no trae `.env.example`. Tiene `JWT_SECRET_KEY` aleatoria, `CORS_ORIGINS` con `http://localhost:3000` y `DATABASE_URL` hacia PostgreSQL 17 (`localhost:5434`). |
| `backend/docker-compose.override.yml` | Publica el Postgres de Docker en el puerto **5435** (el 5432 estaba ocupado) y hace que la API use PostgreSQL 17 (`host.docker.internal:5434`). |

Además, la imagen de la API se construyó con un Dockerfile temporal (fuera del repo) que le da más tiempo a
`pip`, porque la instalación fallaba por lentitud de red. Por eso hay que levantarla con
`docker compose up -d --no-build`.

### Pedidos para el backend (Santiago)

Están detallados en [`frontend/PENDIENTES.md`](frontend/PENDIENTES.md#pedidos-para-el-backend-santiago). Los principales:
1. Falta `backend/.env.example` y no hay `.gitignore` en la raíz ni en `backend/` (el `.env` se podría subir por error).
2. `inventario.bundle` está versionado en la raíz.
3. El OpenAPI de los errores 422 no coincide con lo que responde la API.
4. Un CLIENTE no puede cancelar su propia venta PENDIENTE ni editarla.
5. Puerto de Postgres fijo en `docker-compose.yml` (sugerencia: `"${DB_PORT:-5432}:5432"`).
6. `pip install` en el Dockerfile falla con redes lentas (sugerencia: `ENV PIP_DEFAULT_TIMEOUT=120 PIP_RETRIES=10`).

---

## 4. Cómo ejecutar todo (Windows)

1. Abrir **Docker Desktop**.
2. Backend (terminal 1):
   ```powershell
   cd backend
   docker compose up -d --no-build
   ```
   Comprobar http://localhost:8000/health. La API usa la base `inventario` de PostgreSQL 17.
3. Frontend (terminal 2):
   ```powershell
   cd frontend
   npm install            # solo la primera vez
   npm run dev
   ```
   Abrir http://localhost:3000 y entrar con un usuario de la tabla del README.
