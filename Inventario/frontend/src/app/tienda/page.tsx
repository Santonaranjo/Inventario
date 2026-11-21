"use client";

import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCart } from "@/components/providers/cart-provider";
import { Money } from "@/components/shared/money";
import { NativeSelect } from "@/components/shared/native-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ListState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useCategoriasOpciones, useProductos } from "@/hooks/use-catalogo";
import { useListState } from "@/hooks/use-list-state";

export default function CatalogoPage() {
  const { add, items } = useCart();
  const categorias = useCategoriasOpciones();
  const ls = useListState({ categoria: "" }, { size: 12, sort: "nombre" });
  const q = useProductos({
    page: ls.page,
    size: ls.size,
    search: ls.search || undefined,
    sort: ls.sort,
    categoria_id: ls.filters.categoria ? Number(ls.filters.categoria) : undefined,
  });

  return (
    <>
      <PageHeader title="Catálogo" description="Busca productos y agrégalos a tu carrito." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="Nombre, SKU o descripción…" label="Buscar productos" />
        <div className="grid gap-1">
          <Label htmlFor="cat">Categoría</Label>
          <NativeSelect id="cat" value={ls.filters.categoria} onChange={(e) => ls.setFilter("categoria", e.target.value)}>
            <option value="">Todas</option>
            {categorias.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="sort">Ordenar</Label>
          <NativeSelect id="sort" value={ls.sort} onChange={(e) => ls.setSort(e.target.value)}>
            <option value="nombre">Nombre (A-Z)</option>
            <option value="-nombre">Nombre (Z-A)</option>
            <option value="precio_venta">Menor precio</option>
            <option value="-precio_venta">Mayor precio</option>
          </NativeSelect>
        </div>
      </div>

      <ListState
        query={q}
        rows={6}
        empty={<EmptyState title="No encontramos productos" description="Prueba con otra búsqueda o categoría." />}
      >
        {(data) => (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((p) => {
                const enCarrito = items.find((i) => i.producto_id === p.id)?.cantidad ?? 0;
                const agotado = p.stock <= 0;
                const tope = enCarrito >= p.stock;
                return (
                  <li key={p.id}>
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle>
                            <Link href={`/tienda/productos/${p.id}`} className="hover:underline">
                              {p.nombre}
                            </Link>
                          </CardTitle>
                          {p.categoria && <Badge variant="outline">{p.categoria.nombre}</Badge>}
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                      </CardHeader>
                      <CardContent className="grid gap-1">
                        <Money value={p.precio_venta} className="text-lg font-semibold tabular-nums" />
                        <p className="text-sm text-muted-foreground">
                          {agotado ? "Agotado" : `${p.stock} disponibles`}
                          {enCarrito > 0 && ` · ${enCarrito} en tu carrito`}
                        </p>
                      </CardContent>
                      <CardFooter className="mt-auto">
                        <Button
                          className="w-full"
                          disabled={agotado || tope}
                          onClick={() => {
                            add(p);
                            toast.success(`${p.nombre} agregado al carrito`);
                          }}
                        >
                          <ShoppingCartIcon aria-hidden /> {agotado ? "Agotado" : tope ? "Máximo disponible" : "Agregar"}
                        </Button>
                      </CardFooter>
                    </Card>
                  </li>
                );
              })}
            </ul>
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={ls.setPage} />
          </>
        )}
      </ListState>
    </>
  );
}
