"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { isApiError } from "@/lib/api/errors";
import { AuthProvider } from "./auth-provider";
import { CartProvider } from "./cart-provider";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // No reintentar errores de negocio/permiso; sí fallas de red o 5xx (una vez).
        retry: (count, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return count < 1;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <CartProvider>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
