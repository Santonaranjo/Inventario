"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { facturasApi, ventasApi, type FacturaFilters, type VentaFilters } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { Venta, VentaCreate } from "@/types";
import { qk } from "./query-keys";

export function useVentas(params: VentaFilters = {}) {
  return useQuery({
    queryKey: qk.ventas.list(params),
    queryFn: () => ventasApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useVenta(id: number | undefined) {
  return useQuery({ queryKey: qk.ventas.detail(id ?? 0), queryFn: () => ventasApi.get(id!), enabled: !!id });
}

/** Tras cualquier cambio de una venta se refrescan ventas, facturas e inventario. */
function useOnVentaChange() {
  const qc = useQueryClient();
  return (venta?: Venta) => {
    if (venta) qc.setQueryData(qk.ventas.detail(venta.id), venta);
    qc.invalidateQueries({ queryKey: qk.ventas.all });
    qc.invalidateQueries({ queryKey: qk.facturas.all });
    qc.invalidateQueries({ queryKey: qk.inventario.all });
    qc.invalidateQueries({ queryKey: qk.productos.all });
  };
}

export function useCrearVenta() {
  const onChange = useOnVentaChange();
  return useMutation({ mutationFn: (body: VentaCreate) => ventasApi.create(body), onSuccess: (v) => onChange(v) });
}

export function useConfirmarVenta() {
  const onChange = useOnVentaChange();
  return useMutation({
    mutationFn: (id: number) => ventasApi.confirmar(id),
    onSuccess: (v) => onChange(v),
  });
}

export function useAnularVenta() {
  const onChange = useOnVentaChange();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => ventasApi.anular(id, { motivo }),
    onSuccess: (v) => onChange(v),
  });
}

export function useEliminarVenta() {
  const onChange = useOnVentaChange();
  return useMutation({ mutationFn: (id: number) => ventasApi.remove(id), onSuccess: () => onChange() });
}

export function useFacturarVenta() {
  const qc = useQueryClient();
  const onChange = useOnVentaChange();
  return useMutation({
    mutationFn: (id: number) => ventasApi.facturar(id),
    onSuccess: (f) => {
      qc.setQueryData(qk.facturas.detail(f.id), f);
      onChange();
    },
  });
}

export type CheckoutResult =
  | { ok: true; venta: Venta }
  /** La venta se creó pero no se pudo confirmar (p. ej. STOCK_INSUFICIENTE): queda PENDIENTE. */
  | { ok: false; venta: Venta; error: unknown }
  /** Ni siquiera se pudo crear la venta. */
  | { ok: false; venta: null; error: unknown };

/**
 * Compra del cliente: POST /ventas y enseguida POST /ventas/{id}/confirmar.
 * Nunca lanza: devuelve en qué paso falló para que la UI decida.
 */
export function useCheckout() {
  const onChange = useOnVentaChange();
  return useMutation({
    mutationFn: async (body: VentaCreate): Promise<CheckoutResult> => {
      let venta: Venta;
      try {
        venta = await ventasApi.create(body);
      } catch (error) {
        return { ok: false, venta: null, error };
      }
      try {
        const pagada = await ventasApi.confirmar(venta.id);
        return { ok: true, venta: pagada };
      } catch (error) {
        return { ok: false, venta, error };
      }
    },
    onSettled: (r) => onChange(r?.venta ?? undefined),
  });
}

export const esStockInsuficiente = (e: unknown) => isApiError(e) && e.code === "STOCK_INSUFICIENTE";

// ---------- Facturas ----------
export function useFacturas(params: FacturaFilters = {}) {
  return useQuery({
    queryKey: qk.facturas.list(params),
    queryFn: () => facturasApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useFactura(id: number | undefined) {
  return useQuery({ queryKey: qk.facturas.detail(id ?? 0), queryFn: () => facturasApi.get(id!), enabled: !!id });
}
