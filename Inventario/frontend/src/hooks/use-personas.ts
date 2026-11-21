"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientesApi, usuariosApi, type ClienteFilters, type UsuarioFilters } from "@/lib/api/endpoints";
import type { ClienteCreate, ClienteUpdate, UsuarioCreate, UsuarioUpdate } from "@/types";
import { qk } from "./query-keys";

// ---------- Clientes ----------
export function useClientes(params: ClienteFilters = {}, enabled = true) {
  return useQuery({
    queryKey: qk.clientes.list(params),
    queryFn: () => clientesApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSaveCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ClienteCreate | ClienteUpdate }) =>
      id ? clientesApi.update(id, body) : clientesApi.create(body as ClienteCreate),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clientes.all }),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => clientesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clientes.all }),
  });
}

// ---------- Usuarios ----------
export function useUsuarios(params: UsuarioFilters = {}) {
  return useQuery({
    queryKey: qk.usuarios.list(params),
    queryFn: () => usuariosApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useSaveUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: UsuarioCreate | UsuarioUpdate }) =>
      id ? usuariosApi.update(id, body) : usuariosApi.create(body as UsuarioCreate),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.usuarios.all }),
  });
}

export function useDeleteUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usuariosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.usuarios.all }),
  });
}
