import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CartProvider } from "@/components/providers/cart-provider";
import { makeQueryClient } from "@/components/providers/app-providers";

/** Renderiza con los mismos providers de la app (sin Toaster). */
export function renderApp(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <CartProvider>{ui}</CartProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
