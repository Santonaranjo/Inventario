"use client";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "./native-select";

export type ActivoValue = "" | "true" | "false";

export const activoParam = (v: ActivoValue): boolean | undefined => (v === "" ? undefined : v === "true");

/** Filtro Todos / Activos / Inactivos. */
export function ActivoFilter({ id, value, onChange }: { id: string; value: ActivoValue; onChange: (v: ActivoValue) => void }) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>Estado</Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value as ActivoValue)}>
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Inactivos</option>
      </NativeSelect>
    </div>
  );
}
