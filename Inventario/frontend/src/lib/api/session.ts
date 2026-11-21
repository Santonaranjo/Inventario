import type { TokenOut, Usuario } from "@/types";

// Sesión guardada en localStorage (decisión del handoff; ver PENDIENTES.md).
const KEYS = {
  access: "inv.access_token",
  refresh: "inv.refresh_token",
  usuario: "inv.usuario",
} as const;

/** Evento que se dispara cuando la sesión cambia (login, refresh, logout, expiración). */
export const SESSION_EVENT = "inv:session";
export type SessionChangeReason = "login" | "refresh" | "logout" | "expired" | "update";

const isBrowser = () => typeof window !== "undefined";

function emit(reason: SessionChangeReason) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: reason }));
}

export function getAccessToken(): string | null {
  return isBrowser() ? localStorage.getItem(KEYS.access) : null;
}

export function getRefreshToken(): string | null {
  return isBrowser() ? localStorage.getItem(KEYS.refresh) : null;
}

/** Valor crudo (string) del usuario: snapshot estable para useSyncExternalStore. */
export function getUsuarioRaw(): string | null {
  return isBrowser() ? localStorage.getItem(KEYS.usuario) : null;
}

/** Suscripción a cambios de sesión en esta pestaña (evento propio) y en otras (storage). */
export function subscribeSession(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith("inv.")) listener();
  };
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getUsuario(): Usuario | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(KEYS.usuario);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export function saveSession(data: TokenOut, reason: SessionChangeReason = "login") {
  localStorage.setItem(KEYS.access, data.access_token);
  localStorage.setItem(KEYS.refresh, data.refresh_token);
  localStorage.setItem(KEYS.usuario, JSON.stringify(data.usuario));
  emit(reason);
}

export function saveUsuario(usuario: Usuario) {
  localStorage.setItem(KEYS.usuario, JSON.stringify(usuario));
  emit("update");
}

export function clearSession(reason: SessionChangeReason = "logout") {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.access);
  localStorage.removeItem(KEYS.refresh);
  localStorage.removeItem(KEYS.usuario);
  emit(reason);
}

export function homeForRol(rol: Usuario["rol"] | undefined | null): string {
  return rol === "ADMIN" ? "/admin" : "/tienda";
}
