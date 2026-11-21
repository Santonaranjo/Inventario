"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCategoriasOpciones, useSaveProducto } from "@/hooks/use-catalogo";
import { applyApiErrors } from "@/lib/form-errors";
import { productoSchema, vacioANull } from "@/lib/schemas";
import type { Producto } from "@/types";

type Values = z.infer<typeof productoSchema>;
const FIELDS = ["sku", "nombre", "descripcion", "categoria_id", "precio_venta", "costo", "activo", "stock_minimo", "stock_inicial"] as const;

/** Crear (con stock inicial y mínimo) o editar un producto. El stock se cambia solo con movimientos. */
export function ProductoForm({ producto }: { producto?: Producto }) {
  const router = useRouter();
  const save = useSaveProducto();
  const categorias = useCategoriasOpciones();
  const editando = !!producto;

  const form = useForm<Values>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      sku: producto?.sku ?? "",
      nombre: producto?.nombre ?? "",
      descripcion: producto?.descripcion ?? "",
      categoria_id: producto?.categoria ? String(producto.categoria.id) : "",
      precio_venta: producto ? Number(producto.precio_venta).toString() : "",
      costo: producto?.costo != null ? Number(producto.costo).toString() : "",
      activo: producto?.activo ?? true,
      stock_minimo: String(producto?.stock_minimo ?? 0),
      stock_inicial: "0",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    const comunes = {
      sku: v.sku,
      nombre: v.nombre,
      descripcion: vacioANull(v.descripcion),
      categoria_id: v.categoria_id ? Number(v.categoria_id) : null,
      precio_venta: v.precio_venta,
      costo: v.costo,
      activo: v.activo,
    };
    try {
      const p = await save.mutateAsync(
        editando
          ? { id: producto.id, body: comunes }
          : { body: { ...comunes, stock_minimo: Number(v.stock_minimo), stock_inicial: Number(v.stock_inicial) } },
      );
      toast.success(editando ? "Producto actualizado" : "Producto creado");
      router.push(editando ? "/admin/productos" : `/admin/productos/${p.id}`);
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: FIELDS });
    }
  });

  const categoriaActualInactiva =
    producto?.categoria && !categorias.data?.items.some((c) => c.id === producto.categoria?.id);

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="SKU" error={errors.sku?.message} required>
            {(a) => <Input {...a} {...form.register("sku")} />}
          </FormField>
          <FormField label="Nombre" error={errors.nombre?.message} required>
            {(a) => <Input {...a} {...form.register("nombre")} />}
          </FormField>
          <FormField label="Descripción" error={errors.descripcion?.message} className="sm:col-span-2">
            {(a) => <Textarea {...a} {...form.register("descripcion")} />}
          </FormField>
          <FormField label="Categoría" error={errors.categoria_id?.message}>
            {(a) => (
              <NativeSelect {...a} {...form.register("categoria_id")}>
                <option value="">Sin categoría</option>
                {categorias.data?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
                {categoriaActualInactiva && producto?.categoria && (
                  <option value={producto.categoria.id}>{producto.categoria.nombre} (inactiva)</option>
                )}
              </NativeSelect>
            )}
          </FormField>
          <div className="flex items-center gap-2 self-end pb-1.5">
            <input id="activo" type="checkbox" className="size-4 accent-primary" {...form.register("activo")} />
            <label htmlFor="activo" className="text-sm">
              Activo (visible en la tienda)
            </label>
          </div>
          <FormField label="Precio de venta (COP)" error={errors.precio_venta?.message} required>
            {(a) => <Input {...a} inputMode="decimal" placeholder="8500" {...form.register("precio_venta")} />}
          </FormField>
          <FormField label="Costo (COP)" error={errors.costo?.message} required>
            {(a) => <Input {...a} inputMode="decimal" placeholder="5200" {...form.register("costo")} />}
          </FormField>
          {!editando && (
            <>
              <FormField label="Stock inicial" error={errors.stock_inicial?.message} hint="Se registra como ENTRADA.">
                {(a) => <Input {...a} type="number" min={0} {...form.register("stock_inicial")} />}
              </FormField>
              <FormField label="Stock mínimo" error={errors.stock_minimo?.message} hint="Con este valor o menos se genera alerta.">
                {(a) => <Input {...a} type="number" min={0} {...form.register("stock_minimo")} />}
              </FormField>
            </>
          )}
          {editando && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Stock actual: <strong>{producto.stock}</strong> · mínimo {producto.stock_minimo}. Para cambiarlos usa{" "}
              <Link href={`/admin/inventario/${producto.id}`} className="underline underline-offset-4">
                el inventario del producto
              </Link>
              .
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-4 flex justify-end gap-2">
          <Link href="/admin/productos" className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : editando ? "Guardar cambios" : "Crear producto"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
