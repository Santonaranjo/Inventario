# Frontend: Inventario

Next.js 16 (App Router) + TypeScript estricto + Tailwind CSS 4 + shadcn/ui (Base UI) + TanStack Query +
React Hook Form + Zod. Consume la API FastAPI de [`../backend`](../backend/README.md); el contrato está en
[`../docs/HANDOFF_FRONTEND.md`](../docs/HANDOFF_FRONTEND.md).

Todos los comandos son para **PowerShell en Windows**. Si la ruta tiene espacios, úsala **entre comillas**.

## Requisitos

- **Node.js 20.9 o superior** (probado con Node 24) y npm.
- La **API corriendo** en `http://localhost:8000` (ver `backend/README.md`; con Docker:
  `docker compose up -d --build` y `docker compose exec api python -m app.seed`).

## Instalación

```powershell
cd "D:\ruta\a\Inventario\frontend"
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abre http://localhost:3000. Usuarios del seed:

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@inventario.com` | `Admin123*` |
| CLIENTE | `cliente@inventario.com` | `Cliente123*` |

> Si Next corre en otro puerto u origen, agrégalo a `CORS_ORIGINS` en `backend/.env` y reinicia la API.

## Variables de entorno

| Variable | Ejemplo | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | URL base de la API, con el prefijo `/api/v1` |

`.env.local` **no se sube** al repo (lo ignora `.gitignore`); `.env.example` sí.

## Tipos desde OpenAPI

Los tipos de la API **no se escriben a mano**: se generan en `src/types/api.d.ts` y se usan con alias legibles
desde `src/types/index.ts` (`Producto`, `Venta`, `Page<T>`…).

```powershell
npm run gen:types          # desde la API corriendo (http://localhost:8000/openapi.json)
npm run gen:types:file     # desde la copia versionada openapi/openapi.json (sin API)
```

Regenera los tipos cada vez que cambie el backend y corre `npm run typecheck` para ver qué se rompió.
Para actualizar `openapi/openapi.json`: con la API arriba, `Invoke-WebRequest http://localhost:8000/openapi.json -OutFile openapi/openapi.json`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` / `npm start` | Build de producción y servirlo |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Pruebas unitarias y de integración (Vitest + Testing Library + MSW) |
| `npm run test:watch` | Vitest en modo watch |
| `npm run test:e2e` | E2E con Playwright contra la API real |

## Pruebas

```powershell
npm test
```
No necesitan la API: MSW simula las respuestas. Cubren:
- **Cliente HTTP** (`tests/api-client.test.ts`): Bearer, query sin vacíos, refresh con rotación y reintento único,
  **single flight** (3 requests con 401 simultáneos → 1 solo refresh), refresh fallido → sesión cerrada, 422 con
  `errors`, error de red.
- **Login / logout** (`tests/auth.test.tsx`): guarda tokens y usuario, redirige por rol, muestra `detail`,
  valida el formulario, logout envía el `refresh_token` y limpia la sesión aunque la API falle.
- **Carrito → compra** (`tests/checkout.test.tsx`): `POST /ventas` + `POST /ventas/{id}/confirmar`; con
  `STOCK_INSUFICIENTE` muestra el `detail` y deja la venta PENDIENTE con enlace a Mis compras.

E2E (requiere la API con el seed; si no está arriba, las pruebas se saltan):
```powershell
npx playwright install chromium   # solo la primera vez
npm run test:e2e
```

## Estructura

```
src/
  app/                      rutas (App Router)
    (auth)/login, registro  públicas
    admin/...               solo ADMIN (layout con RoleGuard)
    tienda/...              solo CLIENTE
    perfil/                 cualquier usuario logueado
  components/
    ui/                     shadcn/ui
    layout/                 AppShell, RoleGuard, navegación por rol
    shared/                 tablas, paginación, búsqueda, estados, diálogos de confirmación
    productos/ inventario/ ventas/ auth/ providers/
  lib/
    api/client.ts           ÚNICO cliente HTTP (Bearer, refresh single flight, ApiError)
    api/endpoints.ts        funciones por recurso
    api/session.ts          tokens y usuario en localStorage
    cart-store.ts           carrito (store externo en localStorage)
    format.ts schemas.ts form-errors.ts
  hooks/                    queries y mutations (TanStack Query)
  types/                    api.d.ts (generado) + alias
tests/                      Vitest + MSW
e2e/                        Playwright
```

### Reglas que sigue el código
- Ningún componente llama a `fetch`: todo pasa por `src/lib/api/client.ts`.
- Errores `{detail, code}`: se muestra `detail`; `code` decide la lógica. Los 422 marcan cada input con `errors[].campo`.
- Montos como string decimal: solo se formatean para mostrar (`formatMoney`, COP). Los totales los calcula el backend.
- La UI oculta lo que el rol no puede hacer, pero la seguridad real está en el backend; 403/404 se muestran con un mensaje claro.

Decisiones y pendientes: [`PENDIENTES.md`](./PENDIENTES.md).
