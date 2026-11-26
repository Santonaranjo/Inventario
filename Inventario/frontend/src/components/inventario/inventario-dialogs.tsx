"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRegistrarMovimiento, useUpdateStockMinimo } from "@/hooks/use-inventario";
import { applyApiErrors } from "@/lib/form-errors";
import { movimientoSchema, stockMinimoSchema } from "@/lib/schemas";
import { TIPOS_MOVIMIENTO, type Inventario } from "@/types";

/** Datos mínimos del producto para los diálogos. */
export type ProductoStock = Pick<Inventario, "producto_id" | "sku" | "producto_nombre" | "stock" | "stock_minimo">;

type MovValues = z.infer<typeof movimientoSchema>;

function MovimientoForm({ producto, onDone }: { producto: ProductoStock; onDone: () => void }) {
  const registrar = useRegistrarMovimiento();
  const form = useForm<MovValues>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: { tipo: "ENTRADA", cantidad: "", stock_nuevo: String(producto.stock), motivo: "" },
  });
  const tipo = useWatch({ control: form.control, name: "tipo" });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const mov = await registrar.mutateAsync(
        v.tipo === "AJUSTE"
          ? { producto_id: producto.producto_id, tipo: "AJUSTE", stock_nuevo: Number(v.stock_nuevo), motivo: v.motivo }
          : { producto_id: producto.producto_id, tipo: v.tipo, cantidad: Number(v.cantidad), motivo: v.motivo },
      );
      toast.success(`${mov.tipo} registrada: stock ${mov.stock_anterior} → ${mov.stock_nuevo}`);
      onDone();
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: ["tipo", "cantidad", "stock_nuevo", "motivo"] });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Stock actual: <strong className="text-foreground">{producto.stock}</strong>
      </p>
      <FormField label="Tipo de movimiento" error={errors.tipo?.message} required>
        {(a) => (
          <NativeSelect {...a} {...form.register("tipo")}>
            {TIPOS_MOVIMIENTO.map((t) => (
              <option key={t} value={t}>
                {t === "ENTRADA" ? "ENTRADA (suma)" : t === "SALIDA" ? "SALIDA (resta)" : "AJUSTE (fija el stock)"}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      {tipo === "AJUSTE" ? (
        <FormField label="Stock nuevo" error={errors.stock_nuevo?.message} hint="Conteo físico real." required>
          {(a) => <Input {...a} type="number" min={0} {...form.register("stock_nuevo")} />}
        </FormField>
      ) : (
        <FormField label="Cantidad" error={errors.cantidad?.message} required>
          {(a) => <Input {...a} type="number" min={1} autoFocus {...form.register("cantidad")} />}
        </FormField>
      )}
      <FormField label="Motivo" error={errors.motivo?.message} required>
        {(a) => <Textarea {...a} maxLength={255} placeholder="Ej.: compra a proveedor, producto dañado…" {...form.register("motivo")} />}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registrando…" : "Registrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MovimientoDialog({ producto, onClose }: { producto: ProductoStock | null; onClose: () => void }) {
  return (
    <FormDialog
      open={!!producto}
      onOpenChange={(o) => !o && onClose()}
      title="Registrar movimiento"
      description={producto ? `${producto.sku} · ${producto.producto_nombre}` : undefined}
    >
      {producto && <MovimientoForm key={producto.producto_id} producto={producto} onDone={onClose} />}
    </FormDialog>
  );
}

type MinValues = z.infer<typeof stockMinimoSchema>;

function StockMinimoForm({ producto, onDone }: { producto: ProductoStock; onDone: () => void }) {
  const update = useUpdateStockMinimo();
  const form = useForm<MinValues>({
    resolver: zodResolver(stockMinimoSchema),
    defaultValues: { stock_minimo: String(producto.stock_minimo) },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await update.mutateAsync({ productoId: producto.producto_id, stock_minimo: Number(v.stock_minimo) });
      toast.success("Stock mínimo actualizado");
      onDone();
    } catch (e) {
      applyApiErrors(e, form.setError, { fields: ["stock_minimo"] });
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormField label="Stock mínimo" error={errors.stock_minimo?.message} hint={`Stock actual: ${producto.stock}`} required>
        {(a) => <Input {...a} type="number" min={0} autoFocus {...form.register("stock_minimo")} />}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function StockMinimoDialog({ producto, onClose }: { producto: ProductoStock | null; onClose: () => void }) {
  return (
    <FormDialog
      open={!!producto}
      onOpenChange={(o) => !o && onClose()}
      title="Editar stock mínimo"
      description={producto ? `${producto.sku} · ${producto.producto_nombre}` : undefined}
    >
      {producto && <StockMinimoForm key={producto.producto_id} producto={producto} onDone={onClose} />}
    </FormDialog>
  );
}
