import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { resetCartStore } from "@/lib/cart-store";
import { server } from "./msw";

// Router de Next simulado (las pruebas no corren dentro de Next).
const nav = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => nav.router,
  usePathname: () => "/",
  useSearchParams: () => nav.searchParams,
  useParams: () => ({}),
}));

export const routerMock = nav.router;
export const setSearchParams = (qs: string) => {
  nav.searchParams = new URLSearchParams(qs);
};

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  resetCartStore();
  nav.searchParams = new URLSearchParams();
  vi.clearAllMocks();
});
afterAll(() => server.close());
