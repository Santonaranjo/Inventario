"""Importa todos los modelos para que Alembic y SQLAlchemy los registren."""
from app.models.base import Base
from app.models.cliente import Cliente
from app.models.factura import Factura
from app.models.inventario import Inventario, MovimientoInventario
from app.models.producto import Categoria, Producto
from app.models.enums import EstadoVenta, RolUsuario, TipoDocumento, TipoMovimiento
from app.models.usuario import RefreshToken, Usuario
from app.models.venta import Venta, VentaDetalle

__all__ = [
    "Base",
    "Categoria",
    "Producto",
    "Inventario",
    "MovimientoInventario",
    "Cliente",
    "EstadoVenta",
    "RefreshToken",
    "RolUsuario",
    "TipoDocumento",
    "TipoMovimiento",
    "Usuario",
    "Venta",
    "VentaDetalle",
    "Factura",
]
