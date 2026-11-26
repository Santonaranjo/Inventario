import { z } from "zod";
import { ROLES, TIPOS_DOCUMENTO, TIPOS_MOVIMIENTO } from "@/types";

// Validaciones de formulario alineadas con las restricciones del OpenAPI.
// Los campos numéricos se manejan como string en el formulario y se convierten al enviar.

const opcional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);
const documento = z
  .string()
  .trim()
  .min(3, "Mínimo 3 caracteres")
  .max(30, "Máximo 30 caracteres")
  .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones");
const password = z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres");
const nombre = z.string().trim().min(2, "Mínimo 2 caracteres").max(150, "Máximo 150 caracteres");
const emailOpcional = z.union([z.literal(""), z.email("Email inválido")]);
const monto = z
  .string()
  .trim()
  .min(1, "Requerido")
  .regex(/^\d+(\.\d{1,2})?$/, "Número positivo con máximo 2 decimales");
const entero = (msg = "Número entero mayor o igual a 0") => z.string().trim().regex(/^\d+$/, msg);

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Requerido"),
});

export const registerSchema = z
  .object({
    nombre,
    email: z.email("Email inválido"),
    tipo_documento: z.enum(TIPOS_DOCUMENTO),
    documento,
    telefono: opcional(30),
    direccion: opcional(255),
    password,
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, { path: ["confirmar"], message: "Las contraseñas no coinciden" });

export const perfilSchema = z.object({
  nombre,
  telefono: opcional(30),
  direccion: opcional(255),
});

export const passwordSchema = z
  .object({
    password_actual: z.string().min(1, "Requerido"),
    password_nuevo: password,
    confirmar: z.string(),
  })
  .refine((d) => d.password_nuevo === d.confirmar, { path: ["confirmar"], message: "Las contraseñas no coinciden" });

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  descripcion: opcional(255),
});

export const productoSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[A-Za-z0-9._-]+$/, "Solo letras, números, punto, guion y guion bajo"),
  nombre,
  descripcion: z.string().trim(),
  categoria_id: z.string(),
  precio_venta: monto,
  costo: monto,
  activo: z.boolean(),
  stock_minimo: entero(),
  stock_inicial: entero(),
});

export const movimientoSchema = z
  .object({
    tipo: z.enum(TIPOS_MOVIMIENTO),
    cantidad: z.string().trim(),
    stock_nuevo: z.string().trim(),
    motivo: z.string().trim().min(3, "Mínimo 3 caracteres").max(255, "Máximo 255 caracteres"),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "AJUSTE") {
      if (!/^\d+$/.test(d.stock_nuevo))
        ctx.addIssue({ code: "custom", path: ["stock_nuevo"], message: "Entero mayor o igual a 0" });
    } else if (!/^\d+$/.test(d.cantidad) || Number(d.cantidad) < 1) {
      ctx.addIssue({ code: "custom", path: ["cantidad"], message: "Entero mayor a 0" });
    }
  });

export const stockMinimoSchema = z.object({ stock_minimo: entero() });

export const clienteSchema = z.object({
  tipo_documento: z.enum(TIPOS_DOCUMENTO),
  documento,
  nombre,
  email: emailOpcional,
  telefono: opcional(30),
  direccion: opcional(255),
  usuario_id: z.string().trim().regex(/^\d*$/, "Debe ser un ID numérico"),
});

export const usuarioCreateSchema = z.object({
  email: z.email("Email inválido"),
  nombre,
  rol: z.enum(ROLES),
  password,
});

export const usuarioEditSchema = z.object({
  nombre,
  rol: z.enum(ROLES),
  activo: z.boolean(),
  password: z.union([z.literal(""), password]),
});

/** "" → null para campos opcionales al enviar. */
export const vacioANull = (v: string | undefined | null) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};
