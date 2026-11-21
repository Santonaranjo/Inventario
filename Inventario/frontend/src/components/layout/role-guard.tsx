"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { homeForRol } from "@/lib/api/session";
import type { RolUsuario } from "@/types";
import { LoadingScreen } from "./loading-screen";

/**
 * Protege un grupo de rutas en el cliente (los tokens viven en localStorage).
 * - Sin sesión → /login?next=<ruta actual>
 * - Rol no permitido → inicio de su propio rol
 * La seguridad real la hace el backend; esto solo evita mostrar pantallas que no aplican.
 */
export function RoleGuard({ roles, children }: { roles?: RolUsuario[]; children: React.ReactNode }) {
  const { status, usuario } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const permitido = status === "authenticated" && usuario && (!roles || roles.includes(usuario.rol));

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && usuario && roles && !roles.includes(usuario.rol)) {
      router.replace(homeForRol(usuario.rol));
    }
  }, [status, usuario, roles, router, pathname]);

  if (!permitido) return <LoadingScreen label={status === "loading" ? "Cargando…" : "Redirigiendo…"} />;
  return <>{children}</>;
}
