"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { authApi } from "@/lib/api/endpoints";
import type { MeUpdate } from "@/types";
import { qk } from "./query-keys";

export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: authApi.me });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  const { updateUsuario } = useAuth();
  return useMutation({
    mutationFn: (body: MeUpdate) => authApi.updateMe(body),
    onSuccess: (me) => {
      qc.setQueryData(qk.me, me);
      // Mantiene el nombre del menú al día.
      updateUsuario({
        id: me.id,
        email: me.email,
        nombre: me.nombre,
        rol: me.rol,
        activo: me.activo,
        created_at: me.created_at,
      });
    },
  });
}
