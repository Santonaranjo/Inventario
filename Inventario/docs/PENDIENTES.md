# Pendientes y próximos pasos

## Decisiones tomadas por ambigüedad (para validar con el equipo)

1. **Venta en dos pasos.** `POST /ventas` crea la venta PENDIENTE y `POST /ventas/{id}/confirmar` la paga
   y descuenta el stock. No hay pasarela de pago: "confirmar" simula el pago.
2. **Quién confirma:** el CLIENTE confirma sus propias compras y el ADMIN puede confirmar cualquiera.
   **Solo el ADMIN anula.**
3. **Crear no reserva stock.** Una venta PENDIENTE no aparta unidades; el stock se vuelve a validar al
   confirmar. Otra opción sería reservar con expiración.
4. **La factura no es automática:** la genera el ADMIN con `POST /ventas/{id}/factura`. Es fácil cambiarlo
   a "factura automática al confirmar".
5. **IVA global** (`IVA_PORCENTAJE`, 19 %) aplicado sobre el total de la venta. Se asume que el
   **precio de venta no incluye IVA**.
6. **Eliminar ventas:** solo las PENDIENTES (nunca movieron stock). Las pagadas o facturadas se anulan.
7. **Categorías como tabla propia** (no como texto en el producto).
8. **Documento único por (tipo_documento, documento).** El registro público falla si el documento ya
   existe; no se vincula solo para que nadie se apropie de las compras de otro cliente.
9. Para un CLIENTE, las ventas y facturas ajenas responden **404** (no 403) para no revelar que existen.
10. El CLIENTE no ve el `costo` de los productos (llega `null`).
11. La ruta para el stock mínimo quedó como `PATCH /inventario/{producto_id}`, no `/stock-minimo`.
12. Los ítems repetidos del mismo producto en una venta se agrupan en una sola línea.
13. Un ADMIN puede quitarle el rol ADMIN a otros, pero no a sí mismo ni desactivarse.

## Fuera de alcance / por mejorar

### Seguridad
- [ ] Guardar el refresh token en una cookie `httpOnly` (con un Route Handler de Next) en vez de `localStorage`.
- [ ] Rate limiting en `/auth/login` y `/auth/register` (por ejemplo con `slowapi`).
- [ ] Recuperación de contraseña por email.
- [ ] Limpieza periódica de `refresh_tokens` expirados o revocados.
- [ ] Política de contraseñas más estricta.

### Negocio
- [ ] Pasarela de pago real (Wompi, PayU, Mercado Pago) en lugar de "confirmar".
- [ ] Reserva de stock al crear la venta, con expiración.
- [ ] Facturación electrónica DIAN (numeración autorizada sin huecos, CUFE, XML/PDF).
- [ ] PDF de la factura (`GET /facturas/{id}/pdf`).
- [ ] Impuestos por producto (exento, 5 %, 19 %).
- [ ] Multi-bodega y traslados.
- [ ] Proveedores y órdenes de compra (hoy una compra es una ENTRADA manual).
- [ ] Descuentos por línea o por venta.
- [ ] Reportes: ventas por período, productos más vendidos, valorización del inventario (stock × costo).
- [ ] Anulación parcial / devoluciones de solo algunos ítems.

### Técnico
- [ ] CI (GitHub Actions) que corra `pytest` y `alembic check` en cada push.
- [ ] Linter y formateador (`ruff`) con pre-commit.
- [ ] Logging estructurado y request-id.
- [ ] Imagen Docker con un usuario no root y un `docker-compose.prod.yml`.
- [ ] Imágenes de producto (subida de archivos y almacenamiento).
- [ ] Búsqueda con índices trigram (`pg_trgm`) si el catálogo crece.
- [ ] Separar dependencias de desarrollo (`requirements-dev.txt`).

## Para el equipo
- **Frontend (Juliana):** ver [`HANDOFF_FRONTEND.md`](./HANDOFF_FRONTEND.md).
- **Base de datos:** ver [`HANDOFF_DB.md`](./HANDOFF_DB.md), sección "Puntos abiertos".
