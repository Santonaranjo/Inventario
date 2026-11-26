"use client";

import { ProductoForm } from "@/components/productos/producto-form";
import { ActivoBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { useProducto } from "@/hooks/use-catalogo";
import { useIdParam } from "@/hooks/use-id-param";

export default function EditarProductoPage() {
  const id = useIdParam();
  const q = useProducto(id);
  if (!id) return <ErrorState error={new Error("Producto inválido")} backHref="/admin/productos" />;
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} backHref="/admin/productos" />;
  return (
    <>
      <PageHeader
        title={`Editar ${q.data.nombre}`}
        description={<ActivoBadge activo={q.data.activo} />}
        backHref="/admin/productos"
      />
      {/* key: reinicia el formulario si cambian los datos del servidor */}
      <ProductoForm key={q.data.updated_at} producto={q.data} />
    </>
  );
}
