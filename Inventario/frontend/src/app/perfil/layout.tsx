import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { RoleGuard } from "@/components/layout/role-guard";

// Las rutas privadas se renderizan en el cliente (la sesión vive en localStorage);
// Suspense permite prerenderizar el "shell" y leer la URL (usePathname/useParams) en el navegador.
// `instant = false`: las pantallas cargan sus datos en el cliente, no se validan como navegación instantánea.
export const instant = false;

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RoleGuard>
        <AppShell>{children}</AppShell>
      </RoleGuard>
    </Suspense>
  );
}
