"use client";

import Link from "next/link";
import { useState } from "react";
import { MovimientoDialog, StockMinimoDialog } from "@/components/inventario/inventario-dialogs";
import { StockBadge, TipoMovimientoBadge } from "@/components/shared/badges";
import { NativeSelect } from "@/components/shared/native-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState, ListState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIdParam } from "@/hooks/use-id-param";
import { useInventarioProducto, useMovimientos } from "@/hooks/use-inventario";
import { useListState } from "@/hooks/use-list-state";
import { dateInputToIso, formatDateTime } from "@/lib/format";
import { TIPOS_MOVIMIENTO, type TipoMovimiento } from "@/types";

export default function KardexPage() {
  const productoId = useIdParam("productoId");
  const inv = useInventarioProducto(productoId);
  const ls = useListState({ tipo: "" as TipoMovimiento | "", desde: "", hasta: "" });
  const movs = useMovimientos(
    {
      producto_id: productoId,
      page: ls.page,
      size: ls.size,
      tipo: ls.filters.tipo || undefined,
      fecha_desde: dateInputToIso(ls.filters.desde),
      fecha_hasta: dateInputToIso(ls.filters.hasta, true),
    },
    !!productoId,
  );
  const [movOpen, setMovOpen] = useState(false);
  const [minOpen, setMinOpen] = useState(false);

  if (!productoId) return <ErrorState error={new Error("Producto inválido")} backHref="/admin/inventario" />;
  if (inv.isPending) return <LoadingState />;
  if (inv.isError) return <ErrorState error={inv.error} onRetry={() => inv.refetch()} backHref="/admin/inventario" />;
  const i = inv.data;

  return (
    <>
      <PageHeader
        title={`Kardex · ${i.producto_nombre}`}
        description={<span className="font-mono">{i.sku}</span>}
        backHref="/admin/inventario"
        actions={
          <>
            <Button onClick={() => setMovOpen(true)}>Registrar movimiento</Button>
            <Button variant="outline" onClick={() => setMinOpen(true)}>
              Editar mínimo
            </Button>
          </>
        }
      />
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Stock actual</p>
            <p className="text-2xl font-semibold tabular-nums">{i.stock}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Stock mínimo</p>
            <p className="text-2xl font-semibold tabular-nums">{i.stock_minimo}</p>
          </div>
          <StockBadge stock={i.stock} minimo={i.stock_minimo} />
          <Link href={`/admin/productos/${i.producto_id}`} className="ml-auto text-sm underline underline-offset-4">
            Ver producto
          </Link>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-lg font-semibold">Movimientos</h2>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor="k-tipo">Tipo</Label>
          <NativeSelect id="k-tipo" value={ls.filters.tipo} onChange={(e) => ls.setFilter("tipo", e.target.value as TipoMovimiento | "")}>
            <option value="">Todos</option>
            {TIPOS_MOVIMIENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="k-desde">Desde</Label>
          <Input id="k-desde" type="date" value={ls.filters.desde} onChange={(e) => ls.setFilter("desde", e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="k-hasta">Hasta</Label>
          <Input id="k-hasta" type="date" value={ls.filters.hasta} onChange={(e) => ls.setFilter("hasta", e.target.value)} />
        </div>
      </div>
      <ListState query={movs} empty={<EmptyState title="Sin movimientos" />}>
        {(data) => (
          <>
            <div className="overflow-x-auto rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDateTime(m.fecha)}</TableCell>
                      <TableCell>
                        <TipoMovimientoBadge tipo={m.tipo} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.cantidad}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.stock_anterior} → {m.stock_nuevo}
                      </TableCell>
                      <TableCell>
                        {m.motivo}
                        {m.venta_id && (
                          <Link href={`/admin/ventas/${m.venta_id}`} className="ml-1 text-xs underline underline-offset-4">
                            (venta #{m.venta_id})
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>{m.usuario_nombre}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={ls.setPage} />
          </>
        )}
      </ListState>

      <MovimientoDialog producto={movOpen ? i : null} onClose={() => setMovOpen(false)} />
      <StockMinimoDialog producto={minOpen ? i : null} onClose={() => setMinOpen(false)} />
    </>
  );
}
