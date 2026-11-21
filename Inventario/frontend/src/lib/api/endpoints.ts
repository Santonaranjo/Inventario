// Funciones por recurso. Todas pasan por el cliente central (`api`).
import type {
  AnularIn,
  Categoria,
  CategoriaCreate,
  CategoriaUpdate,
  Cliente,
  ClienteCreate,
  ClienteUpdate,
  EstadoVenta,
  Factura,
  FacturaDetalle,
  Inventario,
  ListParams,
  LoginIn,
  MeOut,
  MeUpdate,
  Movimiento,
  MovimientoCreate,
  Page,
  Producto,
  ProductoCreate,
  ProductoUpdate,
  RegisterIn,
  RolUsuario,
  TipoMovimiento,
  TokenOut,
  Usuario,
  UsuarioCreate,
  UsuarioUpdate,
  Venta,
  VentaCreate,
} from "@/types";
import { api, apiRequest } from "./client";

// ---------- Auth ----------
export const authApi = {
  login: (body: LoginIn) => apiRequest<TokenOut>("/auth/login", { method: "POST", body, auth: false }),
  register: (body: RegisterIn) =>
    apiRequest<TokenOut>("/auth/register", { method: "POST", body, auth: false }),
  logout: (refresh_token: string) =>
    apiRequest<void>("/auth/logout", { method: "POST", body: { refresh_token }, auth: false }),
  me: () => api.get<MeOut>("/auth/me"),
  updateMe: (body: MeUpdate) => api.patch<MeOut>("/auth/me", body),
};

// ---------- Usuarios (ADMIN) ----------
export interface UsuarioFilters extends ListParams {
  rol?: RolUsuario | "";
  activo?: boolean | "";
}
export const usuariosApi = {
  list: (p: UsuarioFilters = {}) => api.get<Page<Usuario>>("/usuarios", { ...p }),
  get: (id: number) => api.get<Usuario>(`/usuarios/${id}`),
  create: (body: UsuarioCreate) => api.post<Usuario>("/usuarios", body),
  update: (id: number, body: UsuarioUpdate) => api.patch<Usuario>(`/usuarios/${id}`, body),
  remove: (id: number) => api.delete(`/usuarios/${id}`),
};

// ---------- Clientes (ADMIN) ----------
export interface ClienteFilters extends ListParams {
  activo?: boolean | "";
}
export const clientesApi = {
  list: (p: ClienteFilters = {}) => api.get<Page<Cliente>>("/clientes", { ...p }),
  get: (id: number) => api.get<Cliente>(`/clientes/${id}`),
  create: (body: ClienteCreate) => api.post<Cliente>("/clientes", body),
  update: (id: number, body: ClienteUpdate) => api.patch<Cliente>(`/clientes/${id}`, body),
  remove: (id: number) => api.delete(`/clientes/${id}`),
};

// ---------- Categorías ----------
export interface CategoriaFilters extends ListParams {
  activo?: boolean | "";
}
export const categoriasApi = {
  list: (p: CategoriaFilters = {}) => api.get<Page<Categoria>>("/categorias", { ...p }),
  get: (id: number) => api.get<Categoria>(`/categorias/${id}`),
  create: (body: CategoriaCreate) => api.post<Categoria>("/categorias", body),
  update: (id: number, body: CategoriaUpdate) => api.patch<Categoria>(`/categorias/${id}`, body),
  remove: (id: number) => api.delete(`/categorias/${id}`),
};

// ---------- Productos ----------
export interface ProductoFilters extends ListParams {
  categoria_id?: number | "";
  activo?: boolean | "";
}
export const productosApi = {
  list: (p: ProductoFilters = {}) => api.get<Page<Producto>>("/productos", { ...p }),
  get: (id: number) => api.get<Producto>(`/productos/${id}`),
  create: (body: ProductoCreate) => api.post<Producto>("/productos", body),
  update: (id: number, body: ProductoUpdate) => api.patch<Producto>(`/productos/${id}`, body),
  remove: (id: number) => api.delete(`/productos/${id}`),
};

// ---------- Inventario (ADMIN) ----------
export interface InventarioFilters extends ListParams {
  activo?: boolean | "";
}
export interface MovimientoFilters extends ListParams {
  producto_id?: number;
  tipo?: TipoMovimiento | "";
  venta_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}
export const inventarioApi = {
  list: (p: InventarioFilters = {}) => api.get<Page<Inventario>>("/inventario", { ...p }),
  alertas: (p: ListParams = {}) => api.get<Page<Inventario>>("/inventario/alertas", { ...p }),
  get: (productoId: number) => api.get<Inventario>(`/inventario/${productoId}`),
  updateMinimo: (productoId: number, stock_minimo: number) =>
    api.patch<Inventario>(`/inventario/${productoId}`, { stock_minimo }),
  movimientos: (p: MovimientoFilters = {}) =>
    api.get<Page<Movimiento>>("/inventario/movimientos", { ...p }),
  registrarMovimiento: (body: MovimientoCreate) =>
    api.post<Movimiento>("/inventario/movimientos", body),
};

// ---------- Ventas ----------
export interface VentaFilters extends ListParams {
  estado?: EstadoVenta | "";
  cliente_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}
export const ventasApi = {
  list: (p: VentaFilters = {}) => api.get<Page<Venta>>("/ventas", { ...p }),
  get: (id: number) => api.get<Venta>(`/ventas/${id}`),
  create: (body: VentaCreate) => api.post<Venta>("/ventas", body),
  confirmar: (id: number) => api.post<Venta>(`/ventas/${id}/confirmar`),
  anular: (id: number, body: AnularIn) => api.post<Venta>(`/ventas/${id}/anular`, body),
  remove: (id: number) => api.delete(`/ventas/${id}`),
  facturar: (id: number) => api.post<FacturaDetalle>(`/ventas/${id}/factura`),
};

// ---------- Facturas ----------
export interface FacturaFilters extends ListParams {
  cliente_id?: number;
  anulada?: boolean | "";
  fecha_desde?: string;
  fecha_hasta?: string;
}
export const facturasApi = {
  list: (p: FacturaFilters = {}) => api.get<Page<Factura>>("/facturas", { ...p }),
  get: (id: number) => api.get<FacturaDetalle>(`/facturas/${id}`),
};
