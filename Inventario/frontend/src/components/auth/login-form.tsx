"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { homeForRol } from "@/lib/api/session";
import { applyApiErrors } from "@/lib/form-errors";
import { loginSchema } from "@/lib/schemas";

type Values = z.infer<typeof loginSchema>;

/** Solo se permite volver a rutas internas del rol correcto. */
function safeNext(next: string | null, rol: string): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (rol === "ADMIN" && next.startsWith("/admin")) return next;
  if (rol === "CLIENTE" && next.startsWith("/tienda")) return next;
  if (next.startsWith("/perfil")) return next;
  return null;
}

export function LoginForm() {
  const { login, usuario, status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  // Si ya hay sesión, no mostrar el login.
  useEffect(() => {
    if (status === "authenticated" && usuario) router.replace(homeForRol(usuario.rol));
  }, [status, usuario, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const u = await login(values);
      router.replace(safeNext(params.get("next"), u.rol) ?? homeForRol(u.rol));
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: ["email", "password"], toRoot: true });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Ingresa con tu email y contraseña.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <FormField label="Email" error={errors.email?.message} required>
            {(a) => <Input {...a} type="email" autoComplete="email" autoFocus {...form.register("email")} />}
          </FormField>
          <FormField label="Contraseña" error={errors.password?.message} required>
            {(a) => <Input {...a} type="password" autoComplete="current-password" {...form.register("password")} />}
          </FormField>
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-medium text-foreground underline underline-offset-4">
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
