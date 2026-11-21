"""Reglas de negocio de ventas.

Flujo: crear (PENDIENTE) → confirmar (PAGADA, descuenta stock) → [factura] → anular (ANULADA, revierte stock).
Cada operación que toca stock corre en UNA transacción con las filas de inventario bloqueadas
(SELECT ... FOR UPDATE), así dos ventas simultáneas no pueden vender la misma unidad.
"""
from collections import OrderedDict
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import utcnow
from app.models import Cliente, Usuario, Venta, VentaDetalle
from app.models.enums import EstadoVenta, TipoMovimiento
from app.repositories.cliente import ClienteRepository
from app.repositories.inventario import InventarioRepository
from app.repositories.producto import ProductoRepository
from app.repositories.venta import VentaRepository
from app.schemas.common import Page, PageParams
from app.schemas.venta import VentaCreate, VentaOut
from app.services.inventario import InventarioService
from app.services.producto import es_admin

CENTAVOS = Decimal("0.01")
MONTO_MAXIMO = Decimal("9999999999.99")  # límite de NUMERIC(12,2)


class VentaService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = VentaRepository(db)
        self.clientes = ClienteRepository(db)
        self.productos = ProductoRepository(db)
        self.inventarios = InventarioRepository(db)
        self.inventario = InventarioService(db)

    # ------------------------------------------------------------------ helpers
    def _cliente_del_usuario(self, usuario: Usuario) -> Cliente:
        cliente = self.clientes.get_by_usuario(usuario.id)
        if cliente is None:
            raise BadRequestError("Tu usuario no tiene una ficha de cliente vinculada", "CLIENTE_NO_VINCULADO")
        if not cliente.activo:
            raise ForbiddenError("Tu ficha de cliente está inactiva", "CLIENTE_INACTIVO")
        return cliente

    @staticmethod
    def _verificar_acceso(venta: Venta | None, usuario: Usuario) -> Venta:
        # Para un CLIENTE, las ventas ajenas "no existen" (404, no 403) para no filtrar información.
        if venta is None or (not es_admin(usuario) and venta.cliente.usuario_id != usuario.id):
            raise NotFoundError("Venta no encontrada")
        return venta

    @staticmethod
    def _sku_de(venta: Venta, producto_id: int) -> str:
        return next(d.producto.sku for d in venta.detalles if d.producto_id == producto_id)

    # ------------------------------------------------------------------ consultas
    def get(self, venta_id: int, usuario: Usuario) -> Venta:
        return self._verificar_acceso(self.repo.get(venta_id), usuario)

    def list(
        self,
        params: PageParams,
        usuario: Usuario,
        estado: EstadoVenta | None = None,
        cliente_id: int | None = None,
        fecha_desde: datetime | None = None,
        fecha_hasta: datetime | None = None,
    ) -> Page[VentaOut]:
        if not es_admin(usuario):
            cliente = self.clientes.get_by_usuario(usuario.id)
            if cliente is None:
                return Page.build([], 0, params.page, params.size)
            cliente_id = cliente.id
        items, total = self.repo.list(params, cliente_id, estado, fecha_desde, fecha_hasta)
        return Page.build([VentaOut.model_validate(v) for v in items], total, params.page, params.size)

    # ------------------------------------------------------------------ crear
    def create(self, data: VentaCreate, usuario: Usuario) -> Venta:
        if es_admin(usuario):
            if data.cliente_id is None:
                raise BadRequestError("Como ADMIN debes indicar cliente_id", "CLIENTE_REQUERIDO")
            cliente = self.clientes.get(data.cliente_id)
            if cliente is None:
                raise NotFoundError("Cliente no encontrado")
            if not cliente.activo:
                raise ConflictError("El cliente está inactivo", "CLIENTE_INACTIVO")
        else:
            cliente = self._cliente_del_usuario(usuario)

        # Agrupa ítems repetidos del mismo producto.
        cantidades: "OrderedDict[int, int]" = OrderedDict()
        for item in data.items:
            cantidades[item.producto_id] = cantidades.get(item.producto_id, 0) + item.cantidad

        venta = Venta(cliente_id=cliente.id, usuario_id=usuario.id, observaciones=data.observaciones)
        total = Decimal("0")
        faltantes = []
        for producto_id, cantidad in cantidades.items():
            producto = self.productos.get(producto_id)
            if producto is None or (not producto.activo and not es_admin(usuario)):
                raise NotFoundError(f"Producto {producto_id} no encontrado")
            if not producto.activo:
                raise ConflictError(f"El producto {producto.sku} está inactivo", "PRODUCTO_INACTIVO")
            if producto.stock < cantidad:
                faltantes.append(f"{producto.sku} (disponible: {producto.stock}, solicitado: {cantidad})")
            subtotal = (producto.precio_venta * cantidad).quantize(CENTAVOS)
            total += subtotal
            venta.detalles.append(
                VentaDetalle(producto_id=producto.id, cantidad=cantidad, precio_unitario=producto.precio_venta, subtotal=subtotal)
            )
        if faltantes:
            raise ConflictError("Stock insuficiente para: " + "; ".join(faltantes), "STOCK_INSUFICIENTE")
        if total > MONTO_MAXIMO:
            raise BadRequestError("El total de la venta excede el máximo permitido", "MONTO_EXCEDIDO")

        venta.total = total
        self.repo.add(venta)
        self.db.commit()
        self.db.refresh(venta)
        return venta

    # ------------------------------------------------------------------ confirmar (pago)
    def confirmar(self, venta_id: int, usuario: Usuario) -> Venta:
        venta = self._verificar_acceso(self.repo.get_for_update(venta_id), usuario)
        if venta.estado != EstadoVenta.PENDIENTE:
            raise ConflictError(
                f"La venta está {venta.estado.value}; solo se pueden confirmar ventas PENDIENTES", "ESTADO_INVALIDO"
            )

        inventarios = self.inventarios.lock_many([d.producto_id for d in venta.detalles])
        faltantes = []
        for d in venta.detalles:
            if not d.producto.activo:
                raise ConflictError(f"El producto {d.producto.sku} ya no está activo", "PRODUCTO_INACTIVO")
            disponible = inventarios[d.producto_id].stock
            if disponible < d.cantidad:
                faltantes.append(f"{d.producto.sku} (disponible: {disponible}, solicitado: {d.cantidad})")
        if faltantes:
            raise ConflictError("Stock insuficiente para: " + "; ".join(faltantes), "STOCK_INSUFICIENTE")

        for d in venta.detalles:
            self.inventario.aplicar_movimiento(
                inventarios[d.producto_id], TipoMovimiento.SALIDA, d.cantidad, f"Venta #{venta.id}", usuario.id, venta.id
            )
        venta.estado = EstadoVenta.PAGADA
        venta.pagada_at = utcnow()
        self.db.commit()  # todo o nada: stock, movimientos y estado
        self.db.refresh(venta)
        return venta

    # ------------------------------------------------------------------ anular
    def anular(self, venta_id: int, motivo: str, usuario: Usuario) -> Venta:
        venta = self._verificar_acceso(self.repo.get_for_update(venta_id), usuario)
        if venta.estado == EstadoVenta.ANULADA:
            raise ConflictError("La venta ya está anulada", "ESTADO_INVALIDO")

        if venta.estado == EstadoVenta.PAGADA:
            inventarios = self.inventarios.lock_many([d.producto_id for d in venta.detalles])
            for d in venta.detalles:
                self.inventario.aplicar_movimiento(
                    inventarios[d.producto_id],
                    TipoMovimiento.ENTRADA,
                    d.cantidad,
                    f"Anulación venta #{venta.id}",
                    usuario.id,
                    venta.id,
                )
            if venta.factura and not venta.factura.anulada:
                venta.factura.anulada = True
                venta.factura.anulada_at = utcnow()

        venta.estado = EstadoVenta.ANULADA
        venta.anulada_at = utcnow()
        venta.motivo_anulacion = motivo
        self.db.commit()
        self.db.refresh(venta)
        return venta

    # ------------------------------------------------------------------ eliminar
    def eliminar(self, venta_id: int, usuario: Usuario) -> None:
        """Solo ventas PENDIENTES (nunca movieron stock ni tienen factura). Las demás se anulan."""
        venta = self._verificar_acceso(self.repo.get_for_update(venta_id), usuario)
        if venta.estado != EstadoVenta.PENDIENTE:
            raise ConflictError(
                "Solo se pueden eliminar ventas PENDIENTES; las pagadas o facturadas se anulan", "VENTA_NO_ELIMINABLE"
            )
        self.repo.delete(venta)
        self.db.commit()
