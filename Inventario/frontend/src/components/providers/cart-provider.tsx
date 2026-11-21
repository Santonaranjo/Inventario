"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { getCart, getServerCart, setCart, subscribeCart, type CartItem } from "@/lib/cart-store";
import type { Producto } from "@/types";

export type { CartItem };

interface CartContextValue {
  items: CartItem[];
  count: number;
  /** Total estimado solo para mostrar. El total real lo devuelve el backend. */
  totalEstimado: number;
  add: (p: Producto, cantidad?: number) => void;
  setCantidad: (productoId: number, cantidad: number) => void;
  remove: (productoId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribeCart, getCart, getServerCart);

  const add = useCallback((p: Producto, cantidad = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.producto_id === p.id);
      if (existing) {
        return prev.map((i) =>
          i.producto_id === p.id
            ? { ...i, stock: p.stock, precio_venta: p.precio_venta, cantidad: Math.min(i.cantidad + cantidad, p.stock) }
            : i,
        );
      }
      return [
        ...prev,
        {
          producto_id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          precio_venta: p.precio_venta,
          stock: p.stock,
          cantidad: Math.max(1, Math.min(cantidad, p.stock)),
        },
      ];
    });
  }, []);

  const setCantidad = useCallback((productoId: number, cantidad: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.producto_id === productoId ? { ...i, cantidad: Math.max(1, Math.floor(cantidad) || 1) } : i,
      ),
    );
  }, []);

  const remove = useCallback((productoId: number) => {
    setCart((prev) => prev.filter((i) => i.producto_id !== productoId));
  }, []);

  const clear = useCallback(() => setCart([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((acc, i) => acc + i.cantidad, 0),
      totalEstimado: items.reduce((acc, i) => acc + Number(i.precio_venta) * i.cantidad, 0),
      add,
      setCantidad,
      remove,
      clear,
    }),
    [items, add, setCantidad, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
