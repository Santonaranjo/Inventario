import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { errorMessage, isApiError } from "./api/errors";

/** Códigos de error de negocio que corresponden a un campo concreto del formulario. */
const CODE_FIELDS: Record<string, string> = {
  SKU_DUPLICADO: "sku",
  EMAIL_DUPLICADO: "email",
  DOCUMENTO_DUPLICADO: "documento",
  CATEGORIA_DUPLICADA: "nombre",
  PASSWORD_INCORRECTO: "password_actual",
  STOCK_INSUFICIENTE: "cantidad",
  AJUSTE_SIN_CAMBIO: "stock_nuevo",
};

/**
 * Lleva un error de la API al formulario:
 * - 422 VALIDATION_ERROR: marca cada `campo` en su input (si existe en el formulario).
 * - Códigos de negocio ligados a un campo (SKU_DUPLICADO → sku, …): marcan ese input si está en el formulario.
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
  const campo = isApiError(error) ? CODE_FIELDS[error.code] : undefined;
  if (campo && opts.fields?.includes(campo)) {
    setError(campo as Path<T>, { type: "server", message: msg }, { shouldFocus: true });
    return;
  }
  if (opts.toRoot) setError("root" as Path<T>, { type: "server", message: msg });
  else toast.error(msg);
}
