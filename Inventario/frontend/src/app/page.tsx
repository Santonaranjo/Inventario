"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { homeForRol } from "@/lib/api/session";

/** Raíz: redirige al inicio del rol o al login. */
export default function Home() {
  const { status, usuario } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace(homeForRol(usuario?.rol));
    if (status === "anonymous") router.replace("/login");
  }, [status, usuario, router]);
  return <LoadingScreen />;
}
