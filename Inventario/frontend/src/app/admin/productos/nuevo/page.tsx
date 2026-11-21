"use client";

import { ProductoForm } from "@/components/productos/producto-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NuevoProductoPage() {
  return (
    <>
      <PageHeader title="Nuevo producto" backHref="/admin/productos" />
      <ProductoForm />
    </>
  );
}
