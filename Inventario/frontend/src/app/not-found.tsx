import { SearchXIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
      <SearchXIcon aria-hidden className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground">La dirección no existe o fue movida.</p>
      <Link href="/" className={buttonVariants()}>
        Ir al inicio
      </Link>
    </main>
  );
}
