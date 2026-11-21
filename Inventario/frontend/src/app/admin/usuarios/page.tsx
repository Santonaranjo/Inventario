"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { ActivoFilter, activoParam, type ActivoValue } from "@/components/shared/activo-filter";
import { ActivoBadge } from "@/components/shared/badges";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ListState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListState } from "@/hooks/use-list-state";
import { useDeleteUsuario, useSaveUsuario, useUsuarios } from "@/hooks/use-personas";
import { errorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { applyApiErrors } from "@/lib/form-errors";
import { usuarioCreateSchema, usuarioEditSchema } from "@/lib/schemas";
import { ROLES, type RolUsuario, type Usuario } from "@/types";

type CreateValues = z.infer<typeof usuarioCreateSchema>;
type EditValues = z.infer<typeof usuarioEditSchema>;

function RolSelect(props: React.ComponentProps<typeof NativeSelect>) {
  return (
    <NativeSelect {...props}>
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </NativeSelect>
  );
}

function FormActions({ onCancel, submitting }: { onCancel: () => void; submitting: boolean }) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Guardando…" : "Guardar"}
      </Button>
    </DialogFooter>
  );
}

function CrearUsuarioForm({ onDone }: { onDone: () => void }) {
  const save = useSaveUsuario();
  const form = useForm<CreateValues>({
    resolver: zodResolver(usuarioCreateSchema),
    defaultValues: { email: "", nombre: "", rol: "ADMIN", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ body: v });
      toast.success("Usuario creado");
      onDone();
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: ["email", "nombre", "rol", "password"] });
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormField label="Email" error={errors.email?.message} required>
        {(a) => <Input {...a} type="email" autoComplete="off" {...form.register("email")} />}
      </FormField>
      <FormField label="Nombre" error={errors.nombre?.message} required>
        {(a) => <Input {...a} {...form.register("nombre")} />}
      </FormField>
      <FormField label="Rol" error={errors.rol?.message} hint="Los clientes normalmente se registran solos." required>
        {(a) => <RolSelect {...a} {...form.register("rol")} />}
      </FormField>
      <FormField label="Contraseña" error={errors.password?.message} hint="Entre 8 y 72 caracteres." required>
        {(a) => <Input {...a} type="password" autoComplete="new-password" {...form.register("password")} />}
      </FormField>
      <FormActions onCancel={onDone} submitting={isSubmitting} />
    </form>
  );
}

function EditarUsuarioForm({ usuario, esYo, onDone }: { usuario: Usuario; esYo: boolean; onDone: () => void }) {
  const save = useSaveUsuario();
  const form = useForm<EditValues>({
    resolver: zodResolver(usuarioEditSchema),
    defaultValues: { nombre: usuario.nombre, rol: usuario.rol, activo: usuario.activo, password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        id: usuario.id,
        body: {
          nombre: v.nombre,
          // Un admin no puede quitarse el rol ni desactivarse: no enviamos esos campos sobre sí mismo.
          ...(esYo ? {} : { rol: v.rol, activo: v.activo }),
          ...(v.password ? { password: v.password } : {}),
        },
      });
      toast.success("Usuario actualizado");
      onDone();
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: ["nombre", "rol", "activo", "password"] });
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <p className="text-sm text-muted-foreground">{usuario.email}</p>
      <FormField label="Nombre" error={errors.nombre?.message} required>
        {(a) => <Input {...a} {...form.register("nombre")} />}
      </FormField>
      <FormField label="Rol" error={errors.rol?.message} hint={esYo ? "No puedes cambiar tu propio rol." : undefined}>
        {(a) => <RolSelect {...a} disabled={esYo} {...form.register("rol")} />}
      </FormField>
      <div className="flex items-center gap-2">
        <input id="u-activo" type="checkbox" className="size-4 accent-primary" disabled={esYo} {...form.register("activo")} />
        <Label htmlFor="u-activo">Activo</Label>
      </div>
      <FormField label="Nueva contraseña" error={errors.password?.message} hint="Déjala vacía para no cambiarla.">
        {(a) => <Input {...a} type="password" autoComplete="new-password" {...form.register("password")} />}
      </FormField>
      <FormActions onCancel={onDone} submitting={isSubmitting} />
    </form>
  );
}

export default function UsuariosPage() {
  const { usuario: yo } = useAuth();
  const ls = useListState({ rol: "" as RolUsuario | "", activo: "" as ActivoValue }, { sort: "nombre" });
  const q = useUsuarios({
    page: ls.page,
    size: ls.size,
    search: ls.search || undefined,
    sort: ls.sort,
    rol: ls.filters.rol || undefined,
    activo: activoParam(ls.filters.activo),
  });
  const eliminar = useDeleteUsuario();
  const [editando, setEditando] = useState<Usuario | "nuevo" | null>(null);
  const [aDesactivar, setADesactivar] = useState<Usuario | null>(null);

  return (
    <>
      <PageHeader
        title="Usuarios"
        actions={
          <Button onClick={() => setEditando("nuevo")}>
            <PlusIcon aria-hidden /> Nuevo usuario
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="Email o nombre…" />
        <div className="grid gap-1">
          <Label htmlFor="u-rol">Rol</Label>
          <NativeSelect id="u-rol" value={ls.filters.rol} onChange={(e) => ls.setFilter("rol", e.target.value as RolUsuario | "")}>
            <option value="">Todos</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
        </div>
        <ActivoFilter id="u-activo-f" value={ls.filters.activo} onChange={(v) => ls.setFilter("activo", v)} />
      </div>
      <ListState query={q} empty={<EmptyState title="No hay usuarios" />}>
        {(data) => (
          <>
            <div className="overflow-x-auto rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((u) => {
                    const esYo = u.id === yo?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.nombre}
                          {esYo && (
                            <Badge variant="outline" className="ml-2">
                              Tú
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.rol === "ADMIN" ? "default" : "secondary"}>{u.rol}</Badge>
                        </TableCell>
                        <TableCell>
                          <ActivoBadge activo={u.activo} />
                        </TableCell>
                        <TableCell>{formatDate(u.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => setEditando(u)}>
                              Editar
                            </Button>
                            {u.activo && !esYo && (
                              <Button variant="destructive" size="sm" onClick={() => setADesactivar(u)}>
                                Desactivar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={ls.setPage} />
          </>
        )}
      </ListState>

      <FormDialog
        open={editando !== null}
        onOpenChange={(o) => !o && setEditando(null)}
        title={editando === "nuevo" ? "Nuevo usuario" : "Editar usuario"}
      >
        {editando === "nuevo" && <CrearUsuarioForm onDone={() => setEditando(null)} />}
        {editando !== null && editando !== "nuevo" && (
          <EditarUsuarioForm key={editando.id} usuario={editando} esYo={editando.id === yo?.id} onDone={() => setEditando(null)} />
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!aDesactivar}
        onOpenChange={(o) => !o && setADesactivar(null)}
        title={`¿Desactivar a ${aDesactivar?.nombre ?? "este usuario"}?`}
        description="No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Puedes reactivarlo editándolo."
        confirmLabel="Desactivar"
        pending={eliminar.isPending}
        onConfirm={() =>
          aDesactivar &&
          eliminar.mutate(aDesactivar.id, {
            onSuccess: () => {
              toast.success("Usuario desactivado");
              setADesactivar(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </>
  );
}
