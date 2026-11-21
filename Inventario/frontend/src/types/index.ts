// Alias legibles sobre los tipos generados desde el OpenAPI del backend.
// No edites src/types/api.d.ts a mano: regenéralo con `npm run gen:types`.
import type { components } from "./api";

type S = components["schemas"];

export type ErrorOut = S["ErrorOut"];
export type TokenOut = S["TokenOut"];
export type LoginIn = S["LoginIn"];
export type RegisterIn = S["RegisterIn"];
export type MeOut = S["MeOut"];
export type MeUpdate = S["MeUpdate"];

export type RolUsuario = S["RolUsuario"];
export type TipoDocumento = S["TipoDocumento"];
export type EstadoVenta = S["EstadoVenta"];
export type TipoMovimiento = S["TipoMovimiento"];

export type Usuario = S["UsuarioOut"];
export type UsuarioCreate = S["UsuarioCreate"];
export type UsuarioUpdate = S["UsuarioUpdate"];

export type Cliente = S["ClienteOut"];
export type ClienteCreate = S["ClienteCreate"];
export type ClienteUpdate = S["ClienteUpdate"];
export type ClienteResumen = S["ClienteResumen"];

export type Categoria = S["CategoriaOut"];
export type CategoriaCreate = S["CategoriaCreate"];
export type CategoriaUpdate = S["CategoriaUpdate"];

export type Producto = S["ProductoOut"];
export type ProductoCreate = S["ProductoCreate"];
export type ProductoUpdate = S["ProductoUpdate"];

export type Inventario = S["InventarioOut"];
export type StockMinimoUpdate = S["StockMinimoUpdate"];
export type Movimiento = S["MovimientoOut"];
export type MovimientoCreate = S["MovimientoCreate"];

export type Venta = S["VentaOut"];
export type VentaCreate = S["VentaCreate"];
export type DetalleVenta = S["DetalleVentaOut"];
export type AnularIn = S["AnularIn"];

export type Factura = S["FacturaOut"];
export type FacturaDetalle = S["FacturaDetalleOut"];

/** Respuesta paginada genérica: { items, total, page, size, pages }. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/** Parámetros comunes de todos los listados. */
export interface ListParams {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
}

/** Error de validación (422) tal como lo arma el backend. */
export interface CampoError {
  campo: string;
  mensaje: string;
}

export const TIPOS_DOCUMENTO: TipoDocumento[] = ["CC", "CE", "NIT", "PAS"];
export const ROLES: RolUsuario[] = ["ADMIN", "CLIENTE"];
export const ESTADOS_VENTA: EstadoVenta[] = ["PENDIENTE", "PAGADA", "ANULADA"];
export const TIPOS_MOVIMIENTO: TipoMovimiento[] = ["ENTRADA", "SALIDA", "AJUSTE"];
