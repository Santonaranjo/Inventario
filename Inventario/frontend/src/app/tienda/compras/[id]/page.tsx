"use client";

import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { VentaResumen } from "@/components/ventas/venta-resumen";
import { useIdParam } from "@/hooks/use-id-param";
import { useConfirmarVenta, useVenta } from "@/hooks/use-ventas";
import { errorMessage } from "@/lib/api/errors";

export default function CompraDetallePage() {
  const id = useIdParam();
  const q = useVenta(id);
  const confirmar = useConfirmarVenta();

  if (!id) return <ErrorState error={new Error("Compra inválida")} backHref="/tienda/compras" />;
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} backHref="/tienda/compras" />;
  const v = q.data;

  const pagar = () =>
    confirmar.mutate(v.id, {
      onSuccess: () => toast.success("¡Pago confirmado!"),
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <>
      <PageHeader
        title={`Compra #${v.id}`}
        backHref="/tienda/compras"
        actions={
          v.estado === "PENDIENTE" && (
            <Button onClick={pagar} disabled={confirmar.isPending}>
              {confirmar.isPending ? "Confirmando…" : "Confirmar pago"}
            </Button>
          )
        }
      />
      {v.estado === "PENDIENTE" && (
        <Alert className="mb-4">
          <AlertDescription>
            Esta compra está pendiente de pago. Al confirmarla se descuenta el stock; si algún producto ya no
            alcanza, te avisaremos.
          </AlertDescription>
        </Alert>
      )}
      {confirmar.isError && (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertDescription>{errorMessage(confirmar.error)}</AlertDescription>
        </Alert>
      )}
      <VentaResumen venta={v} facturaHref={v.factura_id ? `/tienda/facturas/${v.factura_id}` : undefined} />
    </>
  );
}
