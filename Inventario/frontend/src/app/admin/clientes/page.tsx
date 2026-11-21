"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListState } from "@/hooks/use-list-state";
import { useClientes, useDeleteCliente, useSaveCliente } from "@/hooks/use-personas";
import { errorMessage } from "@/lib/api/errors";
import { applyApiErrors } from "@/lib/form-errors";
import { clienteSchema, vacioANull } from "@/lib/schemas";
import { TIPOS_DOCUMENTO, type Cliente } from "@/types";

type Values = z.infer<typeof clienteSchema>;
const FIELDS = ["tipo_documento", "documento", "nombre", "email", "telefono", "direccion", "usuario_id"] as const;

function ClienteForm({ cliente, onDone }: { cliente: Cliente | null; onDone: () => void }) {
  const save = useSaveCliente();
  const form = useForm<Values>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      tipo_documento: cliente?.tipo_documento ?? "CC",
      documento: cliente?.documento ?? "",
      nombre: cliente?.nombre ?? "",
      email: cliente?.email ?? "",
      telefono: cliente?.telefono ?? "",
      direccion: cliente?.direccion ?? "",
      usuario_id: cliente?.usuario_id ? String(cliente.usuario_id) : "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    const body = {
      tipo_documento: v.tipo_documento,
      documento: v.documento,
      nombre: v.nombre,
      email: vacioANull(v.email),
      telefono: vacioANull(v.telefono),
      direccion: vacioANull(v.direccion),
      // En edición, vacío = desvincular (usuario_id: null).
      usuario_id: v.usuario_id ? Number(v.usuario_id) : null,
    };
    try {
      await save.mutateAsync({ id: cliente?.id, body });
      toast.success(cliente ? "Cliente actualizado" : "Cliente creado");
      onDone();
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: FIELDS });
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
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
      <FormField label="Nombre" error={errors.nombre?.message} required>
        {(a) => <Input {...a} {...form.register("nombre")} />}
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        {(a) => <Input {...a} type="email" {...form.register("email")} />}
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Teléfono" error={errors.telefono?.message}>
          {(a) => <Input {...a} type="tel" {...form.register("telefono")} />}
        </FormField>
        <FormField label="ID de usuario vinculado" error={errors.usuario_id?.message} hint="Opcional. Vacío = sin usuario.">
          {(a) => <Input {...a} inputMode="numeric" {...form.register("usuario_id")} />}
        </FormField>
      </div>
      <FormField label="Dirección" error={errors.direccion?.message}>
        {(a) => <Input {...a} {...form.register("direccion")} />}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ClientesPage() {
  const ls = useListState({ activo: "true" as ActivoValue }, { sort: "nombre" });
  const q = useClientes({
    page: ls.page,
    size: ls.size,
    search: ls.search || undefined,
    sort: ls.sort,
    activo: activoParam(ls.filters.activo),
  });
  const eliminar = useDeleteCliente();
  const guardar = useSaveCliente();
  const [editando, setEditando] = useState<Cliente | "nuevo" | null>(null);
  const [aDesactivar, setADesactivar] = useState<Cliente | null>(null);

  return (
    <>
      <PageHeader
        title="Clientes"
        actions={
          <Button onClick={() => setEditando("nuevo")}>
            <PlusIcon aria-hidden /> Nuevo cliente
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="Documento, nombre o email…" />
        <ActivoFilter id="cl-activo" value={ls.filters.activo} onChange={(v) => ls.setFilter("activo", v)} />
      </div>
      <ListState query={q} empty={<EmptyState title="No hay clientes" />}>
        {(data) => (
          <>
            <div className="overflow-x-auto rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {c.tipo_documento} {c.documento}
                      </TableCell>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.email ?? "—"}
                        {c.telefono && <span className="block text-xs">{c.telefono}</span>}
                      </TableCell>
                      <TableCell>{c.usuario_id ? `#${c.usuario_id}` : "—"}</TableCell>
                      <TableCell>
                        <ActivoBadge activo={c.activo} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setEditando(c)}>
                            Editar
                          </Button>
                          {c.activo ? (
                            <Button variant="destructive" size="sm" onClick={() => setADesactivar(c)}>
                              Desactivar
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={guardar.isPending}
                              onClick={() =>
                                guardar.mutate(
                                  { id: c.id, body: { activo: true } },
                                  { onSuccess: () => toast.success("Cliente reactivado"), onError: (e) => toast.error(errorMessage(e)) },
                                )
                              }
                            >
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
        title={editando === "nuevo" ? "Nuevo cliente" : "Editar cliente"}
      >
        {editando !== null && (
          <ClienteForm
            key={editando === "nuevo" ? "nuevo" : editando.id}
            cliente={editando === "nuevo" ? null : editando}
            onDone={() => setEditando(null)}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!aDesactivar}
        onOpenChange={(o) => !o && setADesactivar(null)}
        title={`¿Desactivar a ${aDesactivar?.nombre ?? "este cliente"}?`}
        description="No podrá usarse en nuevas ventas. Su historial se conserva."
        confirmLabel="Desactivar"
        pending={eliminar.isPending}
        onConfirm={() =>
          aDesactivar &&
          eliminar.mutate(aDesactivar.id, {
            onSuccess: () => {
              toast.success("Cliente desactivado");
              setADesactivar(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </>
  );
}
