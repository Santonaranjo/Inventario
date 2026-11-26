"use client";

import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProductos } from "@/hooks/use-catalogo";
import { useDebounce } from "@/hooks/use-debounce";
import { useClientes } from "@/hooks/use-personas";
import { useConfirmarVenta, useCrearVenta } from "@/hooks/use-ventas";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { Cliente, Producto } from "@/types";

interface Linea {
  producto: Producto;
  cantidad: number;
}

/** Nueva venta de mostrador: el ADMIN elige cliente y productos. */
export default function NuevaVentaPage() {
  const router = useRouter();
  const crear = useCrearVenta();
  const confirmar = useConfirmarVenta();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const qCliente = useDebounce(buscaCliente.trim());
  const clientes = useClientes({ search: qCliente || undefined, activo: true, size: 8, sort: "nombre" }, !cliente);

  const [buscaProducto, setBuscaProducto] = useState("");
  const qProducto = useDebounce(buscaProducto.trim());
  const productos = useProductos({ search: qProducto || undefined, activo: true, size: 8, sort: "nombre" });

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const procesando = crear.isPending || confirmar.isPending;

  const agregar = (p: Producto) =>
    setLineas((prev) =>
      prev.some((l) => l.producto.id === p.id)
        ? prev.map((l) => (l.producto.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l))
        : [...prev, { producto: p, cantidad: 1 }],
    );

  const enviar = async (pagar: boolean) => {
    setError(null);
    if (!cliente) return setError("Selecciona un cliente.");
    if (lineas.length === 0) return setError("Agrega al menos un producto.");
    let ventaId: number;
    try {
      const v = await crear.mutateAsync({
        cliente_id: cliente.id,
        items: lineas.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
        observaciones: observaciones.trim() || null,
      });
      ventaId = v.id;
    } catch (e) {
      // 422 en items.N.cantidad → se muestra con el nombre del producto.
      if (isApiError(e) && e.errors.length) {
        setError(
          e.errors
            .map(({ campo, mensaje }) => {
              const m = /^items\.(\d+)\./.exec(campo);
              return m ? `${lineas[Number(m[1])]?.producto.nombre ?? campo}: ${mensaje}` : `${campo}: ${mensaje}`;
            })
            .join(" · "),
        );
      } else setError(errorMessage(e));
      return;
    }
    if (pagar) {
      try {
        await confirmar.mutateAsync(ventaId);
        toast.success(`Venta #${ventaId} creada y pagada`);
      } catch (e) {
        toast.error(`Venta #${ventaId} creada, pero no se pudo confirmar: ${errorMessage(e)}`);
      }
    } else {
      toast.success(`Venta #${ventaId} creada (pendiente)`);
    }
    router.push(`/admin/ventas/${ventaId}`);
  };

  return (
    <>
      <PageHeader title="Nueva venta" description="Venta de mostrador." backHref="/admin/ventas" />
      {error && (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Cliente</CardTitle>
            <CardDescription>Busca por nombre, documento o email.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {cliente ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{cliente.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {cliente.tipo_documento} {cliente.documento}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCliente(null)}>
                  <XIcon aria-hidden /> Cambiar
                </Button>
              </div>
            ) : (
              <>
                <SearchInput value={buscaCliente} onChange={setBuscaCliente} label="Buscar cliente" className="sm:max-w-none" />
                {clientes.isPending ? (
                  <p className="text-sm text-muted-foreground">Buscando…</p>
                ) : clientes.isError ? (
                  <p className="text-sm text-destructive">{errorMessage(clientes.error)}</p>
                ) : clientes.data.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin resultados. Créalo primero en Clientes.</p>
                ) : (
                  <ul className="grid gap-1" aria-label="Clientes encontrados">
                    {clientes.data.items.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setCliente(c)}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <span className="font-medium">{c.nombre}</span>{" "}
                          <span className="text-muted-foreground">
                            · {c.tipo_documento} {c.documento}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Productos</CardTitle>
            <CardDescription>Busca por SKU o nombre y agrégalos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <SearchInput value={buscaProducto} onChange={setBuscaProducto} label="Buscar producto" className="sm:max-w-none" />
            {productos.isPending ? (
              <p className="text-sm text-muted-foreground">Buscando…</p>
            ) : productos.isError ? (
              <p className="text-sm text-destructive">{errorMessage(productos.error)}</p>
            ) : productos.data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin resultados.</p>
            ) : (
              <ul className="grid gap-1" aria-label="Productos encontrados">
                {productos.data.items.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-muted">
                    <span>
                      <span className="font-medium">{p.nombre}</span>{" "}
                      <span className="text-muted-foreground">
                        · {p.sku} · <Money value={p.precio_venta} /> · stock {p.stock}
                      </span>
                    </span>
                    <Button size="sm" variant="outline" onClick={() => agregar(p)} disabled={p.stock <= 0} aria-label={`Agregar ${p.nombre}`}>
                      <PlusIcon aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>3. Detalle</CardTitle>
          <CardDescription>El total final lo calcula el sistema al crear la venta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {lineas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay productos.</p>
          ) : (
            <ul className="grid gap-2" aria-label="Productos de la venta">
              {lineas.map((l) => (
                <li key={l.producto.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-2">
                  <span className="min-w-40 flex-1 text-sm">
                    <span className="font-medium">{l.producto.nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {l.producto.sku} · <Money value={l.producto.precio_venta} /> c/u · stock {l.producto.stock}
                    </span>
                  </span>
                  <Label htmlFor={`cant-${l.producto.id}`} className="sr-only">
                    Cantidad de {l.producto.nombre}
                  </Label>
                  <Input
                    id={`cant-${l.producto.id}`}
                    type="number"
                    min={1}
                    className="w-20"
                    value={l.cantidad}
                    onChange={(e) =>
                      setLineas((prev) =>
                        prev.map((x) =>
                          x.producto.id === l.producto.id ? { ...x, cantidad: Math.max(1, Math.floor(Number(e.target.value)) || 1) } : x,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar ${l.producto.nombre}`}
                    onClick={() => setLineas((prev) => prev.filter((x) => x.producto.id !== l.producto.id))}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-1">
            <Label htmlFor="obs">Observaciones (opcional)</Label>
            <Textarea id="obs" maxLength={255} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => enviar(false)} disabled={procesando}>
              Crear pendiente
            </Button>
            <Button onClick={() => enviar(true)} disabled={procesando}>
              {procesando ? "Procesando…" : "Crear y confirmar pago"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
