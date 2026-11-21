"use client";

import { PageHeader } from "@/components/shared/page-header";
import { FacturasList } from "@/components/ventas/facturas-list";

export default function MisFacturasPage() {
  return (
    <>
      <PageHeader title="Mis facturas" />
      <FacturasList basePath="/tienda/facturas" mostrarCliente={false} />
    </>
  );
}
