"use client";

import { PrinterIcon } from "lucide-react";
import Link from "next/link";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFactura } from "@/hooks/use-ventas";
import { formatDateTime } from "@/lib/format";
import { DetalleTable } from "./detalle-table";

/** Detalle imprimible de una factura (compartido por ADMIN y CLIENTE). */
export function FacturaView({ id, backHref, ventaHref }: { id: number; backHref: string; ventaHref: string }) {
  const q = useFactura(id);
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} backHref={backHref} />;
  const f = q.data;

  return (
    <>
      <PageHeader
        title={`Factura ${f.numero}`}
        backHref={backHref}
        actions={
          <Button onClick={() => window.print()}>
            <PrinterIcon aria-hidden /> Imprimir
          </Button>
        }
      />
      <Card className="print:shadow-none print:ring-0">
        <CardContent className="grid gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Inventario</p>
              <p className="text-sm text-muted-foreground">Factura de venta</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-base font-semibold">{f.numero}</p>
              <p>Emitida: {formatDateTime(f.fecha_emision)}</p>
              <p className="print:hidden">
                Venta{" "}
                <Link href={ventaHref} className="underline underline-offset-4">
                  #{f.venta_id}
                </Link>
              </p>
              {f.anulada && (
                <Badge variant="destructive" className="mt-1">
                  ANULADA {f.anulada_at ? `· ${formatDateTime(f.anulada_at)}` : ""}
                </Badge>
              )}
            </div>
          </div>

          <section aria-labelledby="factura-cliente" className="text-sm">
            <h2 id="factura-cliente" className="mb-1 font-medium">
              Cliente
            </h2>
            <p>{f.cliente.nombre}</p>
            <p className="text-muted-foreground">
              {f.cliente.tipo_documento} {f.cliente.documento}
              {f.cliente.email ? ` · ${f.cliente.email}` : ""}
            </p>
          </section>

          <DetalleTable detalles={f.detalles} />

          <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-1 text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right">
              <Money value={f.subtotal} />
            </dd>
            <dt className="text-muted-foreground">IVA ({Number(f.porcentaje_iva)} %)</dt>
            <dd className="text-right">
              <Money value={f.impuestos} />
            </dd>
            <dt className="border-t pt-1 font-semibold">Total</dt>
            <dd className="border-t pt-1 text-right font-semibold">
              <Money value={f.total} />
            </dd>
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
