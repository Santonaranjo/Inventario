"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMe, useUpdateMe } from "@/hooks/use-auth-queries";
import { isApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { applyApiErrors } from "@/lib/form-errors";
import { passwordSchema, perfilSchema, vacioANull } from "@/lib/schemas";

type PerfilValues = z.infer<typeof perfilSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function PerfilPage() {
  const me = useMe();
  const update = useUpdateMe();

  const perfil = useForm<PerfilValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nombre: "", telefono: "", direccion: "" },
  });
  const pass = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password_actual: "", password_nuevo: "", confirmar: "" },
  });

  const data = me.data;
  useEffect(() => {
    if (data) {
      perfil.reset({
        nombre: data.nombre,
        telefono: data.cliente?.telefono ?? "",
        direccion: data.cliente?.direccion ?? "",
      });
    }
  }, [data, perfil]);

  if (me.isPending) return <LoadingState />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  const esCliente = me.data.rol === "CLIENTE";

  const guardarPerfil = perfil.handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        nombre: v.nombre,
        ...(esCliente && me.data.cliente
          ? { telefono: vacioANull(v.telefono), direccion: vacioANull(v.direccion) }
          : {}),
      });
      toast.success("Perfil actualizado");
    } catch (e) {
      applyApiErrors(e, perfil.setError, { fields: ["nombre", "telefono", "direccion"] });
    }
  });

  const cambiarPassword = pass.handleSubmit(async (v) => {
    try {
      await update.mutateAsync({ password_actual: v.password_actual, password_nuevo: v.password_nuevo });
      pass.reset();
      toast.success("Contraseña actualizada");
    } catch (e) {
      if (isApiError(e) && e.code === "PASSWORD_INCORRECTO") {
        pass.setError("password_actual", { message: e.detail });
      } else {
        applyApiErrors(e, pass.setError, { fields: ["password_actual", "password_nuevo"] });
      }
    }
  });

  return (
    <>
      <PageHeader title="Mi perfil" description="Consulta y actualiza tus datos." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              {me.data.email} <Badge variant="outline">{me.data.rol}</Badge>
              <span>· Desde {formatDate(me.data.created_at)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={guardarPerfil} noValidate className="grid gap-4">
              <FormField label="Nombre" error={perfil.formState.errors.nombre?.message} required>
                {(a) => <Input {...a} autoComplete="name" {...perfil.register("nombre")} />}
              </FormField>
              {esCliente && me.data.cliente && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Documento: {me.data.cliente.tipo_documento} {me.data.cliente.documento}
                  </p>
                  <FormField label="Teléfono" error={perfil.formState.errors.telefono?.message}>
                    {(a) => <Input {...a} type="tel" autoComplete="tel" {...perfil.register("telefono")} />}
                  </FormField>
                  <FormField label="Dirección" error={perfil.formState.errors.direccion?.message}>
                    {(a) => <Input {...a} autoComplete="street-address" {...perfil.register("direccion")} />}
                  </FormField>
                </>
              )}
              <div>
                <Button type="submit" disabled={perfil.formState.isSubmitting}>
                  {perfil.formState.isSubmitting ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
            <CardDescription>Necesitas tu contraseña actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={cambiarPassword} noValidate className="grid gap-4">
              <FormField label="Contraseña actual" error={pass.formState.errors.password_actual?.message} required>
                {(a) => <Input {...a} type="password" autoComplete="current-password" {...pass.register("password_actual")} />}
              </FormField>
              <FormField
                label="Contraseña nueva"
                error={pass.formState.errors.password_nuevo?.message}
                hint="Entre 8 y 72 caracteres."
                required
              >
                {(a) => <Input {...a} type="password" autoComplete="new-password" {...pass.register("password_nuevo")} />}
              </FormField>
              <FormField label="Confirmar contraseña nueva" error={pass.formState.errors.confirmar?.message} required>
                {(a) => <Input {...a} type="password" autoComplete="new-password" {...pass.register("confirmar")} />}
              </FormField>
              <div>
                <Button type="submit" disabled={pass.formState.isSubmitting}>
                  {pass.formState.isSubmitting ? "Actualizando…" : "Cambiar contraseña"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
