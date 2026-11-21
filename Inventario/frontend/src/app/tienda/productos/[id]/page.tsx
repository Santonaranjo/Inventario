"use client";

import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/components/providers/cart-provider";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducto } from "@/hooks/use-catalogo";
import { useIdParam } from "@/hooks/use-id-param";

export default function ProductoDetallePage() {
  const id = useIdParam();
  const q = useProducto(id);
  const { add, items } = useCart();
  const [cantidad, setCantidad] = useState(1);

  if (!id) return <ErrorState error={new Error("Producto inválido")} backHref="/tienda" />;
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} backHref="/tienda" />;
  const p = q.data;
  const enCarrito = items.find((i) => i.producto_id === p.id)?.cantidad ?? 0;
  const maxAgregable = Math.max(0, p.stock - enCarrito);

  return (
    <>
      <PageHeader title={p.nombre} description={<span className="font-mono">{p.sku}</span>} backHref="/tienda" />
      <Card>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {p.categoria && <Badge variant="outline">{p.categoria.nombre}</Badge>}
            <Badge variant={p.stock > 0 ? "secondary" : "destructive"}>
              {p.stock > 0 ? `${p.stock} disponibles` : "Agotado"}
            </Badge>
          </div>
          <Money value={p.precio_venta} className="text-3xl font-semibold tabular-nums" />
          <p className="text-muted-foreground">{p.descripcion || "Sin descripción."}</p>

          {maxAgregable > 0 ? (
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Math.min(Math.max(1, cantidad), maxAgregable);
                add(p, n);
                setCantidad(1);
                toast.success(`${n} × ${p.nombre} agregado al carrito`);
              }}
            >
              <div className="grid gap-1">
                <Label htmlFor="cantidad">Cantidad</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min={1}
                  max={maxAgregable}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <Button type="submit">
                <ShoppingCartIcon aria-hidden /> Agregar al carrito
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              {p.stock <= 0 ? "Este producto no tiene unidades disponibles." : "Ya tienes en el carrito todas las unidades disponibles."}
            </p>
          )}
          {enCarrito > 0 && (
            <Link href="/tienda/carrito" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
              Ver carrito ({enCarrito} de este producto)
            </Link>
          )}
        </CardContent>
      </Card>
    </>
  );
}
