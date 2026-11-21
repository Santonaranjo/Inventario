import { expect, test } from "@playwright/test";

// Usuarios del seed del backend (python -m app.seed).
const ADMIN = { email: "admin@inventario.com", password: "Admin123*" };
const CLIENTE = { email: "cliente@inventario.com", password: "Cliente123*" };
const HEALTH = "http://localhost:8000/health";

test.beforeAll(async ({ request }) => {
  const res = await request.get(HEALTH).catch(() => null);
  test.skip(!res?.ok(), "La API no está corriendo en http://localhost:8000 (levántala con Docker y el seed).");
});

async function login(page: import("@playwright/test").Page, cred: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(cred.email);
  await page.getByLabel("Contraseña").fill(cred.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test("ADMIN: login redirige al dashboard y logout vuelve al login", async ({ page }) => {
  await login(page, ADMIN);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: /salir|cerrar sesión/i }).click();
  await expect(page).toHaveURL(/\/login/);
  // Sin sesión, las rutas privadas mandan al login.
  await page.goto("/admin/productos");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("CLIENTE: agrega un producto al carrito y paga", async ({ page }) => {
  await login(page, CLIENTE);
  await expect(page).toHaveURL(/\/tienda$/);
  // CLIENTE no puede entrar a /admin.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/tienda$/);

  const agregar = page.getByRole("button", { name: "Agregar" }).first();
  await expect(agregar).toBeVisible();
  await agregar.click();
  await page.goto("/tienda/carrito");
  await page.getByRole("button", { name: "Pagar" }).click();
  // Éxito → detalle de la compra pagada; sin stock → alerta y venta pendiente.
  await expect(
    page.getByText(/compra realizada|Pagada|quedó PENDIENTE/i).first(),
  ).toBeVisible({ timeout: 10_000 });
});
