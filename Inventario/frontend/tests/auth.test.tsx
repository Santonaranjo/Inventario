import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/components/providers/auth-provider";
import { getAccessToken, getRefreshToken, getUsuario } from "@/lib/api/session";
import { API, clienteUser, seedSession, server, tokens } from "./msw";
import { routerMock, setSearchParams } from "./setup";
import { renderApp } from "./utils";

async function llenarLogin(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/contraseña/i), password);
  await user.click(screen.getByRole("button", { name: /ingresar/i }));
}

describe("login", () => {
  it("guarda tokens y usuario, y redirige ADMIN a /admin", async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json(tokens(1))));
    renderApp(<LoginForm />);
    await llenarLogin("admin@inventario.com", "Admin123*");
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/admin"));
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(getUsuario()?.rol).toBe("ADMIN");
  });

  it("redirige CLIENTE a /tienda y respeta ?next= solo si es de su rol", async () => {
    setSearchParams("next=/admin/usuarios");
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json(tokens(1, clienteUser))));
    renderApp(<LoginForm />);
    await llenarLogin("cliente@inventario.com", "Cliente123*");
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/tienda"));
  });

  it("muestra el detail de la API con credenciales inválidas", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ detail: "Email o contraseña incorrectos", code: "CREDENCIALES_INVALIDAS" }, { status: 401 }),
      ),
    );
    renderApp(<LoginForm />);
    await llenarLogin("admin@inventario.com", "mala");
    expect(await screen.findByText("Email o contraseña incorrectos")).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("valida el formulario antes de llamar a la API", async () => {
    renderApp(<LoginForm />);
    await userEvent.setup().click(screen.getByRole("button", { name: /ingresar/i }));
    expect(await screen.findByText("Email inválido")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
  });
});

function LogoutButton() {
  const { logout, usuario } = useAuth();
  return (
    <button type="button" onClick={() => logout()}>
      Salir {usuario?.nombre}
    </button>
  );
}

describe("logout", () => {
  it("llama POST /auth/logout con el refresh_token y borra la sesión", async () => {
    seedSession(3);
    let body: unknown = null;
    server.use(
      http.post(`${API}/auth/logout`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderApp(<LogoutButton />);
    await userEvent.setup().click(await screen.findByRole("button", { name: /salir administrador/i }));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/login"));
    expect(body).toEqual({ refresh_token: "refresh-3" });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getUsuario()).toBeNull();
  });

  it("aunque la API falle, cierra la sesión local", async () => {
    seedSession(3);
    server.use(http.post(`${API}/auth/logout`, () => HttpResponse.error()));
    renderApp(<LogoutButton />);
    await userEvent.setup().click(await screen.findByRole("button", { name: /salir/i }));
    await waitFor(() => expect(getAccessToken()).toBeNull());
  });
});
