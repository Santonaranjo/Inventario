"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ActivoFilter, activoParam, type ActivoValue } from "@/components/shared/activo-filter";
import { ActivoBadge, StockBadge } from "@/components/shared/badges";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Money } from "@/components/shared/money";
import { NativeSelect } from "@/components/shared/native-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ListState } from "@/components/shared/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCategoriasOpciones, useDeleteProducto, useProductos, useSaveProducto } from "@/hooks/use-catalogo";
import { useListState } from "@/hooks/use-list-state";
import { errorMessage } from "@/lib/api/errors";
import type { Producto } from "@/types";

export default function ProductosPage() {
  const categorias = useCategoriasOpciones();
  const ls = useListState({ categoria: "", activo: "true" as ActivoValue }, { sort: "nombre" });
  const q = useProductos({
    page: ls.page,
    size: ls.size,
    search: ls.search || undefined,
    sort: ls.sort,
    categoria_id: ls.filters.categoria ? Number(ls.filters.categoria) : undefined,
    activo: activoParam(ls.filters.activo),
  });
  const eliminar = useDeleteProducto();
  const guardar = useSaveProducto();
  const [aDesactivar, setADesactivar] = useState<Producto | null>(null);

  const reactivar = (p: Producto) =>
    guardar.mutate(
      { id: p.id, body: { activo: true } },
      { onSuccess: () => toast.success(`${p.nombre} reactivado`), onError: (e) => toast.error(errorMessage(e)) },
    );

  return (
    <>
      <PageHeader
        title="Productos"
        actions={
          <Link href="/admin/productos/nuevo" className={buttonVariants()}>
            <PlusIcon aria-hidden /> Nuevo producto
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="SKU, nombre o descripción…" />
        <div className="grid gap-1">
          <Label htmlFor="p-cat">Categoría</Label>
          <NativeSelect id="p-cat" value={ls.filters.categoria} onChange={(e) => ls.setFilter("categoria", e.target.value)}>
            <option value="">Todas</option>
            {categorias.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </NativeSelect>
        </div>
        <ActivoFilter id="p-activo" value={ls.filters.activo} onChange={(v) => ls.setFilter("activo", v)} />
        <div className="grid gap-1">
          <Label htmlFor="p-sort">Ordenar</Label>
          <NativeSelect id="p-sort" value={ls.sort} onChange={(e) => ls.setSort(e.target.value)}>
            <option value="nombre">Nombre</option>
            <option value="sku">SKU</option>
            <option value="-precio_venta">Mayor precio</option>
            <option value="precio_venta">Menor precio</option>
            <option value="-created_at">Más recientes</option>
          </NativeSelect>
        </div>
      </div>

      <ListState query={q} empty={<EmptyState title="No hay productos" description="Ajusta los filtros o crea uno nuevo." />}>
        {(data) => (
          <>
            <div className="overflow-x-auto rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell>{p.categoria?.nombre ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Money value={p.precio_venta} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={p.costo} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="mr-2 tabular-nums">{p.stock}</span>
                        <StockBadge stock={p.stock} minimo={p.stock_minimo} />
                      </TableCell>
                      <TableCell>
                        <ActivoBadge activo={p.activo} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/productos/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            Editar
                          </Link>
                          <Link href={`/admin/inventario/${p.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                            Kardex
                          </Link>
                          {p.activo ? (
                            <Button variant="destructive" size="sm" onClick={() => setADesactivar(p)}>
                              Desactivar
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => reactivar(p)} disabled={guardar.isPending}>
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

      <ConfirmDialog
        open={!!aDesactivar}
        onOpenChange={(o) => !o && setADesactivar(null)}
        title={`¿Desactivar ${aDesactivar?.nombre ?? "el producto"}?`}
        description="Dejará de mostrarse en la tienda. Puedes reactivarlo luego."
        confirmLabel="Desactivar"
        pending={eliminar.isPending}
        onConfirm={() =>
          aDesactivar &&
          eliminar.mutate(aDesactivar.id, {
            onSuccess: () => {
              toast.success("Producto desactivado");
              setADesactivar(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </>
  );
}
