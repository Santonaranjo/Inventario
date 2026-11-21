"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { homeForRol } from "@/lib/api/session";
import { applyApiErrors } from "@/lib/form-errors";
import { registerSchema, vacioANull } from "@/lib/schemas";
import { TIPOS_DOCUMENTO } from "@/types";

type Values = z.infer<typeof registerSchema>;
const FIELDS = ["nombre", "email", "tipo_documento", "documento", "telefono", "direccion", "password"] as const;

export default function RegistroPage() {
  const { register: registrar } = useAuth();
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: "",
      email: "",
      tipo_documento: "CC",
      documento: "",
      telefono: "",
      direccion: "",
      password: "",
      confirmar: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const u = await registrar({
        nombre: v.nombre,
        email: v.email,
        tipo_documento: v.tipo_documento,
        documento: v.documento,
        telefono: vacioANull(v.telefono),
        direccion: vacioANull(v.direccion),
        password: v.password,
      });
      toast.success("¡Cuenta creada! Bienvenido.");
      router.replace(homeForRol(u.rol));
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: FIELDS, toRoot: true });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Regístrate como cliente para comprar en la tienda.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <FormField label="Nombre completo" error={errors.nombre?.message} required>
            {(a) => <Input {...a} autoComplete="name" {...form.register("nombre")} />}
          </FormField>
          <FormField label="Email" error={errors.email?.message} required>
            {(a) => <Input {...a} type="email" autoComplete="email" {...form.register("email")} />}
          </FormField>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <FormField label="Tipo" error={errors.tipo_documento?.message} required>
              {(a) => (
                <NativeSelect {...a} {...form.register("tipo_documento")}>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField label="Documento" error={errors.documento?.message} required>
              {(a) => <Input {...a} {...form.register("documento")} />}
            </FormField>
          </div>
          <FormField label="Teléfono" error={errors.telefono?.message}>
            {(a) => <Input {...a} type="tel" autoComplete="tel" {...form.register("telefono")} />}
          </FormField>
          <FormField label="Dirección" error={errors.direccion?.message}>
            {(a) => <Input {...a} autoComplete="street-address" {...form.register("direccion")} />}
          </FormField>
          <FormField label="Contraseña" error={errors.password?.message} hint="Entre 8 y 72 caracteres." required>
            {(a) => <Input {...a} type="password" autoComplete="new-password" {...form.register("password")} />}
          </FormField>
          <FormField label="Confirmar contraseña" error={errors.confirmar?.message} required>
            {(a) => <Input {...a} type="password" autoComplete="new-password" {...form.register("confirmar")} />}
          </FormField>
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
