import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { applyApiErrors } from "@/lib/form-errors";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("applyApiErrors", () => {
  it("marca cada campo de un 422", () => {
    const setError = vi.fn();
    const e = new ApiError(422, "VALIDATION_ERROR", "Datos inválidos", [{ campo: "email", mensaje: "inválido" }]);
    applyApiErrors(e, setError, { fields: ["email"] });
    expect(setError).toHaveBeenCalledWith("email", { type: "server", message: "inválido" });
  });

  it("lleva un código de negocio a su campo (SKU_DUPLICADO → sku)", () => {
    const setError = vi.fn();
    const e = new ApiError(409, "SKU_DUPLICADO", "Ya existe un producto con el SKU PAP-001");
    applyApiErrors(e, setError, { fields: ["sku", "nombre"] });
    expect(setError).toHaveBeenCalledWith(
      "sku",
      { type: "server", message: "Ya existe un producto con el SKU PAP-001" },
      { shouldFocus: true },
    );
  });

  it("si el campo no está en el formulario, usa root", () => {
    const setError = vi.fn();
    const e = new ApiError(409, "EMAIL_DUPLICADO", "El email ya está registrado");
    applyApiErrors(e, setError, { fields: ["nombre"], toRoot: true });
    expect(setError).toHaveBeenCalledWith("root", { type: "server", message: "El email ya está registrado" });
  });
});
