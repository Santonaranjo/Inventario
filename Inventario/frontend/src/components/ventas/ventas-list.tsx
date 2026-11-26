"use client";

import Link from "next/link";
import { EstadoVentaBadge } from "@/components/shared/badges";
import { Money } from "@/components/shared/money";
import { NativeSelect } from "@/components/shared/native-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ListState } from "@/components/shared/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListState } from "@/hooks/use-list-state";
import { useVentas } from "@/hooks/use-ventas";
import { dateInputToIso, formatDateTime } from "@/lib/format";
import { ESTADOS_VENTA, type EstadoVenta } from "@/types";

/** Listado de ventas. ADMIN ve todas (con búsqueda por cliente); CLIENTE solo las suyas. */
export function VentasList({ basePath, admin, emptyAction }: { basePath: string; admin: boolean; emptyAction?: React.ReactNode }) {
  const ls = useListState(
    { estado: "" as EstadoVenta | "", desde: "", hasta: "" },
    { sort: "-created_at" },
  );
  const q = useVentas({
    page: ls.page,
    size: ls.size,
    search: admin ? ls.search || undefined : undefined,
    sort: ls.sort,
    estado: ls.filters.estado || undefined,
    fecha_desde: dateInputToIso(ls.filters.desde),
    fecha_hasta: dateInputToIso(ls.filters.hasta, true),
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {admin && (
          <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="Nombre o documento del cliente…" />
        )}
        <div className="grid gap-1">
          <Label htmlFor="v-estado">Estado</Label>
          <NativeSelect
            id="v-estado"
            value={ls.filters.estado}
            onChange={(e) => ls.setFilter("estado", e.target.value as EstadoVenta | "")}
          >
            <option value="">Todos</option>
            {ESTADOS_VENTA.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="v-desde">Desde</Label>
          <Input id="v-desde" type="date" value={ls.filters.desde} onChange={(e) => ls.setFilter("desde", e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="v-hasta">Hasta</Label>
          <Input id="v-hasta" type="date" value={ls.filters.hasta} onChange={(e) => ls.setFilter("hasta", e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="v-sort">Ordenar</Label>
          <NativeSelect id="v-sort" value={ls.sort} onChange={(e) => ls.setSort(e.target.value)}>
            <option value="-created_at">Más recientes</option>
            <option value="created_at">Más antiguas</option>
            <option value="-total">Mayor total</option>
            <option value="total">Menor total</option>
          </NativeSelect>
        </div>
      </div>
      <ListState query={q} empty={<EmptyState title="No hay ventas" action={emptyAction} />}>
        {(data) => (
          <>
            <div className="rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    {admin && <TableHead>Cliente</TableHead>}
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Factura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Link href={`${basePath}/${v.id}`} className="font-medium underline-offset-4 hover:underline">
                          Venta #{v.id}
                        </Link>
                      </TableCell>
                      {admin && (
                        <TableCell>
                          {v.cliente.nombre}
                          <span className="block text-xs text-muted-foreground">{v.cliente.documento}</span>
                        </TableCell>
                      )}
                      <TableCell>{formatDateTime(v.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Money value={v.total} />
                      </TableCell>
                      <TableCell>
                        <EstadoVentaBadge estado={v.estado} />
                      </TableCell>
                      <TableCell>{v.numero_factura ?? "—"}</TableCell>
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
