import type { CampoError } from "@/types";

/** Error normalizado de la API: siempre trae status, code y detail. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly errors: CampoError[];

  constructor(status: number, code: string, detail: string, errors: CampoError[] = []) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.errors = errors;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Mensaje apto para mostrar al usuario, venga de donde venga el error. */
export function errorMessage(e: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (isApiError(e)) return e.detail || fallback;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/** Convierte el cuerpo de una respuesta fallida en ApiError. */
export async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // cuerpo vacío o no JSON
  }
  if (body && typeof body === "object") {
    const b = body as { detail?: unknown; code?: unknown; errors?: unknown };
    const detail = typeof b.detail === "string" ? b.detail : res.statusText || "Error";
    const code = typeof b.code === "string" ? b.code : `HTTP_${res.status}`;
    const errors = Array.isArray(b.errors) ? (b.errors as CampoError[]) : [];
    return new ApiError(res.status, code, detail, errors);
  }
  return new ApiError(res.status, `HTTP_${res.status}`, res.statusText || "Error de la API");
}

export const NETWORK_ERROR_CODE = "NETWORK_ERROR";
