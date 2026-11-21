// Formateo solo para mostrar. Los montos llegan como string decimal ("8500.00")
// y nunca se recalculan aquí para guardarlos: los totales los calcula el backend.

const moneyFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? moneyFmt.format(n) : "—";
}

const dateTimeFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

/**
 * Convierte el valor de un <input type="date"> (YYYY-MM-DD) a ISO 8601 con zona horaria local.
 * `fin = true` usa el final del día para filtros "hasta".
 */
export function dateInputToIso(value: string, fin = false): string | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = fin ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d, 0, 0, 0);
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(off / 60)}:${pad(off % 60)}`
  );
}
