"use client";

import { PageHeader } from "@/components/shared/page-header";
import { FacturasList } from "@/components/ventas/facturas-list";

export default function FacturasPage() {
  return (
    <>
      <PageHeader title="Facturas" description="Las facturas se generan desde el detalle de una venta pagada." />
      <FacturasList basePath="/admin/facturas" mostrarCliente />
    </>
  );
}
