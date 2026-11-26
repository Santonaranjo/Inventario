"use client";

import { ErrorState } from "@/components/shared/states";
import { FacturaView } from "@/components/ventas/factura-view";
import { useFactura } from "@/hooks/use-ventas";
import { useIdParam } from "@/hooks/use-id-param";

export default function MiFacturaPage() {
  const id = useIdParam();
  const q = useFactura(id);
  if (!id) return <ErrorState error={new Error("Factura inválida")} backHref="/tienda/facturas" />;
  return (
    <FacturaView
      id={id}
      backHref="/tienda/facturas"
      ventaHref={q.data ? `/tienda/compras/${q.data.venta_id}` : "/tienda/compras"}
    />
  );
}
