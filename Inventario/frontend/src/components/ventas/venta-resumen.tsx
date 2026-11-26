import Link from "next/link";
import { EstadoVentaBadge } from "@/components/shared/badges";
import { Money } from "@/components/shared/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { Venta } from "@/types";
import { DetalleTable } from "./detalle-table";

/** Información de una venta: cliente, fechas, líneas y total (sin IVA). */
export function VentaResumen({ venta, facturaHref }: { venta: Venta; facturaHref?: string }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Venta #{venta.id} <EstadoVentaBadge estado={venta.estado} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd>
                {venta.cliente.nombre} · {venta.cliente.tipo_documento} {venta.cliente.documento}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creada</dt>
              <dd>{formatDateTime(venta.created_at)}</dd>
            </div>
            {venta.pagada_at && (
              <div>
                <dt className="text-muted-foreground">Pagada</dt>
                <dd>{formatDateTime(venta.pagada_at)}</dd>
              </div>
            )}
            {venta.anulada_at && (
              <div>
                <dt className="text-muted-foreground">Anulada</dt>
                <dd>
                  {formatDateTime(venta.anulada_at)}
                  {venta.motivo_anulacion ? ` · ${venta.motivo_anulacion}` : ""}
                </dd>
              </div>
            )}
            {venta.numero_factura && (
              <div>
                <dt className="text-muted-foreground">Factura</dt>
                <dd>
                  {facturaHref ? (
                    <Link href={facturaHref} className="underline underline-offset-4">
                      {venta.numero_factura}
                    </Link>
                  ) : (
                    venta.numero_factura
                  )}
                </dd>
              </div>
            )}
            {venta.observaciones && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Observaciones</dt>
                <dd>{venta.observaciones}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid gap-3">
          <DetalleTable detalles={venta.detalles} />
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Total (sin IVA)</span>
            <Money value={venta.total} className="text-lg font-semibold tabular-nums" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
