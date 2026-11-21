# Frontend: decisiones y pendientes

## Decisiones tomadas por ambigüedad

1. **Tokens en `localStorage`** (como propone el handoff). Por eso la protección de rutas es en el cliente
   (`RoleGuard` en los layouts) y no en el `proxy`/middleware de Next, que no puede leer `localStorage`.
   Las rutas privadas se renderizan dentro de `<Suspense>` (Next 16 con Cache Components).
2. **Refresh:** además del single flight, si un request recibe `TOKEN_EXPIRADO` pero otro ya renovó el token
   mientras viajaba, se reintenta con el token nuevo sin volver a llamar a `/auth/refresh` (evita gastar
   un refresh ya rotado). Con `TOKEN_REVOCADO`/`TOKEN_INVALIDO` o si falla el refresh, se cierra la sesión
   local y se manda al login con un aviso.
3. **Logout:** si `POST /auth/logout` falla (sin red, token vencido), igual se borra la sesión local.
4. **`?next=` del login** solo se respeta si la ruta pertenece al rol del usuario (evita redirecciones raras).
5. **Carrito** en `localStorage`, se vacía al iniciar o cerrar sesión. El "Total estimado" es solo visual
   (precio × cantidad); el total real lo devuelve el backend.
6. **Pago fallido por stock:** si `confirmar` responde `STOCK_INSUFICIENTE`, se muestra el `detail`, la venta
   queda PENDIENTE (con enlace para reintentar la confirmación desde *Mis compras*) y **se conserva el carrito**
   para que el cliente ajuste cantidades y vuelva a pagar (eso crea una venta nueva).
7. **Venta de mostrador (ADMIN):** dos botones, "Crear pendiente" y "Crear y confirmar pago". Si se crea pero
   no se puede confirmar, se avisa y se abre el detalle (queda PENDIENTE).
8. **Factura:** se genera manualmente desde el detalle de una venta PAGADA (decisión del backend). El IVA y el
   total con IVA solo se muestran en la factura.
9. **Listados admin** arrancan filtrando "Activos" en productos, inventario y clientes; categorías y usuarios
   muestran todos.
10. **Selects de categorías** piden `size=100` (máximo de la API). Si un día hay más de 100 categorías activas,
    habrá que paginar o buscar.
11. **Vincular cliente ↔ usuario** se hace escribiendo el ID del usuario (no hay un buscador de usuarios
    CLIENTE sin ficha en la API).
12. **Edición de uno mismo (ADMIN):** el formulario no envía `rol` ni `activo` cuando el usuario se edita a sí
    mismo (el backend lo prohíbe con `OPERACION_NO_PERMITIDA`).
13. **Tipos:** se versiona `openapi/openapi.json` para poder regenerar `src/types/api.d.ts` sin la API
    (`npm run gen:types:file`). Se generó **desde el código del backend** (`app.openapi()`), sin base de datos.

## Verificación contra la API real (Docker)

Hecha con el backend en Docker + seed:
- [x] `npm run gen:types` desde la API viva: **sin diferencias** con los tipos versionados.
- [x] Login/logout por rol, redirecciones y protección de rutas (ADMIN ↔ CLIENTE).
- [x] **Refresh real:** con un access token vencido, 3 requests simultáneos reciben `TOKEN_EXPIRADO` → **un solo**
      `POST /auth/refresh` → los 3 se reintentan con 200 y el refresh token rota.
- [x] Productos (crear, `SKU_DUPLICADO`), kardex (ENTRADA, SALIDA con `STOCK_INSUFICIENTE`).
- [x] Ventas: confirmar, facturar (IVA 19 %), anular con motivo (factura anulada y stock devuelto).
- [x] Carrito → compra pagada; `STOCK_INSUFICIENTE` al crear (no se crea venta) y **al confirmar** (queda PENDIENTE).
- [x] Venta ajena de otro cliente → 404 "Venta no encontrada". `PASSWORD_INCORRECTO` en el campo.
- [x] `npm run test:e2e` (Playwright con `PW_CHANNEL=chrome`): 2/2.

Mejoras que salieron de estas pruebas (ya aplicadas): errores de negocio ligados a un campo (`SKU_DUPLICADO`,
`EMAIL_DUPLICADO`, `STOCK_INSUFICIENTE`…) se marcan en ese input; el logout ya no deja `?next=` en la URL;
las cantidades del carrito tienen nombre accesible único ("Cantidad de …").

## Pedidos para el backend (Santiago)

1. **Falta `backend/.env.example`:** el README dice `Copy-Item .env.example .env`, pero el archivo no está en el repo.
2. **No hay `.gitignore` en la raíz ni en `backend/`:** `backend/.env` (con `JWT_SECRET_KEY`) se podría subir por
   error. El frontend tiene el suyo.
3. **`inventario.bundle` está versionado en la raíz** (85 KB); parece subido por error.
4. **OpenAPI de los 422:** documenta `HTTPValidationError` (formato por defecto de FastAPI), pero la API responde
   `{detail, code: "VALIDATION_ERROR", errors: [{campo, mensaje}]}`. Además `ErrorOut` no incluye `errors`.
   Sugerencia: declarar las respuestas 422 con un esquema `ValidationErrorOut` para que los tipos generados coincidan.
5. **El CLIENTE no puede cancelar una venta PENDIENTE suya** (anular/eliminar son solo ADMIN). Si el pago falla
   por stock, la venta queda colgada hasta que un admin la elimine. Sugerencia: permitir al dueño eliminar
   sus ventas PENDIENTES, o expirarlas.
6. **No se puede editar una venta PENDIENTE** (cambiar cantidades). Hoy toca crear otra.
7. **Sin buscador de usuarios CLIENTE sin ficha** para vincular desde Clientes (`GET /usuarios?rol=CLIENTE&sin_cliente=true`).
8. **Rutas del README/handoff** apuntan a la carpeta de Santiago (`C:\Users\Santiago\...`); conviene usar rutas relativas.
9. **Python:** el README pide 3.12; con 3.11 al menos `app.openapi()` funciona (no se probó el resto).
10. **Puerto de Postgres fijo en 5432** en `docker-compose.yml`. Si el equipo ya tiene PostgreSQL (aquí 5432-5434
    estaban ocupados), toca editar el archivo versionado. Sugerencia: `"${DB_PORT:-5432}:5432"`. Mientras tanto, se
    puede usar un `docker-compose.override.yml` local (no versionado) con `ports: !override ["5435:5432"]`.
11. **`pip install` en el Dockerfile falla con redes lentas** ("No matching distribution found" por timeout).
    Sugerencia: `ENV PIP_DEFAULT_TIMEOUT=120 PIP_RETRIES=10` en el `Dockerfile`.

## Mejoras futuras

- [ ] Refresh token en cookie `httpOnly` vía Route Handler de Next en lugar de `localStorage`.
- [ ] Filtros y página en la URL (`?page=2&search=…`) para poder compartir enlaces de listados.
- [ ] Modo oscuro (los componentes ya lo soportan; falta el `ThemeProvider`).
- [ ] Exportar factura a PDF cuando exista `GET /facturas/{id}/pdf`.
