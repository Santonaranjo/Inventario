"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  categoriasApi,
  productosApi,
  type CategoriaFilters,
  type ProductoFilters,
} from "@/lib/api/endpoints";
import type { CategoriaCreate, CategoriaUpdate, ProductoCreate, ProductoUpdate } from "@/types";
import { qk } from "./query-keys";

// ---------- Categorías ----------
export function useCategorias(params: CategoriaFilters = {}) {
  return useQuery({
    queryKey: qk.categorias.list(params),
    queryFn: () => categoriasApi.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Todas las categorías activas para selects y filtros (máximo 100 por página según la API). */
export function useCategoriasOpciones() {
  return useCategorias({ activo: true, size: 100, sort: "nombre" });
}

export function useSaveCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: CategoriaCreate | CategoriaUpdate }) =>
      id ? categoriasApi.update(id, body) : categoriasApi.create(body as CategoriaCreate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categorias.all });
      qc.invalidateQueries({ queryKey: qk.productos.all });
    },
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoriasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categorias.all }),
  });
}

// ---------- Productos ----------
export function useProductos(params: ProductoFilters = {}) {
  return useQuery({
    queryKey: qk.productos.list(params),
    queryFn: () => productosApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useProducto(id: number | undefined) {
  return useQuery({
    queryKey: qk.productos.detail(id ?? 0),
    queryFn: () => productosApi.get(id!),
    enabled: !!id,
  });
}

export function useSaveProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ProductoCreate | ProductoUpdate }) =>
      id ? productosApi.update(id, body) : productosApi.create(body as ProductoCreate),
    onSuccess: (p) => {
      qc.setQueryData(qk.productos.detail(p.id), p);
      qc.invalidateQueries({ queryKey: qk.productos.all });
      qc.invalidateQueries({ queryKey: qk.inventario.all });
    },
  });
}

export function useDeleteProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.productos.all });
      qc.invalidateQueries({ queryKey: qk.inventario.all });
    },
  });
}
