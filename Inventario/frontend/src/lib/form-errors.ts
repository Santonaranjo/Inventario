import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { errorMessage, isApiError } from "./api/errors";

/**
 * Lleva un error de la API al formulario:
 * - 422 VALIDATION_ERROR: marca cada `campo` en su input (si existe en el formulario).
 * - Otros: muestra `detail` en un toast (o en `root` si se pide).
 *
 * `fieldMap` permite traducir nombres del backend a nombres del formulario.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  opts: { fields?: readonly string[]; fieldMap?: Record<string, string>; toRoot?: boolean } = {},
): void {
  if (isApiError(error) && error.code === "VALIDATION_ERROR" && error.errors.length > 0) {
    const sinCampo: string[] = [];
    for (const { campo, mensaje } of error.errors) {
      const name = opts.fieldMap?.[campo] ?? campo;
      if (!opts.fields || opts.fields.includes(name)) {
        setError(name as Path<T>, { type: "server", message: mensaje });
      } else {
        sinCampo.push(`${campo}: ${mensaje}`);
      }
    }
    if (sinCampo.length) toast.error(sinCampo.join("\n"));
    return;
  }
  const msg = errorMessage(error);
  if (opts.toRoot) setError("root" as Path<T>, { type: "server", message: msg });
  else toast.error(msg);
}
