"use client";

import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";
import type { RolUsuario } from "@/types";

const ROLES: RolUsuario[] = ["CLIENTE"];

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard roles={ROLES}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
