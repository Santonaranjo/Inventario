"use client";

import { Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/components/providers/cart-provider";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { esStockInsuficiente, useCheckout } from "@/hooks/use-ventas";
import { errorMessage } from "@/lib/api/errors";

interface Problema {
  detail: string;
  /** Venta que quedó PENDIENTE (si alcanzó a crearse). */
  ventaId: number | null;
}

export default function CarritoPage() {
  const { items, setCantidad, remove, clear, totalEstimado } = useCart();
  const checkout = useCheckout();
  const router = useRouter();
  const [observaciones, setObservaciones] = useState("");
  const [problema, setProblema] = useState<Problema | null>(null);

  const pagar = async () => {
    setProblema(null);
    const r = await checkout.mutateAsync({
      items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
      observaciones: observaciones.trim() || null,
    });
    if (r.ok) {
      clear();
      toast.success(`¡Compra realizada! Venta #${r.venta.id} pagada.`);
      router.push(`/tienda/compras/${r.venta.id}`);
      return;
    }
    if (r.venta) {
      // Se creó pero no se pudo confirmar: la venta queda PENDIENTE.
      setProblema({ detail: errorMessage(r.error), ventaId: r.venta.id });
      if (!esStockInsuficiente(r.error)) toast.error(errorMessage(r.error));
    } else {
      setProblema({ detail: errorMessage(r.error), ventaId: null });
    }
  };

  if (items.length === 0 && !problema) {
    return (
      <>
        <PageHeader title="Carrito" />
        <EmptyState
          title="Tu carrito está vacío"
          description="Agrega productos desde el catálogo."
          action={
            <Link href="/tienda" className={buttonVariants({ className: "mt-2" })}>
              Ir al catálogo
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Carrito" description="Revisa tu pedido antes de pagar." />
      {problema && (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertTitle>No se pudo completar el pago</AlertTitle>
          <AlertDescription>
            <p>{problema.detail}</p>
            {problema.ventaId && (
              <p className="mt-1">
                La venta #{problema.ventaId} quedó <strong>PENDIENTE</strong>. Ajusta las cantidades y vuelve a
                pagar, o{" "}
                <Link href={`/tienda/compras/${problema.ventaId}`} className="underline underline-offset-4">
                  revísala en Mis compras
                </Link>{" "}
                para intentar confirmarla más tarde.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="grid gap-3" aria-label="Productos en el carrito">
          {items.map((i) => (
            <li key={i.producto_id}>
              <Card size="sm">
                <CardContent className="flex flex-wrap items-center gap-4">
                  <div className="min-w-40 flex-1">
                    <Link href={`/tienda/productos/${i.producto_id}`} className="font-medium hover:underline">
                      {i.nombre}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{i.sku}</p>
                    <p className="text-sm text-muted-foreground">
                      <Money value={i.precio_venta} /> c/u
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`cant-${i.producto_id}`} className="text-xs">
                      Cantidad<span className="sr-only"> de {i.nombre}</span>
                    </Label>
                    <Input
                      id={`cant-${i.producto_id}`}
                      type="number"
                      min={1}
                      max={i.stock}
                      value={i.cantidad}
                      onChange={(e) => setCantidad(i.producto_id, Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Quitar ${i.nombre}`} onClick={() => remove(i.producto_id)}>
                    <Trash2Icon />
                  </Button>
                  {i.cantidad > i.stock && (
                    <p className="w-full text-xs text-destructive" role="alert">
                      Solo había {i.stock} disponibles cuando lo agregaste.
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total estimado</span>
              <Money value={totalEstimado} className="text-lg font-semibold tabular-nums" />
            </div>
            <p className="text-xs text-muted-foreground">
              El total final (y el IVA en la factura) lo calcula el sistema al crear la venta.
            </p>
            <div className="grid gap-1">
              <Label htmlFor="obs">Observaciones (opcional)</Label>
              <Textarea id="obs" maxLength={255} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={pagar} disabled={checkout.isPending || items.length === 0}>
              {checkout.isPending ? "Procesando pago…" : "Pagar"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={clear} disabled={checkout.isPending}>
              Vaciar carrito
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
