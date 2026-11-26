import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { SESSION_EVENT, getAccessToken, getRefreshToken } from "@/lib/api/session";
import { API, seedSession, server, tokens } from "./msw";

const expirado = () => HttpResponse.json({ detail: "El token expiró", code: "TOKEN_EXPIRADO" }, { status: 401 });

describe("cliente HTTP", () => {
  it("envía el Bearer token y devuelve el JSON", async () => {
    seedSession(1);
    let auth: string | null = null;
    server.use(
      http.get(`${API}/productos`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [], total: 0, page: 1, size: 20, pages: 0 });
      }),
    );
    const res = await api.get<{ total: number }>("/productos", { page: 1, search: "" });
    expect(auth).toBe("Bearer access-1");
    expect(res.total).toBe(0);
  });

  it("omite parámetros vacíos en la query", async () => {
    seedSession(1);
    let url = "";
    server.use(
      http.get(`${API}/ventas`, ({ request }) => {
        url = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, size: 20, pages: 0 });
      }),
    );
    await api.get("/ventas", { page: 2, estado: "", search: undefined, activo: false });
    expect(url).toBe(`${API}/ventas?page=2&activo=false`);
  });

  it("con TOKEN_EXPIRADO renueva los tokens (rotación) y reintenta una vez", async () => {
    seedSession(1);
    const refreshBodies: unknown[] = [];
    server.use(
      http.get(`${API}/auth/me`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer access-2" ? HttpResponse.json({ id: 1 }) : expirado(),
      ),
      http.post(`${API}/auth/refresh`, async ({ request }) => {
        refreshBodies.push(await request.json());
        return HttpResponse.json(tokens(2));
      }),
    );
    const me = await api.get<{ id: number }>("/auth/me");
    expect(me.id).toBe(1);
    expect(refreshBodies).toEqual([{ refresh_token: "refresh-1" }]);
    expect(getAccessToken()).toBe("access-2");
    expect(getRefreshToken()).toBe("refresh-2");
  });

  it("single flight: varios 401 simultáneos hacen UN solo refresh", async () => {
    seedSession(1);
    let refreshCount = 0;
    server.use(
      http.get(`${API}/productos/:id`, ({ request, params }) =>
        request.headers.get("Authorization") === "Bearer access-2" ? HttpResponse.json({ id: Number(params.id) }) : expirado(),
      ),
      http.post(`${API}/auth/refresh`, async ({ request }) => {
        refreshCount++;
        const body = (await request.json()) as { refresh_token: string };
        // Reusar un refresh viejo revoca la sesión, como hace el backend.
        if (body.refresh_token !== "refresh-1") {
          return HttpResponse.json({ detail: "Token revocado", code: "TOKEN_REVOCADO" }, { status: 401 });
        }
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json(tokens(2));
      }),
    );
    const results = await Promise.all([1, 2, 3].map((id) => api.get<{ id: number }>(`/productos/${id}`)));
    expect(results.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(refreshCount).toBe(1);
    expect(getRefreshToken()).toBe("refresh-2");
  });

  it("si el refresh falla, borra la sesión, emite 'expired' y lanza el error", async () => {
    seedSession(1);
    const onSession = vi.fn();
    window.addEventListener(SESSION_EVENT, onSession);
    server.use(
      http.get(`${API}/auth/me`, expirado),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ detail: "Token revocado", code: "TOKEN_REVOCADO" }, { status: 401 }),
      ),
    );
    await expect(api.get("/auth/me")).rejects.toMatchObject({ status: 401, code: "TOKEN_EXPIRADO" });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(onSession.mock.calls.some(([e]) => (e as CustomEvent).detail === "expired")).toBe(true);
    window.removeEventListener(SESSION_EVENT, onSession);
  });

  it("reintenta solo una vez: si vuelve a fallar con 401 lanza el error", async () => {
    seedSession(1);
    let calls = 0;
    let refreshCount = 0;
    server.use(
      http.get(`${API}/auth/me`, () => {
        calls++;
        return expirado();
      }),
      http.post(`${API}/auth/refresh`, () => {
        refreshCount++;
        return HttpResponse.json(tokens(2));
      }),
    );
    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(2);
    expect(refreshCount).toBe(1);
  });

  it("normaliza los 422 con errors [{campo, mensaje}]", async () => {
    seedSession(1);
    server.use(
      http.post(`${API}/clientes`, () =>
        HttpResponse.json(
          {
            detail: "Datos inválidos",
            code: "VALIDATION_ERROR",
            errors: [{ campo: "email", mensaje: "value is not a valid email address" }],
          },
          { status: 422 },
        ),
      ),
    );
    const err = (await api.post("/clientes", {}).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.errors).toEqual([{ campo: "email", mensaje: "value is not a valid email address" }]);
  });

  it("sin conexión lanza NETWORK_ERROR", async () => {
    seedSession(1);
    server.use(http.get(`${API}/productos`, () => HttpResponse.error()));
    await expect(api.get("/productos")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });
});
