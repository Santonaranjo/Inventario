# Handoff para el frontend (Juliana)

El backend ya está listo para consumir. Tu proyecto **Next.js va en `Inventario/frontend/`**, que está vacía
(solo tiene un `.gitkeep`, que puedes borrar). Para levantar la API mira [`backend/README.md`](../backend/README.md);
con Docker basta `docker compose up -d` dentro de `backend/`.

- **URL base:** `http://localhost:8000/api/v1`
- **Documentación interactiva:** http://localhost:8000/docs (Swagger, con ejemplos y botón *Authorize*)
- **OpenAPI JSON:** http://localhost:8000/openapi.json
- **Salud:** `GET http://localhost:8000/health` (fuera de `/api/v1`)

Usuarios de prueba (los crea el seed):
| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@inventario.com` | `Admin123*` |
| CLIENTE | `cliente@inventario.com` | `Cliente123*` |

---

## 1. Variables y CORS

En `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

El backend acepta por CORS los orígenes de `CORS_ORIGINS` en `backend/.env`
(por defecto `http://localhost:3000,http://127.0.0.1:3000`). Si Next corre en otro puerto o en un dominio
desplegado, hay que agregarlo ahí (separado por coma) y reiniciar la API. Se permiten todos los métodos y
headers, y `allow_credentials=true`.

## 2. Autenticación

Se usan JWT con dos tokens:
| Token | Vida | Para qué |
|---|---|---|
| `access_token` | 30 min (`ACCESS_TOKEN_EXPIRE_MINUTES`) | Va en cada request |
| `refresh_token` | 7 días (`REFRESH_TOKEN_EXPIRE_DAYS`) | Solo para pedir un par nuevo |

### Flujo
1. **Login:** `POST /auth/login` con `{ "email", "password" }`. Registro de clientes: `POST /auth/register`
   (responde igual que el login, así que el cliente queda logueado de una vez).
2. **Guardar** `access_token`, `refresh_token` y `usuario` (trae `rol`, que sirve para decidir el menú).
3. **Cada request:** header `Authorization: Bearer <access_token>`.
4. **Si llega `401` con `code: "TOKEN_EXPIRADO"`:** llamar `POST /auth/refresh` con `{ "refresh_token" }`,
   guardar el **par nuevo** y repetir el request una sola vez. Si el refresh también falla, mandar al login.
5. **Logout:** `POST /auth/logout` con `{ "refresh_token" }` (responde 204) y borrar los tokens.

> ⚠️ **Rotación:** cada refresh devuelve un refresh_token nuevo y **el anterior deja de servir**. Si se
> reusa uno viejo, el backend asume robo y cierra todas las sesiones de ese usuario (`TOKEN_REVOCADO`).
> Si varios requests reciben 401 al mismo tiempo, **haz un solo refresh y que los demás lo esperen**
> (patrón "single flight"), o el usuario se deslogueará solo.

Ejemplo de respuesta de login:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "usuario": { "id": 2, "email": "cliente@inventario.com", "nombre": "Carlos Pérez",
               "rol": "CLIENTE", "activo": true, "created_at": "2026-11-20T19:07:47-05:00" }
}
```

Cliente HTTP mínimo (fetch) con refresh automático:
```ts
// src/lib/api.ts
const API = process.env.NEXT_PUBLIC_API_URL!;
let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const rt = localStorage.getItem("refresh_token");
  if (!rt) return false;
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  });
  if (!res.ok) { localStorage.clear(); return false; }
  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  return true;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }), ...init.headers },
  });
  if (res.status === 401 && retry) {
    const err = await res.clone().json().catch(() => ({}));
    if (err.code === "TOKEN_EXPIRADO") {
      refreshing ??= refresh().finally(() => (refreshing = null)); // single flight
      if (await refreshing) return api<T>(path, init, false);
    }
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  if (!res.ok) throw body; // { detail, code, errors? }
  return body as T;
}
```
`localStorage` es lo más simple para el proyecto. Más seguro sería guardar el refresh en una cookie
`httpOnly` desde un Route Handler de Next (queda en los pendientes).

## 3. Convenciones de las respuestas

### Montos = string decimal
Los montos llegan como **string**: `"precio_venta": "8500.00"`. Así no se pierde precisión.
- Para **mostrar:** `new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(Number(v))`
- Para **enviar:** string o número con máximo 2 decimales (`"8500.00"` o `8500`).
- No sumes montos en el front para guardarlos: los totales los calcula el backend.

### Fechas
ISO 8601 con zona horaria (`2026-11-20T19:07:47.799376-05:00`). Los filtros `fecha_desde` y `fecha_hasta`
reciben el mismo formato.

### Paginación, búsqueda y orden
Todos los `GET` de listados reciben:
| Param | Default | Descripción |
|---|---|---|
| `page` | 1 | desde 1 |
| `size` | 20 | máximo 100 |
| `search` | | texto libre (no distingue mayúsculas); los campos dependen del recurso |
| `sort` | según recurso | campos separados por coma; `-` = descendente. Ej: `sort=-precio_venta,nombre` |

Respuesta:
```json
{ "items": [ ... ], "total": 42, "page": 1, "size": 20, "pages": 3 }
```
Un campo de orden no permitido responde `400 INVALID_SORT` con la lista de campos válidos en `detail`.

### Errores
Siempre con el mismo formato:
```json
{ "detail": "Stock insuficiente para: ASE-001 (disponible: 0, solicitado: 1)", "code": "STOCK_INSUFICIENTE" }
```
`detail` es un mensaje en español que se puede mostrar al usuario. `code` es estable, úsalo para decidir
qué hacer. Los errores de validación (422) traen además `errors`:
```json
{ "detail": "Datos inválidos", "code": "VALIDATION_ERROR",
  "errors": [ { "campo": "email", "mensaje": "value is not a valid email address: ..." } ] }
```
`campo` puede ser anidado, por ejemplo `items.0.cantidad`. Úsalo para marcar el input en el formulario.

### Códigos HTTP
| HTTP | Cuándo |
|---|---|
| 200 | OK |
| 201 | Creado |
| 204 | Sin contenido (logout, DELETE) |
| 400 | Regla de negocio inválida (`CLIENTE_REQUERIDO`, `INVALID_SORT`, `AJUSTE_SIN_CAMBIO`, …) |
| 401 | Sin token, token inválido o expirado |
| 403 | Autenticado pero sin permiso (`FORBIDDEN`), o usuario/cliente inactivo |
| 404 | No existe, o no es tuyo (a un CLIENTE las ventas ajenas le dan 404) |
| 409 | Conflicto: duplicados, stock insuficiente, estado inválido |
| 422 | Body o query mal formados |
| 500 | Error inesperado (`INTERNAL_ERROR`) |
| 503 | `/health` sin conexión a la BD |

### Catálogo de `code`
| code | HTTP | Significado |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Ver `errors` |
| `NOT_AUTHENTICATED` | 401 | Falta el header Authorization |
| `TOKEN_INVALIDO` / `TOKEN_EXPIRADO` / `TOKEN_REVOCADO` | 401 | Ver sección 2 |
| `CREDENCIALES_INVALIDAS` | 401 | Email o contraseña incorrectos |
| `USUARIO_INACTIVO` | 403 | El admin desactivó el usuario |
| `FORBIDDEN` | 403 | El rol no tiene permiso |
| `NOT_FOUND` | 404 | |
| `EMAIL_DUPLICADO` / `DOCUMENTO_DUPLICADO` / `SKU_DUPLICADO` / `CATEGORIA_DUPLICADA` | 409 | |
| `STOCK_INSUFICIENTE` | 409 | `detail` dice qué producto y cuánto hay |
| `PRODUCTO_INACTIVO` | 409 | |
| `ESTADO_INVALIDO` | 409 | Confirmar una venta no PENDIENTE, o anular una ya anulada |
| `VENTA_NO_PAGADA` / `FACTURA_EXISTENTE` | 409 | Al generar una factura |
| `VENTA_NO_ELIMINABLE` | 409 | Solo se eliminan ventas PENDIENTES |
| `CLIENTE_NO_VINCULADO` | 400 | El usuario CLIENTE no tiene ficha de cliente |
| `CLIENTE_INACTIVO` | 403/409 | |
| `CLIENTE_REQUERIDO` | 400 | Un ADMIN creó una venta sin `cliente_id` |
| `PASSWORD_INCORRECTO` | 400 | `password_actual` incorrecto en PATCH /auth/me |
| `USUARIO_YA_VINCULADO` / `USUARIO_NO_CLIENTE` | 409/400 | Al vincular un usuario a un cliente |
| `OPERACION_NO_PERMITIDA` | 409 | Un admin intenta desactivarse a sí mismo |
| `AJUSTE_SIN_CAMBIO` | 400 | AJUSTE con el mismo stock actual |
| `MONTO_EXCEDIDO` | 400 | La venta supera el monto máximo |
| `INVALID_SORT` | 400 | |
| `CONFLICT` | 409 | Restricción de la BD violada (genérico) |
| `INTERNAL_ERROR` | 500 | |

## 4. Endpoints

Rol: **Público** = sin token · **Auth** = cualquier usuario logueado · **ADMIN** · **CLIENTE**.
Todas las rutas van con el prefijo `/api/v1`, salvo `/health`.

### Auth
| Método | Ruta | Rol | Body | Respuesta |
|---|---|---|---|---|
| POST | `/auth/register` | Público | `{email, password (8-72), nombre, documento, tipo_documento?, telefono?, direccion?}` | 201 `TokenOut` |
| POST | `/auth/login` | Público | `{email, password}` | 200 `TokenOut` |
| POST | `/auth/refresh` | Público | `{refresh_token}` | 200 `TokenOut` (par nuevo) |
| POST | `/auth/logout` | Público | `{refresh_token}` | 204 |
| GET | `/auth/me` | Auth | — | `Usuario` + `cliente` (ficha, o null) |
| PATCH | `/auth/me` | Auth | `{nombre?, telefono?, direccion?, password_actual?, password_nuevo?}` | `Me` |

### Usuarios — ADMIN
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/usuarios?rol=&activo=` | — | `Page<Usuario>` · search: email, nombre · sort: id, email, nombre, created_at |
| POST | `/usuarios` | `{email, password, nombre, rol}` | 201 `Usuario` |
| GET | `/usuarios/{id}` | — | `Usuario` |
| PATCH | `/usuarios/{id}` | `{nombre?, rol?, activo?, password?}` | `Usuario` |
| DELETE | `/usuarios/{id}` | — | 204 (desactiva y cierra sus sesiones) |

### Clientes — ADMIN
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/clientes?activo=` | — | `Page<Cliente>` · search: documento, nombre, email · sort: id, nombre, documento, created_at |
| POST | `/clientes` | `{tipo_documento, documento, nombre, email?, telefono?, direccion?, usuario_id?}` | 201 `Cliente` |
| GET | `/clientes/{id}` | — | `Cliente` |
| PATCH | `/clientes/{id}` | cualquier campo; `usuario_id: null` desvincula | `Cliente` |
| DELETE | `/clientes/{id}` | — | 204 (soft delete) |

### Categorías
| Método | Ruta | Rol | Respuesta |
|---|---|---|---|
| GET | `/categorias?activo=` | Auth (CLIENTE solo ve activas) | `Page<Categoria>` |
| GET | `/categorias/{id}` | Auth | `Categoria` |
| POST | `/categorias` | ADMIN | body `{nombre, descripcion?}` → 201 |
| PATCH | `/categorias/{id}` | ADMIN | `{nombre?, descripcion?, activo?}` |
| DELETE | `/categorias/{id}` | ADMIN | 204 (soft delete) |

### Productos
| Método | Ruta | Rol | Body / notas |
|---|---|---|---|
| GET | `/productos?categoria_id=&activo=` | Auth | CLIENTE: solo activos y `costo: null`. search: sku, nombre, descripción · sort: id, sku, nombre, precio_venta, created_at |
| GET | `/productos/{id}` | Auth | CLIENTE: 404 si está inactivo |
| POST | `/productos` | ADMIN | `{sku, nombre, precio_venta, costo, descripcion?, categoria_id?, activo?, stock_minimo?, stock_inicial?}` |
| PATCH | `/productos/{id}` | ADMIN | cualquier campo (no el stock); `activo: true` reactiva |
| DELETE | `/productos/{id}` | ADMIN | 204 (soft delete → inactivo) |

Ejemplo de `Producto`:
```json
{ "id": 1, "sku": "PAP-001", "nombre": "Cuaderno argollado 100 hojas", "descripcion": null,
  "categoria": { "id": 1, "nombre": "Papelería" },
  "precio_venta": "8500.00", "costo": "5200.00", "activo": true,
  "stock": 57, "stock_minimo": 10, "created_at": "...", "updated_at": "..." }
```

### Inventario — ADMIN
| Método | Ruta | Body / notas |
|---|---|---|
| GET | `/inventario?activo=` | `Page<Inventario>` · search: sku, nombre · sort: stock, stock_minimo, sku, nombre, updated_at |
| GET | `/inventario/alertas` | Productos activos con `stock <= stock_minimo` (los más críticos primero) |
| GET | `/inventario/{producto_id}` | `Inventario` |
| PATCH | `/inventario/{producto_id}` | `{stock_minimo}` |
| GET | `/inventario/movimientos?producto_id=&tipo=&venta_id=&fecha_desde=&fecha_hasta=` | `Page<Movimiento>`, más recientes primero |
| POST | `/inventario/movimientos` | ENTRADA o SALIDA: `{producto_id, tipo, cantidad, motivo}` · AJUSTE: `{producto_id, tipo:"AJUSTE", stock_nuevo, motivo}` |

```json
// Inventario
{ "producto_id": 3, "sku": "PAP-003", "producto_nombre": "Resma papel carta", "producto_activo": true,
  "stock": 4, "stock_minimo": 8, "en_alerta": true, "updated_at": "..." }
// Movimiento
{ "id": 12, "producto_id": 1, "sku": "PAP-001", "producto_nombre": "Cuaderno...", "tipo": "SALIDA",
  "cantidad": 3, "stock_anterior": 60, "stock_nuevo": 57, "motivo": "Venta #1",
  "usuario_id": 2, "usuario_nombre": "Carlos Pérez", "venta_id": 1, "fecha": "..." }
```

### Ventas
| Método | Ruta | Rol | Body / notas |
|---|---|---|---|
| GET | `/ventas?estado=&cliente_id=&fecha_desde=&fecha_hasta=` | Auth | ADMIN: todas · CLIENTE: solo las suyas. search: nombre/documento del cliente · sort: id, created_at, total, estado |
| POST | `/ventas` | Auth | `{items:[{producto_id, cantidad}], observaciones?, cliente_id?}`. El ADMIN **debe** enviar `cliente_id`; para el CLIENTE se ignora. → 201, estado **PENDIENTE** |
| GET | `/ventas/{id}` | Auth (propia) | `Venta` |
| POST | `/ventas/{id}/confirmar` | Auth (propia) | Pago simulado → **PAGADA** y descuenta stock. 409 si no alcanza |
| POST | `/ventas/{id}/anular` | ADMIN | `{motivo}` → **ANULADA**; si estaba pagada devuelve el stock y anula la factura |
| DELETE | `/ventas/{id}` | ADMIN | Solo PENDIENTES → 204 |
| POST | `/ventas/{id}/factura` | ADMIN | Genera la factura de una venta PAGADA → 201 `FacturaDetalle` |

Ciclo de estados:
```
PENDIENTE ──confirmar──▶ PAGADA ──(factura opcional)
    │                      │
    └──anular──▶ ANULADA ◀─┘ anular (devuelve el stock)
```

```json
// Venta
{ "id": 1, "estado": "PAGADA", "total": "70500.00", "observaciones": null,
  "cliente": { "id": 1, "tipo_documento": "CC", "documento": "1053800123", "nombre": "Carlos Pérez", "email": "cliente@inventario.com" },
  "usuario_id": 2,
  "detalles": [ { "id": 1, "producto_id": 1, "sku": "PAP-001", "producto_nombre": "Cuaderno...",
                  "cantidad": 3, "precio_unitario": "8500.00", "subtotal": "25500.00" } ],
  "factura_id": 1, "numero_factura": "FAC-000001",
  "created_at": "...", "updated_at": "...", "pagada_at": "...", "anulada_at": null, "motivo_anulacion": null }
```
`total` de la venta va **sin IVA**. El IVA aparece en la factura.

### Facturas
| Método | Ruta | Rol | Notas |
|---|---|---|---|
| GET | `/facturas?cliente_id=&anulada=&fecha_desde=&fecha_hasta=` | Auth | CLIENTE: solo las suyas · search: número, cliente · sort: id, numero, fecha_emision, total |
| GET | `/facturas/{id}` | Auth (propia) | Incluye `detalles` (para imprimir) |

```json
{ "id": 1, "numero": "FAC-000001", "venta_id": 1, "cliente": { ... },
  "subtotal": "70500.00", "porcentaje_iva": "19.00", "impuestos": "13395.00", "total": "83895.00",
  "fecha_emision": "...", "anulada": false, "anulada_at": null, "detalles": [ ... ] }
```

## 5. Pantallas sugeridas

### Comunes
| Pantalla | Endpoints |
|---|---|
| Login | `POST /auth/login` |
| Registro de cliente | `POST /auth/register` |
| Mi perfil / cambiar contraseña | `GET /auth/me`, `PATCH /auth/me` |
| Logout | `POST /auth/logout` |

Después del login, redirige según `usuario.rol`: ADMIN → `/admin`, CLIENTE → `/tienda`.

### ADMIN
| Pantalla | Endpoints |
|---|---|
| Dashboard (alertas, ventas recientes) | `GET /inventario/alertas?size=5`, `GET /ventas?size=5`, `GET /ventas?estado=PENDIENTE` (usar `total`) |
| Productos: lista con filtros | `GET /productos`, `GET /categorias` |
| Producto: crear / editar / desactivar | `POST`, `PATCH`, `DELETE /productos/{id}` |
| Categorías | `GET/POST/PATCH/DELETE /categorias` |
| Inventario (stock, editar mínimo) | `GET /inventario`, `PATCH /inventario/{id}` |
| Registrar entrada, salida o ajuste | `POST /inventario/movimientos` |
| Kardex / historial | `GET /inventario/movimientos?producto_id=` |
| Alertas de stock | `GET /inventario/alertas` |
| Clientes | `GET/POST/PATCH/DELETE /clientes` |
| Ventas: lista y filtros | `GET /ventas` |
| Nueva venta (mostrador) | `GET /clientes?search=`, `GET /productos?search=`, `POST /ventas`, `POST /ventas/{id}/confirmar` |
| Detalle de venta (confirmar, anular, facturar) | `GET /ventas/{id}`, `POST …/confirmar`, `POST …/anular`, `POST …/factura` |
| Facturas y detalle imprimible | `GET /facturas`, `GET /facturas/{id}` |
| Usuarios | `GET/POST/PATCH/DELETE /usuarios` |

### CLIENTE
| Pantalla | Endpoints |
|---|---|
| Catálogo (búsqueda, categorías) | `GET /productos?search=&categoria_id=`, `GET /categorias` |
| Detalle de producto | `GET /productos/{id}` |
| Carrito (estado local del front) → comprar | `POST /ventas` y luego `POST /ventas/{id}/confirmar` |
| Mis compras | `GET /ventas` |
| Detalle de compra | `GET /ventas/{id}` (confirmar si quedó PENDIENTE) |
| Mis facturas | `GET /facturas`, `GET /facturas/{id}` |

El carrito vive en el front. Al pagar: `POST /ventas` y enseguida `POST /ventas/{id}/confirmar`. Si el
confirmar responde `STOCK_INSUFICIENTE`, muestra `detail` y deja la venta PENDIENTE para que el cliente
la ajuste o la abandone.

## 6. Tipos TypeScript desde OpenAPI (recomendado)

No escribas los tipos a mano: genéralos con la API corriendo.
```powershell
cd "C:\Users\Santiago\Documents\Ucaldas\5to Semestre\Programacion web ll\Inventario\frontend"
npm i -D openapi-typescript
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts
```
Uso:
```ts
import type { components } from "@/types/api";
type Producto = components["schemas"]["ProductoOut"];
type PageProducto = components["schemas"]["Page_ProductoOut_"];
```
Regenera los tipos cada vez que cambie el backend. Opcional: `openapi-fetch` da un cliente tipado encima
de esos tipos.
