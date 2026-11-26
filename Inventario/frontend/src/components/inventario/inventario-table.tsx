"use client";

import Link from "next/link";
import { useState } from "react";
import { StockBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { Inventario } from "@/types";
import { MovimientoDialog, StockMinimoDialog, type ProductoStock } from "./inventario-dialogs";

/** Tabla de stock con acciones: movimiento, editar mínimo y kardex. */
export function InventarioTable({ items }: { items: Inventario[] }) {
  const [mov, setMov] = useState<ProductoStock | null>(null);
  const [min, setMin] = useState<ProductoStock | null>(null);
  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.producto_id}>
                <TableCell className="font-mono text-xs">{i.sku}</TableCell>
                <TableCell className="font-medium">
                  {i.producto_nombre}
                  {!i.producto_activo && (
                    <Badge variant="outline" className="ml-2">
                      Inactivo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{i.stock}</TableCell>
                <TableCell className="text-right tabular-nums">{i.stock_minimo}</TableCell>
                <TableCell>
                  <StockBadge stock={i.stock} minimo={i.stock_minimo} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(i.updated_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" onClick={() => setMov(i)}>
                      Movimiento
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setMin(i)}>
                      Mínimo
                    </Button>
                    <Link href={`/admin/inventario/${i.producto_id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                      Kardex
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <MovimientoDialog producto={mov} onClose={() => setMov(null)} />
      <StockMinimoDialog producto={min} onClose={() => setMin(null)} />
    </>
  );
}
