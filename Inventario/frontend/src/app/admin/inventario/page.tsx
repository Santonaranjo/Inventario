"use client";

import { InventarioTable } from "@/components/inventario/inventario-table";
import { ActivoFilter, activoParam, type ActivoValue } from "@/components/shared/activo-filter";
import { NativeSelect } from "@/components/shared/native-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ListState } from "@/components/shared/states";
import { Label } from "@/components/ui/label";
import { useInventario } from "@/hooks/use-inventario";
import { useListState } from "@/hooks/use-list-state";

export default function InventarioPage() {
  const ls = useListState({ activo: "true" as ActivoValue }, { sort: "nombre" });
  const q = useInventario({
    page: ls.page,
    size: ls.size,
    search: ls.search || undefined,
    sort: ls.sort,
    activo: activoParam(ls.filters.activo),
  });
  return (
    <>
      <PageHeader title="Inventario" description="Stock por producto, entradas, salidas y ajustes." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="SKU o nombre…" />
        <ActivoFilter id="i-activo" value={ls.filters.activo} onChange={(v) => ls.setFilter("activo", v)} />
        <div className="grid gap-1">
          <Label htmlFor="i-sort">Ordenar</Label>
          <NativeSelect id="i-sort" value={ls.sort} onChange={(e) => ls.setSort(e.target.value)}>
            <option value="nombre">Nombre</option>
            <option value="sku">SKU</option>
            <option value="stock">Menor stock</option>
            <option value="-stock">Mayor stock</option>
            <option value="-updated_at">Actualizados recientemente</option>
          </NativeSelect>
        </div>
      </div>
      <ListState query={q} empty={<EmptyState title="No hay productos en inventario" />}>
        {(data) => (
          <>
            <InventarioTable items={data.items} />
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={ls.setPage} />
          </>
        )}
      </ListState>
    </>
  );
}
