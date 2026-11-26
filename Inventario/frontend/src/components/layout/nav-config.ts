import {
  BellIcon,
  BoxesIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  StoreIcon,
  TagsIcon,
  UserCogIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { RolUsuario } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Coincidencia exacta (para el inicio del rol). */
  exact?: boolean;
}

export const NAV: Record<RolUsuario, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
    { href: "/admin/ventas", label: "Ventas", icon: ShoppingCartIcon },
    { href: "/admin/facturas", label: "Facturas", icon: ReceiptIcon },
    { href: "/admin/productos", label: "Productos", icon: PackageIcon },
    { href: "/admin/categorias", label: "Categorías", icon: TagsIcon },
    { href: "/admin/inventario", label: "Inventario", icon: BoxesIcon },
    { href: "/admin/alertas", label: "Alertas de stock", icon: BellIcon },
    { href: "/admin/clientes", label: "Clientes", icon: UsersIcon },
    { href: "/admin/usuarios", label: "Usuarios", icon: UserCogIcon },
  ],
  CLIENTE: [
    { href: "/tienda", label: "Catálogo", icon: StoreIcon, exact: true },
    { href: "/tienda/carrito", label: "Carrito", icon: ShoppingCartIcon },
    { href: "/tienda/compras", label: "Mis compras", icon: ShoppingBagIcon },
    { href: "/tienda/facturas", label: "Mis facturas", icon: FileTextIcon },
  ],
};

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href || (item.href === "/tienda" && pathname.startsWith("/tienda/productos"));
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
