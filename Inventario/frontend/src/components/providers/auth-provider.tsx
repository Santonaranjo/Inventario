"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { authApi } from "@/lib/api/endpoints";
import {
  SESSION_EVENT,
  clearSession,
  getRefreshToken,
  getUsuario,
  getUsuarioRaw,
  saveSession,
  saveUsuario,
  subscribeSession,
  type SessionChangeReason,
} from "@/lib/api/session";

const noopSubscribe = () => () => {};
import type { LoginIn, RegisterIn, Usuario } from "@/types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  usuario: Usuario | null;
  status: AuthStatus;
  login: (data: LoginIn) => Promise<Usuario>;
  register: (data: RegisterIn) => Promise<Usuario>;
  logout: () => Promise<void>;
  updateUsuario: (u: Usuario) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // La sesión vive en localStorage: se lee como store externo (también sincroniza pestañas).
  const usuarioRaw = useSyncExternalStore(subscribeSession, getUsuarioRaw, () => null);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const usuario = useMemo(() => (usuarioRaw ? getUsuario() : null), [usuarioRaw]);

  useEffect(() => {
    const onSession = (e: Event) => {
      if ((e as CustomEvent<SessionChangeReason>).detail === "expired") {
        queryClient.clear();
        toast.error("Tu sesión expiró. Vuelve a iniciar sesión.");
        router.replace("/login");
      }
    };
    window.addEventListener(SESSION_EVENT, onSession);
    return () => window.removeEventListener(SESSION_EVENT, onSession);
  }, [queryClient, router]);

  const login = useCallback(async (data: LoginIn) => {
    const res = await authApi.login(data);
    queryClient.clear();
    saveSession(res, "login");
    return res.usuario;
  }, [queryClient]);

  const register = useCallback(async (data: RegisterIn) => {
    const res = await authApi.register(data);
    queryClient.clear();
    saveSession(res, "login");
    return res.usuario;
  }, [queryClient]);

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        // Aunque falle (token ya vencido, sin red), cerramos la sesión local.
      }
    }
    clearSession("logout");
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);

  const updateUsuario = useCallback((u: Usuario) => saveUsuario(u), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      status: !hydrated ? "loading" : usuario ? "authenticated" : "anonymous",
      login,
      register,
      logout,
      updateUsuario,
    }),
    [usuario, hydrated, login, register, logout, updateUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
