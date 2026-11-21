"""Carga datos iniciales. Es idempotente: se puede ejecutar varias veces.

    python -m app.seed               # admin + datos de prueba
    python -m app.seed --solo-admin  # solo el usuario administrador
"""
import argparse
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import Cliente, Producto, Usuario
from app.models.enums import RolUsuario, TipoDocumento
from app.schemas.cliente import ClienteCreate
from app.schemas.producto import CategoriaCreate, ProductoCreate
from app.schemas.venta import ItemVentaIn, VentaCreate
from app.services.cliente import ClienteService
from app.services.factura import FacturaService
from app.services.producto import CategoriaService, ProductoService
from app.services.venta import VentaService

CLIENTE_DEMO_EMAIL = "cliente@inventario.com"
CLIENTE_DEMO_PASSWORD = "Cliente123*"

CATEGORIAS = ["Papelería", "Tecnología", "Aseo"]

# sku, nombre, categoría, precio, costo, stock inicial, stock mínimo
PRODUCTOS = [
    ("PAP-001", "Cuaderno argollado 100 hojas", "Papelería", "8500.00", "5200.00", 60, 10),
    ("PAP-002", "Lapicero negro x12", "Papelería", "12000.00", "7000.00", 40, 10),
    ("PAP-003", "Resma papel carta", "Papelería", "21900.00", "16500.00", 4, 8),  # en alerta
    ("TEC-001", "Mouse inalámbrico", "Tecnología", "45000.00", "28000.00", 15, 5),
    ("TEC-002", "Teclado USB", "Tecnología", "65000.00", "41000.00", 5, 5),  # en el límite
    ("TEC-003", "Memoria USB 64 GB", "Tecnología", "32000.00", "19000.00", 25, 5),
    ("ASE-001", "Jabón líquido 1 L", "Aseo", "9800.00", "6100.00", 0, 6),  # agotado
    ("ASE-002", "Toallas de papel x3", "Aseo", "11500.00", "7300.00", 30, 6),
]


def crear_admin(db: Session) -> Usuario:
    email = settings.ADMIN_EMAIL.lower()
    admin = db.scalar(select(Usuario).where(Usuario.email == email))
    if admin:
        print(f"  = admin ya existe: {email}")
        return admin
    admin = Usuario(
        email=email,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        nombre=settings.ADMIN_NOMBRE,
        rol=RolUsuario.ADMIN,
    )
    db.add(admin)
    db.commit()
    print(f"  + admin creado: {email}")
    return admin


def crear_datos_demo(db: Session, admin: Usuario) -> None:
    if db.scalar(select(Producto.id).limit(1)) is not None:
        print("  = ya hay productos; se omiten los datos de prueba")
        return

    categorias = {nombre: CategoriaService(db).create(CategoriaCreate(nombre=nombre)) for nombre in CATEGORIAS}

    productos = {}
    for sku, nombre, cat, precio, costo, stock, minimo in PRODUCTOS:
        productos[sku] = ProductoService(db).create(
            ProductoCreate(
                sku=sku,
                nombre=nombre,
                categoria_id=categorias[cat].id,
                precio_venta=Decimal(precio),
                costo=Decimal(costo),
                stock_inicial=stock,
                stock_minimo=minimo,
            ),
            admin,
        )
    print(f"  + {len(categorias)} categorías y {len(productos)} productos")

    # Cliente con usuario (para entrar como CLIENTE) y cliente de mostrador sin usuario.
    usuario_cliente = Usuario(
        email=CLIENTE_DEMO_EMAIL,
        password_hash=hash_password(CLIENTE_DEMO_PASSWORD),
        nombre="Carlos Pérez",
        rol=RolUsuario.CLIENTE,
    )
    db.add(usuario_cliente)
    db.commit()
    ClienteService(db).create(
        ClienteCreate(
            tipo_documento=TipoDocumento.CC,
            documento="1053800123",
            nombre="Carlos Pérez",
            email=CLIENTE_DEMO_EMAIL,
            telefono="3001234567",
            direccion="Cra 23 #45-10, Manizales",
            usuario_id=usuario_cliente.id,
        )
    )
    mostrador = ClienteService(db).create(
        ClienteCreate(tipo_documento=TipoDocumento.NIT, documento="900123456-7", nombre="Papelería El Cable SAS")
    )
    print("  + 2 clientes")

    ventas = VentaService(db)
    # 1) Venta pagada y facturada del cliente demo
    v1 = ventas.create(
        VentaCreate(items=[ItemVentaIn(producto_id=productos["PAP-001"].id, cantidad=3),
                           ItemVentaIn(producto_id=productos["TEC-001"].id, cantidad=1)]),
        usuario_cliente,
    )
    ventas.confirmar(v1.id, usuario_cliente)
    factura = FacturaService(db).generar(v1.id)
    # 2) Venta pendiente del cliente demo
    ventas.create(VentaCreate(items=[ItemVentaIn(producto_id=productos["PAP-002"].id, cantidad=2)]), usuario_cliente)
    # 3) Venta de mostrador registrada por el admin, pagada sin factura
    v3 = ventas.create(
        VentaCreate(cliente_id=mostrador.id, items=[ItemVentaIn(producto_id=productos["ASE-002"].id, cantidad=5)]),
        admin,
    )
    ventas.confirmar(v3.id, admin)
    print(f"  + 3 ventas (1 facturada: {factura.numero}, 1 pendiente, 1 pagada)")


def run(db: Session, solo_admin: bool = False) -> None:
    admin = crear_admin(db)
    if not solo_admin:
        crear_datos_demo(db, admin)


def main() -> None:
    parser = argparse.ArgumentParser(description="Carga datos iniciales")
    parser.add_argument("--solo-admin", action="store_true", help="Crea solo el usuario administrador")
    args = parser.parse_args()
    print("Seed de Inventario")
    with SessionLocal() as db:
        run(db, solo_admin=args.solo_admin)
    print("Listo.")
    print(f"  ADMIN:   {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
    if not args.solo_admin:
        print(f"  CLIENTE: {CLIENTE_DEMO_EMAIL} / {CLIENTE_DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
