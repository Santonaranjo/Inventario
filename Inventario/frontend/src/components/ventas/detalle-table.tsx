import { Money } from "@/components/shared/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DetalleVenta } from "@/types";

/** Líneas de una venta o factura. Los subtotales vienen calculados por el backend. */
export function DetalleTable({ detalles }: { detalles: DetalleVenta[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Cant.</TableHead>
          <TableHead className="text-right">Precio unit.</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalles.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-mono text-xs">{d.sku}</TableCell>
            <TableCell>{d.producto_nombre}</TableCell>
            <TableCell className="text-right tabular-nums">{d.cantidad}</TableCell>
            <TableCell className="text-right">
              <Money value={d.precio_unitario} />
            </TableCell>
            <TableCell className="text-right">
              <Money value={d.subtotal} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
