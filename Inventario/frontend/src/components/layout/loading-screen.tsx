import { Loader2Icon } from "lucide-react";

export function LoadingScreen({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 items-center justify-center gap-2 py-20 text-muted-foreground">
      <Loader2Icon aria-hidden className="size-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
