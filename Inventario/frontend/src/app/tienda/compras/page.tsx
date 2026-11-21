"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { VentasList } from "@/components/ventas/ventas-list";

export default function MisComprasPage() {
  return (
    <>
      <PageHeader title="Mis compras" description="Historial de tus compras." />
      <VentasList
        basePath="/tienda/compras"
        admin={false}
        emptyAction={
          <Link href="/tienda" className={buttonVariants({ className: "mt-2" })}>
            Ir al catálogo
          </Link>
        }
      />
    </>
  );
}
