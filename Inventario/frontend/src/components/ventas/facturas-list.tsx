"use client";

import Link from "next/link";
import { Money } from "@/components/shared/money";
import { NativeSelect } from "@/components/shared/native-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ListState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListState } from "@/hooks/use-list-state";
import { useFacturas } from "@/hooks/use-ventas";
import { formatDateTime } from "@/lib/format";

/** Listado de facturas. Para un CLIENTE la API ya filtra las suyas. */
export function FacturasList({ basePath, mostrarCliente }: { basePath: string; mostrarCliente: boolean }) {
  const ls = useListState({ anulada: "" as "" | "true" | "false" }, { sort: "-fecha_emision" });
  const q = useFacturas({
    page: ls.page,
    size: ls.size,
    search: ls.search || undefined,
    sort: ls.sort,
    anulada: ls.filters.anulada === "" ? undefined : ls.filters.anulada === "true",
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="Número o cliente…" />
        <div className="grid gap-1">
          <Label htmlFor="f-anulada">Estado</Label>
          <NativeSelect
            id="f-anulada"
            value={ls.filters.anulada}
            onChange={(e) => ls.setFilter("anulada", e.target.value as "" | "true" | "false")}
          >
            <option value="">Todas</option>
            <option value="false">Vigentes</option>
            <option value="true">Anuladas</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="f-sort">Ordenar</Label>
          <NativeSelect id="f-sort" value={ls.sort} onChange={(e) => ls.setSort(e.target.value)}>
            <option value="-fecha_emision">Más recientes</option>
            <option value="fecha_emision">Más antiguas</option>
            <option value="-total">Mayor total</option>
            <option value="total">Menor total</option>
          </NativeSelect>
        </div>
      </div>
      <ListState query={q} empty={<EmptyState title="No hay facturas" />}>
        {(data) => (
          <>
            <div className="rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    {mostrarCliente && <TableHead>Cliente</TableHead>}
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Link href={`${basePath}/${f.id}`} className="font-medium underline-offset-4 hover:underline">
                          {f.numero}
                        </Link>
                      </TableCell>
                      {mostrarCliente && <TableCell>{f.cliente.nombre}</TableCell>}
                      <TableCell>{formatDateTime(f.fecha_emision)}</TableCell>
                      <TableCell className="text-right">
                        <Money value={f.total} />
                      </TableCell>
                      <TableCell>
                        {f.anulada ? <Badge variant="destructive">Anulada</Badge> : <Badge variant="secondary">Vigente</Badge>}
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
    </>
  );
}
