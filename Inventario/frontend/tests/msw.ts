import { setupServer } from "msw/node";
import type { TokenOut, Usuario, Venta } from "@/types";

export const API = "http://api.test/api/v1";
export const server = setupServer();

export const admin: Usuario = {
  id: 1,
  email: "admin@inventario.com",
  nombre: "Administrador",
  rol: "ADMIN",
  activo: true,
  created_at: "2026-11-20T10:00:00-05:00",
};

export const clienteUser: Usuario = {
  id: 2,
  email: "cliente@inventario.com",
  nombre: "Carlos Pérez",
  rol: "CLIENTE",
  activo: true,
  created_at: "2026-11-20T10:00:00-05:00",
};

export function tokens(n: number, usuario: Usuario = admin): TokenOut {
  return {
    access_token: `access-${n}`,
    refresh_token: `refresh-${n}`,
    token_type: "bearer",
    expires_in: 1800,
    usuario,
  };
}

export function seedSession(n = 1, usuario: Usuario = admin) {
  const t = tokens(n, usuario);
  localStorage.setItem("inv.access_token", t.access_token);
  localStorage.setItem("inv.refresh_token", t.refresh_token);
  localStorage.setItem("inv.usuario", JSON.stringify(t.usuario));
}

export function venta(id: number, estado: Venta["estado"]): Venta {
  return {
    id,
    estado,
    total: "17000.00",
    observaciones: null,
    cliente: { id: 1, tipo_documento: "CC", documento: "1053800123", nombre: "Carlos Pérez", email: "cliente@inventario.com" },
    usuario_id: 2,
    detalles: [
      { id: 1, producto_id: 1, sku: "PAP-001", producto_nombre: "Cuaderno", cantidad: 2, precio_unitario: "8500.00", subtotal: "17000.00" },
    ],
    factura_id: null,
    numero_factura: null,
    created_at: "2026-11-20T10:00:00-05:00",
    updated_at: "2026-11-20T10:00:00-05:00",
    pagada_at: estado === "PAGADA" ? "2026-11-20T10:00:01-05:00" : null,
    anulada_at: null,
    motivo_anulacion: null,
  };
}
