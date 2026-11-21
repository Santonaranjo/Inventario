"use client";

import { AlertTriangleIcon, ClockIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { EstadoVentaBadge, StockBadge } from "@/components/shared/badges";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlertas } from "@/hooks/use-inventario";
import { useVentas } from "@/hooks/use-ventas";
import { formatDateTime } from "@/lib/format";

export default function DashboardPage() {
  const alertas = useAlertas({ size: 5 });
  const recientes = useVentas({ size: 5, sort: "-created_at" });
  const pendientes = useVentas({ estado: "PENDIENTE", size: 1 });

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <Link href="/admin/ventas/nueva" className={buttonVariants()}>
            <PlusIcon aria-hidden /> Nueva venta
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <AlertTriangleIcon aria-hidden className="size-4" /> Productos en alerta
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {alertas.isPending ? "…" : alertas.isError ? "—" : alertas.data.total}
            </CardTitle>
            <CardAction>
              <Link href="/admin/alertas" className="text-sm underline underline-offset-4">
                Ver todas
              </Link>
            </CardAction>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <ClockIcon aria-hidden className="size-4" /> Ventas pendientes de pago
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {pendientes.isPending ? "…" : pendientes.isError ? "—" : pendientes.data.total}
            </CardTitle>
            <CardAction>
              <Link href="/admin/ventas" className="text-sm underline underline-offset-4">
                Ver ventas
              </Link>
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de stock</CardTitle>
            <CardDescription>Los más críticos primero</CardDescription>
          </CardHeader>
          <CardContent>
            {alertas.isPending ? (
              <LoadingState rows={3} />
            ) : alertas.isError ? (
              <ErrorState error={alertas.error} onRetry={() => alertas.refetch()} />
            ) : alertas.data.items.length === 0 ? (
              <EmptyState title="Sin alertas" />
            ) : (
              <ul className="divide-y">
                {alertas.data.items.map((a) => (
                  <li key={a.producto_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/admin/inventario/${a.producto_id}`} className="hover:underline">
                      <span className="font-medium">{a.producto_nombre}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{a.sku}</span>
                    </Link>
                    <span className="flex items-center gap-2 tabular-nums">
                      {a.stock} / {a.stock_minimo} <StockBadge stock={a.stock} minimo={a.stock_minimo} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recientes.isPending ? (
              <LoadingState rows={3} />
            ) : recientes.isError ? (
              <ErrorState error={recientes.error} onRetry={() => recientes.refetch()} />
            ) : recientes.data.items.length === 0 ? (
              <EmptyState title="Aún no hay ventas" />
            ) : (
              <ul className="divide-y">
                {recientes.data.items.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/admin/ventas/${v.id}`} className="hover:underline">
                      <span className="font-medium">
                        #{v.id} · {v.cliente.nombre}
                      </span>
                      <span className="block text-xs text-muted-foreground">{formatDateTime(v.created_at)}</span>
                    </Link>
                    <span className="flex items-center gap-2">
                      <Money value={v.total} /> <EstadoVentaBadge estado={v.estado} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
