"use client";

import { InventarioTable } from "@/components/inventario/inventario-table";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ListState } from "@/components/shared/states";
import { useAlertas } from "@/hooks/use-inventario";
import { useListState } from "@/hooks/use-list-state";

export default function AlertasPage() {
  const ls = useListState({});
  const q = useAlertas({ page: ls.page, size: ls.size, search: ls.search || undefined });
  return (
    <>
      <PageHeader
        title="Alertas de stock"
        description="Productos activos con stock igual o menor al mínimo (los más críticos primero)."
      />
      <div className="mb-4">
        <SearchInput value={ls.searchInput} onChange={ls.setSearchInput} placeholder="SKU o nombre…" />
      </div>
      <ListState query={q} empty={<EmptyState title="Sin alertas" description="Todo el inventario está por encima del mínimo." />}>
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
