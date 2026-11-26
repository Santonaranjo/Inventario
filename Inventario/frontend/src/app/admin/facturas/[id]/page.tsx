"use client";

import { ErrorState } from "@/components/shared/states";
import { FacturaView } from "@/components/ventas/factura-view";
import { useIdParam } from "@/hooks/use-id-param";
import { useFactura } from "@/hooks/use-ventas";

export default function FacturaAdminPage() {
  const id = useIdParam();
  const q = useFactura(id);
  if (!id) return <ErrorState error={new Error("Factura inválida")} backHref="/admin/facturas" />;
  return (
    <FacturaView
      id={id}
      backHref="/admin/facturas"
      ventaHref={q.data ? `/admin/ventas/${q.data.venta_id}` : "/admin/ventas"}
    />
  );
}
