// Claves de TanStack Query centralizadas para invalidar con precisión.
export const qk = {
  me: ["me"] as const,
  usuarios: { all: ["usuarios"] as const, list: (p: object) => ["usuarios", "list", p] as const },
  clientes: {
    all: ["clientes"] as const,
    list: (p: object) => ["clientes", "list", p] as const,
    detail: (id: number) => ["clientes", id] as const,
  },
  categorias: { all: ["categorias"] as const, list: (p: object) => ["categorias", "list", p] as const },
  productos: {
    all: ["productos"] as const,
    list: (p: object) => ["productos", "list", p] as const,
    detail: (id: number) => ["productos", id] as const,
  },
  inventario: {
    all: ["inventario"] as const,
    list: (p: object) => ["inventario", "list", p] as const,
    alertas: (p: object) => ["inventario", "alertas", p] as const,
    detail: (id: number) => ["inventario", id] as const,
    movimientos: (p: object) => ["inventario", "movimientos", p] as const,
  },
  ventas: {
    all: ["ventas"] as const,
    list: (p: object) => ["ventas", "list", p] as const,
    detail: (id: number) => ["ventas", id] as const,
  },
  facturas: {
    all: ["facturas"] as const,
    list: (p: object) => ["facturas", "list", p] as const,
    detail: (id: number) => ["facturas", id] as const,
  },
};
