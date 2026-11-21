"use client";

import { useParams } from "next/navigation";

/** Lee un parámetro numérico de la ruta (p. ej. [id]). Devuelve undefined si no es válido. */
export function useIdParam(name = "id"): number | undefined {
  const params = useParams<Record<string, string>>();
  const n = Number(params?.[name]);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}
