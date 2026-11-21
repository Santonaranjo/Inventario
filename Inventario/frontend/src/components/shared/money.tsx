import { formatMoney } from "@/lib/format";

/** Muestra un monto (string decimal de la API) en COP. */
export function Money({ value, className }: { value: string | number | null | undefined; className?: string }) {
  return <span className={className ?? "tabular-nums"}>{formatMoney(value)}</span>;
}
