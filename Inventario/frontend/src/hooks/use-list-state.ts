"use client";

import { useState } from "react";
import { useDebounce } from "./use-debounce";

/**
 * Estado común de un listado: página, búsqueda con debounce, orden y filtros.
 * Cambiar la búsqueda o un filtro vuelve a la página 1.
 */
export function useListState<F extends Record<string, unknown>>(initialFilters: F, opts: { size?: number; sort?: string } = {}) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInputRaw] = useState("");
  const [sort, setSortRaw] = useState(opts.sort ?? "");
  const [filters, setFiltersRaw] = useState<F>(initialFilters);
  const search = useDebounce(searchInput.trim());
  const [lastSearch, setLastSearch] = useState(search);

  // Reinicia la página cuando cambia la búsqueda efectiva (patrón "ajustar estado durante render").
  if (search !== lastSearch) {
    setLastSearch(search);
    setPage(1);
  }

  return {
    page,
    setPage,
    size: opts.size ?? 20,
    searchInput,
    setSearchInput: setSearchInputRaw,
    search,
    sort,
    setSort: (s: string) => {
      setSortRaw(s);
      setPage(1);
    },
    filters,
    setFilter: <K extends keyof F>(key: K, value: F[K]) => {
      setFiltersRaw((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    resetFilters: () => {
      setFiltersRaw(initialFilters);
      setSearchInputRaw("");
      setPage(1);
    },
  };
}
