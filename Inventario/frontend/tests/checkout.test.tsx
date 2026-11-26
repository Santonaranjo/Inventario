import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import CarritoPage from "@/app/tienda/carrito/page";
import { useCart } from "@/components/providers/cart-provider";
import { getCart } from "@/lib/cart-store";
import type { Producto } from "@/types";
import { API, clienteUser, seedSession, server, venta } from "./msw";
import { routerMock } from "./setup";
import { renderApp } from "./utils";

const cuaderno: Producto = {
  id: 1,
  sku: "PAP-001",
  nombre: "Cuaderno",
  descripcion: null,
  categoria: null,
  precio_venta: "8500.00",
  costo: null,
  activo: true,
  stock: 10,
  stock_minimo: 2,
  created_at: "2026-11-20T10:00:00-05:00",
  updated_at: "2026-11-20T10:00:00-05:00",
};

/** Agrega productos al carrito usando la API real del provider y luego muestra la página. */
function ConCarrito() {
  const { add, items } = useCart();
  return (
    <>
      <button type="button" onClick={() => add(cuaderno, 2)}>
        agregar-prueba
      </button>
      {items.length > 0 && <CarritoPage />}
    </>
  );
}

async function prepararCarrito() {
  seedSession(1, clienteUser);
  renderApp(<ConCarrito />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "agregar-prueba" }));
  return user;
}

describe("carrito → compra", () => {
  it("crea la venta, la confirma, vacía el carrito y va al detalle", async () => {
    const llamadas: string[] = [];
    let bodyVenta: unknown = null;
    server.use(
      http.post(`${API}/ventas`, async ({ request }) => {
        llamadas.push("crear");
        bodyVenta = await request.json();
        return HttpResponse.json(venta(7, "PENDIENTE"), { status: 201 });
      }),
      http.post(`${API}/ventas/7/confirmar`, () => {
        llamadas.push("confirmar");
        return HttpResponse.json(venta(7, "PAGADA"));
      }),
    );
    const user = await prepararCarrito();
    expect(screen.getByText(/total estimado/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/tienda/compras/7"));
    expect(llamadas).toEqual(["crear", "confirmar"]);
    // El front envía solo productos y cantidades: el total lo calcula el backend.
    expect(bodyVenta).toEqual({ items: [{ producto_id: 1, cantidad: 2 }], observaciones: null });
    expect(getCart()).toEqual([]);
  });

  it("si confirmar responde STOCK_INSUFICIENTE muestra el detail y la venta queda PENDIENTE", async () => {
    const detail = "Stock insuficiente para: PAP-001 (disponible: 1, solicitado: 2)";
    server.use(
      http.post(`${API}/ventas`, () => HttpResponse.json(venta(8, "PENDIENTE"), { status: 201 })),
      http.post(`${API}/ventas/8/confirmar`, () =>
        HttpResponse.json({ detail, code: "STOCK_INSUFICIENTE" }, { status: 409 }),
      ),
    );
    const user = await prepararCarrito();
    await user.click(screen.getByRole("button", { name: "Pagar" }));

    expect(await screen.findByText(detail)).toBeInTheDocument();
    expect(screen.getByText(/quedó/i)).toHaveTextContent("La venta #8 quedó PENDIENTE");
    expect(screen.getByRole("link", { name: /revísala en mis compras/i })).toHaveAttribute("href", "/tienda/compras/8");
    expect(routerMock.push).not.toHaveBeenCalled();
    // El carrito se conserva para que el cliente ajuste las cantidades.
    expect(getCart()).toHaveLength(1);
  });

  it("si la venta ni siquiera se crea, muestra el error sin venta pendiente", async () => {
    server.use(
      http.post(`${API}/ventas`, () =>
        HttpResponse.json({ detail: "El producto PAP-001 está inactivo", code: "PRODUCTO_INACTIVO" }, { status: 409 }),
      ),
    );
    const user = await prepararCarrito();
    await user.click(screen.getByRole("button", { name: "Pagar" }));
    expect(await screen.findByText("El producto PAP-001 está inactivo")).toBeInTheDocument();
    expect(screen.queryByText(/quedó/i)).not.toBeInTheDocument();
    expect(getCart()).toHaveLength(1);
  });
});
