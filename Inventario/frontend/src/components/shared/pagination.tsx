"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ page, pages, total, onChange, disabled }: PaginationProps) {
  if (total === 0) return null;
  const last = Math.max(pages, 1);
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-2 pt-3 text-sm">
      <p className="text-muted-foreground">
        {total} {total === 1 ? "resultado" : "resultados"} · página {page} de {last}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= last}
          aria-label="Página siguiente"
        >
          Siguiente <ChevronRightIcon />
        </Button>
      </div>
    </nav>
  );
}
