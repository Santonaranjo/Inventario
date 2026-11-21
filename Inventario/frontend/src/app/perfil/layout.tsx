"use client";

import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
