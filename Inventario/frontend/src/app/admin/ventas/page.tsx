"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { VentasList } from "@/components/ventas/ventas-list";

export default function VentasPage() {
  return (
    <>
      <PageHeader
        title="Ventas"
        actions={
          <Link href="/admin/ventas/nueva" className={buttonVariants()}>
            <PlusIcon aria-hidden /> Nueva venta
          </Link>
        }
      />
      <VentasList basePath="/admin/ventas" admin />
    </>
  );
}
