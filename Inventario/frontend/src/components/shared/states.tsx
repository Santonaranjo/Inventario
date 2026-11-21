"use client";

import { AlertTriangleIcon, InboxIcon, LockIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export function LoadingState({ rows = 5, label = "Cargando…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-2 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "No hay resultados",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background px-4 py-10 text-center">
      <InboxIcon aria-hidden className="size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/** Error de carga. Distingue 403 (sin permiso) y 404 (no existe) del resto. */
export function ErrorState({ error, onRetry, backHref }: { error: unknown; onRetry?: () => void; backHref?: string }) {
  const status = isApiError(error) ? error.status : 0;
  const Icon = status === 403 ? LockIcon : status === 404 ? SearchXIcon : AlertTriangleIcon;
  const title =
    status === 403 ? "No tienes permiso para ver esto" : status === 404 ? "No encontramos lo que buscas" : "No se pudo cargar la información";
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border bg-background px-4 py-10 text-center">
      <Icon aria-hidden className={cn("size-8", status === 403 || status === 404 ? "text-muted-foreground" : "text-destructive")} />
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{errorMessage(error)}</p>
      <div className="mt-2 flex gap-2">
        {onRetry && status !== 403 && status !== 404 && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        )}
        {backHref && (
          <Link href={backHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Volver
          </Link>
        )}
      </div>
    </div>
  );
}

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Renderiza carga / error / vacío / contenido de un listado paginado. */
export function ListState<T extends { items: unknown[] }>({
  query,
  empty,
  children,
  rows,
}: {
  query: QueryLike<T>;
  empty?: React.ReactNode;
  rows?: number;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending) return <LoadingState rows={rows} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data || query.data.items.length === 0) return <>{empty ?? <EmptyState />}</>;
  return <>{children(query.data)}</>;
}
