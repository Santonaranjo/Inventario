import type { TokenOut } from "@/types";
import { ApiError, NETWORK_ERROR_CODE, toApiError } from "./errors";
import { clearSession, getAccessToken, getRefreshToken, saveSession } from "./session";

/**
 * Único cliente HTTP de la app. Ningún componente debe llamar a fetch directamente.
 *
 * - Agrega `Authorization: Bearer <access_token>`.
 * - Si la API responde 401 con code TOKEN_EXPIRADO, renueva el par de tokens UNA vez
 *   (single flight: si varios requests fallan a la vez, todos esperan el mismo refresh)
 *   y reintenta el request una sola vez.
 * - Los errores se lanzan como ApiError { status, code, detail, errors }.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(
  /\/+$/,
  "",
);

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** false = no enviar Authorization ni intentar refresh (login, register, refresh, logout). */
  auth?: boolean;
  signal?: AbortSignal;
}

export function buildUrl(path: string, query?: Query): string {
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  let res: Response;
  try {
    res = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // Sin red: no borramos la sesión, el request original fallará con NETWORK_ERROR.
    return false;
  }
  if (!res.ok) {
    clearSession("expired");
    return false;
  }
  const data = (await res.json()) as TokenOut;
  saveSession(data, "refresh");
  return true;
}

/** Renueva los tokens. Llamadas concurrentes comparten la misma promesa (single flight). */
export function refreshSession(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, options, true);
}

async function send<T>(path: string, options: RequestOptions, canRetry: boolean): Promise<T> {
  const { method = "GET", body, query, auth = true, signal } = options;
  const tokenUsado = auth ? getAccessToken() : null;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (tokenUsado) headers.Authorization = `Bearer ${tokenUsado}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, NETWORK_ERROR_CODE, "No se pudo conectar con el servidor. Revisa tu conexión.");
  }

  if (res.status === 401 && auth && canRetry) {
    const error = await toApiError(res);
    if (error.code === "TOKEN_EXPIRADO") {
      // Si otro request ya renovó el token mientras este viajaba, basta con reintentar.
      const actual = getAccessToken();
      const renovado = actual !== null && actual !== tokenUsado ? true : await refreshSession();
      if (renovado) return send<T>(path, options, false);
    } else if (error.code === "TOKEN_REVOCADO" || error.code === "TOKEN_INVALIDO") {
      clearSession("expired");
    }
    throw error;
  }

  if (!res.ok) {
    const error = await toApiError(res);
    if (res.status === 401 && auth && (error.code === "TOKEN_REVOCADO" || error.code === "TOKEN_EXPIRADO" || error.code === "TOKEN_INVALIDO")) {
      clearSession("expired");
    }
    throw error;
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Atajos tipados. */
export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    apiRequest<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, "method" | "body"> = {}) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T = void>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
