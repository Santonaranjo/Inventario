"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { VentaResumen } from "@/components/ventas/venta-resumen";
import { useIdParam } from "@/hooks/use-id-param";
import { useAnularVenta, useConfirmarVenta, useEliminarVenta, useFacturarVenta, useVenta } from "@/hooks/use-ventas";
import { errorMessage } from "@/lib/api/errors";

type Accion = "anular" | "eliminar" | null;

export default function VentaDetallePage() {
  const id = useIdParam();
  const router = useRouter();
  const q = useVenta(id);
  const confirmar = useConfirmarVenta();
  const anular = useAnularVenta();
  const eliminar = useEliminarVenta();
  const facturar = useFacturarVenta();
  const [accion, setAccion] = useState<Accion>(null);
  const [error, setError] = useState<string | null>(null);

  if (!id) return <ErrorState error={new Error("Venta inválida")} backHref="/admin/ventas" />;
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} backHref="/admin/ventas" />;
  const v = q.data;
  const ocupado = confirmar.isPending || anular.isPending || eliminar.isPending || facturar.isPending;
  const onError = (e: unknown) => {
    setError(errorMessage(e));
    toast.error(errorMessage(e));
  };

  return (
    <>
      <PageHeader
        title={`Venta #${v.id}`}
        backHref="/admin/ventas"
        actions={
          <>
            {v.estado === "PENDIENTE" && (
              <Button
                disabled={ocupado}
                onClick={() => {
                  setError(null);
                  confirmar.mutate(v.id, { onSuccess: () => toast.success("Venta confirmada (pagada)"), onError });
                }}
              >
                {confirmar.isPending ? "Confirmando…" : "Confirmar pago"}
              </Button>
            )}
            {v.estado === "PAGADA" && !v.factura_id && (
              <Button
                disabled={ocupado}
                onClick={() => {
                  setError(null);
                  facturar.mutate(v.id, {
                    onSuccess: (f) => {
                      toast.success(`Factura ${f.numero} generada`);
                      router.push(`/admin/facturas/${f.id}`);
                    },
                    onError,
                  });
                }}
              >
                {facturar.isPending ? "Generando…" : "Generar factura"}
              </Button>
            )}
            {v.factura_id && (
              <Link href={`/admin/facturas/${v.factura_id}`} className={buttonVariants({ variant: "outline" })}>
                Ver factura
              </Link>
            )}
            {v.estado !== "ANULADA" && (
              <Button variant="destructive" disabled={ocupado} onClick={() => setAccion("anular")}>
                Anular
              </Button>
            )}
            {v.estado === "PENDIENTE" && (
              <Button variant="ghost" disabled={ocupado} onClick={() => setAccion("eliminar")}>
                Eliminar
              </Button>
            )}
          </>
        }
      />
      {error && (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <VentaResumen venta={v} facturaHref={v.factura_id ? `/admin/facturas/${v.factura_id}` : undefined} />

      <ConfirmDialog
        open={accion === "anular"}
        onOpenChange={(o) => !o && setAccion(null)}
        title={`¿Anular la venta #${v.id}?`}
        description={
          v.estado === "PAGADA"
            ? "Se devolverá el stock de los productos y, si tiene factura, también quedará anulada. No se puede deshacer."
            : "La venta quedará ANULADA. No se puede deshacer."
        }
        confirmLabel="Anular venta"
        reason={{ label: "Motivo de la anulación", minLength: 3 }}
        pending={anular.isPending}
        onConfirm={(motivo) =>
          anular.mutate(
            { id: v.id, motivo: motivo ?? "" },
            {
              onSuccess: () => {
                toast.success("Venta anulada");
                setAccion(null);
              },
              onError: (e) => {
                setAccion(null);
                onError(e);
              },
            },
          )
        }
      />
      <ConfirmDialog
        open={accion === "eliminar"}
        onOpenChange={(o) => !o && setAccion(null)}
        title={`¿Eliminar la venta #${v.id}?`}
        description="Solo se eliminan ventas pendientes (no movieron stock). No se puede deshacer."
        confirmLabel="Eliminar"
        pending={eliminar.isPending}
        onConfirm={() =>
          eliminar.mutate(v.id, {
            onSuccess: () => {
              toast.success("Venta eliminada");
              router.replace("/admin/ventas");
            },
            onError: (e) => {
              setAccion(null);
              onError(e);
            },
          })
        }
      />
    </>
  );
}
