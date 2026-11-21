"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventarioApi, type InventarioFilters, type MovimientoFilters } from "@/lib/api/endpoints";
import type { ListParams, MovimientoCreate } from "@/types";
import { qk } from "./query-keys";

export function useInventario(params: InventarioFilters = {}) {
  return useQuery({
    queryKey: qk.inventario.list(params),
    queryFn: () => inventarioApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAlertas(params: ListParams = {}) {
  return useQuery({
    queryKey: qk.inventario.alertas(params),
    queryFn: () => inventarioApi.alertas(params),
    placeholderData: keepPreviousData,
  });
}

export function useInventarioProducto(productoId: number | undefined) {
  return useQuery({
    queryKey: qk.inventario.detail(productoId ?? 0),
    queryFn: () => inventarioApi.get(productoId!),
    enabled: !!productoId,
  });
}

export function useMovimientos(params: MovimientoFilters, enabled = true) {
  return useQuery({
    queryKey: qk.inventario.movimientos(params),
    queryFn: () => inventarioApi.movimientos(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

function useInvalidarStock() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.inventario.all });
    qc.invalidateQueries({ queryKey: qk.productos.all });
  };
}

export function useUpdateStockMinimo() {
  const invalidar = useInvalidarStock();
  return useMutation({
    mutationFn: ({ productoId, stock_minimo }: { productoId: number; stock_minimo: number }) =>
      inventarioApi.updateMinimo(productoId, stock_minimo),
    onSuccess: invalidar,
  });
}

export function useRegistrarMovimiento() {
  const invalidar = useInvalidarStock();
  return useMutation({
    mutationFn: (body: MovimientoCreate) => inventarioApi.registrarMovimiento(body),
    onSuccess: invalidar,
  });
}
