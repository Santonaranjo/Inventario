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
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ListState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCategorias, useDeleteCategoria, useSaveCategoria } from "@/hooks/use-catalogo";
import { useListState } from "@/hooks/use-list-state";
import { errorMessage } from "@/lib/api/errors";
import { applyApiErrors } from "@/lib/form-errors";
import { categoriaSchema, vacioANull } from "@/lib/schemas";
import type { Categoria } from "@/types";

type Values = z.infer<typeof categoriaSchema>;

function CategoriaForm({ categoria, onDone }: { categoria: Categoria | null; onDone: () => void }) {
  const save = useSaveCategoria();
  const form = useForm<Values>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nombre: categoria?.nombre ?? "", descripcion: categoria?.descripcion ?? "" },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        id: categoria?.id,
        body: { nombre: v.nombre, descripcion: vacioANull(v.descripcion) },
      });
      toast.success(categoria ? "Categoría actualizada" : "Categoría creada");
      onDone();
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: ["nombre", "descripcion"], fieldMap: {} });
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormField label="Nombre" error={errors.nombre?.message} required>
        {(a) => <Input {...a} autoFocus {...form.register("nombre")} />}
      </FormField>
      <FormField label="Descripción" error={errors.descripcion?.message}>
        {(a) => <Textarea {...a} {...form.register("descripcion")} />}
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

export default function CategoriasPage() {
  const ls = useListState({ activo: "" as ActivoValue }, { sort: "nombre" });
  const q = useCategorias({
    page: ls.page,
    size: ls.size,
    search: ls.search || undefined,
    sort: ls.sort,
    activo: activoParam(ls.filters.activo),
  });
  const eliminar = useDeleteCategoria();
  const guardar = useSaveCategoria();
  const [editando, setEditando] = useState<Categoria | null | "nueva">(null);
  const [aDesactivar, setADesactivar] = useState<Categoria | null>(null);

  return (
    <>
      <PageHeader
        title="Categorías"
        actions={
          <Button onClick={() => setEditando("nueva")}>
            <PlusIcon aria-hidden /> Nueva categoría
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="Nombre…" />
        <ActivoFilter id="c-activo" value={ls.filters.activo} onChange={(v) => ls.setFilter("activo", v)} />
      </div>
      <ListState query={q} empty={<EmptyState title="No hay categorías" />}>
        {(data) => (
          <>
            <div className="overflow-x-auto rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">{c.descripcion || "—"}</TableCell>
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
                                  {
                                    onSuccess: () => toast.success("Categoría reactivada"),
                                    onError: (e) => toast.error(errorMessage(e)),
                                  },
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
        title={editando === "nueva" ? "Nueva categoría" : "Editar categoría"}
      >
        {editando !== null && (
          <CategoriaForm
            key={editando === "nueva" ? "nueva" : editando.id}
            categoria={editando === "nueva" ? null : editando}
            onDone={() => setEditando(null)}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!aDesactivar}
        onOpenChange={(o) => !o && setADesactivar(null)}
        title={`¿Desactivar la categoría ${aDesactivar?.nombre ?? ""}?`}
        description="No se mostrará a los clientes. Los productos conservan su categoría."
        confirmLabel="Desactivar"
        pending={eliminar.isPending}
        onConfirm={() =>
          aDesactivar &&
          eliminar.mutate(aDesactivar.id, {
            onSuccess: () => {
              toast.success("Categoría desactivada");
              setADesactivar(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </>
  );
}
