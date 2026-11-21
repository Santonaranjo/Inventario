import { Badge } from "@/components/ui/badge";
import type { EstadoVenta, TipoMovimiento } from "@/types";

export function EstadoVentaBadge({ estado }: { estado: EstadoVenta }) {
  const variant = estado === "PAGADA" ? "default" : estado === "ANULADA" ? "destructive" : "secondary";
  const label = estado === "PAGADA" ? "Pagada" : estado === "ANULADA" ? "Anulada" : "Pendiente";
  return <Badge variant={variant}>{label}</Badge>;
}

export function ActivoBadge({ activo }: { activo: boolean }) {
  return <Badge variant={activo ? "secondary" : "outline"}>{activo ? "Activo" : "Inactivo"}</Badge>;
}

export function TipoMovimientoBadge({ tipo }: { tipo: TipoMovimiento }) {
  const variant = tipo === "ENTRADA" ? "default" : tipo === "SALIDA" ? "destructive" : "secondary";
  return <Badge variant={variant}>{tipo}</Badge>;
}

export function StockBadge({ stock, minimo }: { stock: number; minimo: number }) {
  if (stock <= 0) return <Badge variant="destructive">Agotado</Badge>;
  if (stock <= minimo) return <Badge variant="destructive">Stock bajo</Badge>;
  return <Badge variant="secondary">OK</Badge>;
}
