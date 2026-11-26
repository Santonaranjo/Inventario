"use client";

import { LogOutIcon, MenuIcon, PackageIcon, ShoppingCartIcon, UserIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useCart } from "@/components/providers/cart-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { homeForRol } from "@/lib/api/session";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav-config";

/** Estructura común: barra superior + navegación lateral (colapsable en móvil). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { usuario, logout } = useAuth();
  const { count } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  if (!usuario) return null;
  const items = NAV[usuario.rol];

  const onLogout = async () => {
    setSaliendo(true);
    await logout();
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <a
        href="#contenido"
        className="sr-only z-50 rounded bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 print:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="nav-lateral"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <XIcon /> : <MenuIcon />}
        </Button>
        <Link href={homeForRol(usuario.rol)} className="flex items-center gap-2 font-semibold">
          <PackageIcon aria-hidden className="size-5" />
          Inventario
          <Badge variant="outline" className="hidden sm:inline-flex">
            {usuario.rol === "ADMIN" ? "Administración" : "Tienda"}
          </Badge>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {usuario.rol === "CLIENTE" && (
            <Link
              href="/tienda/carrito"
              className="relative inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Carrito, ${count} ${count === 1 ? "unidad" : "unidades"}`}
            >
              <ShoppingCartIcon aria-hidden className="size-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          )}
          <Link
            href="/perfil"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <UserIcon aria-hidden className="size-4" />
            <span className="hidden max-w-40 truncate sm:inline">{usuario.nombre}</span>
            <span className="sr-only sm:hidden">Mi perfil</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={onLogout} disabled={saliendo}>
            <LogOutIcon aria-hidden /> <span className="hidden sm:inline">{saliendo ? "Saliendo…" : "Salir"}</span>
            <span className="sr-only sm:hidden">Cerrar sesión</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          id="nav-lateral"
          aria-label="Navegación principal"
          className={cn(
            "fixed inset-y-14 left-0 z-20 w-60 shrink-0 border-r bg-background p-3 transition-transform lg:static lg:translate-x-0 print:hidden",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <ul className="grid gap-1">
            {items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      active && "bg-muted font-medium",
                    )}
                  >
                    <item.icon aria-hidden className="size-4" />
                    {item.label}
                    {item.href === "/tienda/carrito" && count > 0 && (
                      <Badge className="ml-auto" variant="secondary">
                        {count}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {open && (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 top-14 z-10 bg-black/20 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
        <main id="contenido" className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
