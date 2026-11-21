import { SESSION_EVENT, type SessionChangeReason } from "./api/session";

/** Ítem del carrito. El precio es solo informativo: el total real lo calcula el backend. */
export interface CartItem {
  producto_id: number;
  sku: string;
  nombre: string;
  precio_venta: string;
  stock: number;
  cantidad: number;
}

// Store externo (localStorage) para usar con useSyncExternalStore.
const CART_KEY = "inv.carrito";
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return EMPTY;
  cache ??= read();
  return cache;
}

export function getServerCart(): CartItem[] {
  return EMPTY;
}

export function setCart(next: CartItem[] | ((prev: CartItem[]) => CartItem[])) {
  const value = typeof next === "function" ? next(getCart()) : next;
  cache = value;
  localStorage.setItem(CART_KEY, JSON.stringify(value));
  listeners.forEach((l) => l());
}

let sessionBound = false;
function bindSession() {
  if (sessionBound || typeof window === "undefined") return;
  sessionBound = true;
  // El carrito es de quien inició sesión: se vacía al entrar, salir o expirar la sesión.
  window.addEventListener(SESSION_EVENT, (e) => {
    const reason = (e as CustomEvent<SessionChangeReason>).detail;
    if (reason === "login" || reason === "logout" || reason === "expired") setCart(EMPTY);
  });
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY || e.key === null) {
      cache = read();
      listeners.forEach((l) => l());
    }
  });
}

export function subscribeCart(listener: () => void) {
  bindSession();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Solo para pruebas. */
export function resetCartStore() {
  cache = null;
}
