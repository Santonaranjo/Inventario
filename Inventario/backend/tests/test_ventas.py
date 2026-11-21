"""Flujos críticos: venta con descuento de stock, stock insuficiente, anulación, permisos y facturas."""
import threading
from decimal import Decimal

from tests.test_inventario import crear_producto

API = "/api/v1/ventas"


def stock(client, headers, producto_id) -> int:
    return client.get(f"/api/v1/inventario/{producto_id}", headers=headers).json()["stock"]


def crear_venta(client, headers, items, **extra):
    return client.post(API, headers=headers, json={"items": items, **extra})


def venta_pagada(client, admin_headers, cliente_headers, cantidad=2, precio="10000.00", sku="V-1"):
    p = crear_producto(client, admin_headers, sku=sku, stock_inicial=10, precio_venta=precio)
    venta = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": cantidad}]).json()
    res = client.post(f"{API}/{venta['id']}/confirmar", headers=cliente_headers)
    assert res.status_code == 200, res.text
    return p, res.json()


# ------------------------------------------------------------------ venta y stock
def test_venta_descuenta_stock_al_confirmar(client, admin_headers, cliente_headers):
    p1 = crear_producto(client, admin_headers, sku="V-1", stock_inicial=10, precio_venta="2500.50")
    p2 = crear_producto(client, admin_headers, sku="V-2", stock_inicial=5, precio_venta="1000.00")

    res = crear_venta(client, cliente_headers, [{"producto_id": p1["id"], "cantidad": 3}, {"producto_id": p2["id"], "cantidad": 2}])
    assert res.status_code == 201, res.text
    venta = res.json()
    assert venta["estado"] == "PENDIENTE"
    assert venta["total"] == "9501.50"  # 3*2500.50 + 2*1000
    assert venta["detalles"][0]["subtotal"] == "7501.50"
    assert venta["cliente"]["documento"] == "1001"
    # Crear no descuenta stock
    assert stock(client, admin_headers, p1["id"]) == 10

    res = client.post(f"{API}/{venta['id']}/confirmar", headers=cliente_headers)
    assert res.status_code == 200
    assert res.json()["estado"] == "PAGADA" and res.json()["pagada_at"]
    assert stock(client, admin_headers, p1["id"]) == 7
    assert stock(client, admin_headers, p2["id"]) == 3

    movs = client.get("/api/v1/inventario/movimientos", headers=admin_headers, params={"venta_id": venta["id"]}).json()
    assert movs["total"] == 2
    assert {m["tipo"] for m in movs["items"]} == {"SALIDA"}
    assert movs["items"][0]["motivo"] == f"Venta #{venta['id']}"

    # No se puede confirmar dos veces
    res = client.post(f"{API}/{venta['id']}/confirmar", headers=cliente_headers)
    assert res.status_code == 409 and res.json()["code"] == "ESTADO_INVALIDO"


def test_items_repetidos_se_agrupan(client, admin_headers, cliente_headers):
    p = crear_producto(client, admin_headers, stock_inicial=10)
    venta = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 1}, {"producto_id": p["id"], "cantidad": 2}]).json()
    assert len(venta["detalles"]) == 1 and venta["detalles"][0]["cantidad"] == 3


def test_stock_insuficiente_al_crear(client, admin_headers, cliente_headers):
    p = crear_producto(client, admin_headers, sku="POCO", stock_inicial=2)
    res = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 5}])
    assert res.status_code == 409
    assert res.json() == {
        "detail": "Stock insuficiente para: POCO (disponible: 2, solicitado: 5)",
        "code": "STOCK_INSUFICIENTE",
    }


def test_stock_insuficiente_al_confirmar_no_cambia_nada(client, admin_headers, cliente_headers):
    """Si un ítem no alcanza, ningún ítem se descuenta (transacción única)."""
    ok = crear_producto(client, admin_headers, sku="OK", stock_inicial=10)
    escaso = crear_producto(client, admin_headers, sku="ESCASO", stock_inicial=3)
    venta = crear_venta(client, cliente_headers, [{"producto_id": ok["id"], "cantidad": 4}, {"producto_id": escaso["id"], "cantidad": 3}]).json()

    # Mientras tanto se pierde stock del producto escaso
    client.post("/api/v1/inventario/movimientos", headers=admin_headers, json={"producto_id": escaso["id"], "tipo": "SALIDA", "cantidad": 2, "motivo": "Daño"})

    res = client.post(f"{API}/{venta['id']}/confirmar", headers=cliente_headers)
    assert res.status_code == 409 and res.json()["code"] == "STOCK_INSUFICIENTE"
    assert "ESCASO (disponible: 1, solicitado: 3)" in res.json()["detail"]
    assert stock(client, admin_headers, ok["id"]) == 10
    assert client.get(f"{API}/{venta['id']}", headers=cliente_headers).json()["estado"] == "PENDIENTE"


def test_confirmaciones_concurrentes_no_sobrevenden(admin_user, client, admin_headers, cliente_headers, db):
    """Dos ventas compiten por las últimas 5 unidades: solo una puede confirmarse."""
    from app.core.db import SessionLocal
    from app.core.errors import ConflictError
    from app.models import Usuario
    from app.services.venta import VentaService

    p = crear_producto(client, admin_headers, stock_inicial=5)
    v1 = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 4}]).json()
    v2 = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 4}]).json()

    barrera = threading.Barrier(2)
    resultados = []

    def confirmar(venta_id):
        session = SessionLocal()
        try:
            usuario = session.get(Usuario, admin_user.id)
            barrera.wait()
            VentaService(session).confirmar(venta_id, usuario)
            resultados.append("ok")
        except ConflictError as exc:
            resultados.append(exc.code)
        finally:
            session.close()

    hilos = [threading.Thread(target=confirmar, args=(v["id"],)) for v in (v1, v2)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    assert sorted(resultados) == ["STOCK_INSUFICIENTE", "ok"]
    assert stock(client, admin_headers, p["id"]) == 1


def test_precio_queda_congelado_en_la_venta(client, admin_headers, cliente_headers):
    p = crear_producto(client, admin_headers, stock_inicial=5, precio_venta="1000.00")
    venta = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 1}]).json()
    client.patch(f"/api/v1/productos/{p['id']}", headers=admin_headers, json={"precio_venta": "5000.00"})
    assert client.get(f"{API}/{venta['id']}", headers=admin_headers).json()["total"] == "1000.00"


def test_no_se_vende_producto_inactivo(client, admin_headers, cliente_headers):
    p = crear_producto(client, admin_headers, stock_inicial=5)
    client.delete(f"/api/v1/productos/{p['id']}", headers=admin_headers)
    assert crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 1}]).status_code == 404


# ------------------------------------------------------------------ permisos
def test_cliente_solo_ve_sus_ventas(client, admin_headers, cliente_headers, otro_cliente_headers):
    p = crear_producto(client, admin_headers, stock_inicial=10)
    mia = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 1}]).json()
    ajena = crear_venta(client, otro_cliente_headers, [{"producto_id": p["id"], "cantidad": 1}]).json()

    res = client.get(API, headers=cliente_headers).json()
    assert [v["id"] for v in res["items"]] == [mia["id"]]
    # cliente_id en query no le permite ver otras
    assert client.get(API, headers=cliente_headers, params={"cliente_id": ajena["cliente"]["id"]}).json()["total"] == 1

    assert client.get(f"{API}/{ajena['id']}", headers=cliente_headers).status_code == 404
    assert client.post(f"{API}/{ajena['id']}/confirmar", headers=cliente_headers).status_code == 404
    assert client.get(API, headers=admin_headers).json()["total"] == 2


def test_cliente_ignora_cliente_id_y_compra_a_su_nombre(client, admin_headers, cliente_headers, otro_cliente_headers):
    p = crear_producto(client, admin_headers, stock_inicial=10)
    otro = client.get("/api/v1/auth/me", headers=otro_cliente_headers).json()["cliente"]
    venta = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 1}], cliente_id=otro["id"]).json()
    assert venta["cliente"]["documento"] == "1001"


def test_admin_crea_venta_para_cliente(client, admin_headers):
    p = crear_producto(client, admin_headers, stock_inicial=10)
    res = crear_venta(client, admin_headers, [{"producto_id": p["id"], "cantidad": 1}])
    assert res.status_code == 400 and res.json()["code"] == "CLIENTE_REQUERIDO"

    cliente = client.post("/api/v1/clientes", headers=admin_headers, json={"documento": "9001", "nombre": "Mostrador"}).json()
    res = crear_venta(client, admin_headers, [{"producto_id": p["id"], "cantidad": 1}], cliente_id=cliente["id"])
    assert res.status_code == 201
    assert client.post(f"{API}/{res.json()['id']}/confirmar", headers=admin_headers).status_code == 200


def test_cliente_no_puede_anular_ni_facturar(client, admin_headers, cliente_headers):
    _, venta = venta_pagada(client, admin_headers, cliente_headers)
    assert client.post(f"{API}/{venta['id']}/anular", headers=cliente_headers, json={"motivo": "No la quiero"}).status_code == 403
    assert client.post(f"{API}/{venta['id']}/factura", headers=cliente_headers).status_code == 403


def test_sin_token_no_compra(client):
    assert client.post(API, json={"items": [{"producto_id": 1, "cantidad": 1}]}).status_code == 401


# ------------------------------------------------------------------ anulación
def test_anular_venta_pagada_revierte_stock(client, admin_headers, cliente_headers):
    p, venta = venta_pagada(client, admin_headers, cliente_headers, cantidad=4)
    assert stock(client, admin_headers, p["id"]) == 6

    res = client.post(f"{API}/{venta['id']}/anular", headers=admin_headers, json={"motivo": "Devolución"})
    assert res.status_code == 200
    body = res.json()
    assert body["estado"] == "ANULADA" and body["motivo_anulacion"] == "Devolución" and body["anulada_at"]
    assert stock(client, admin_headers, p["id"]) == 10

    movs = client.get("/api/v1/inventario/movimientos", headers=admin_headers, params={"venta_id": venta["id"], "tipo": "ENTRADA"}).json()
    assert movs["total"] == 1 and movs["items"][0]["cantidad"] == 4

    res = client.post(f"{API}/{venta['id']}/anular", headers=admin_headers, json={"motivo": "Otra vez"})
    assert res.status_code == 409 and res.json()["code"] == "ESTADO_INVALIDO"
    assert client.post(f"{API}/{venta['id']}/confirmar", headers=admin_headers).status_code == 409


def test_anular_pendiente_no_mueve_stock(client, admin_headers, cliente_headers):
    p = crear_producto(client, admin_headers, stock_inicial=10)
    venta = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 3}]).json()
    client.post(f"{API}/{venta['id']}/anular", headers=admin_headers, json={"motivo": "Cancelada"})
    assert stock(client, admin_headers, p["id"]) == 10
    movs = client.get("/api/v1/inventario/movimientos", headers=admin_headers, params={"venta_id": venta["id"]}).json()
    assert movs["total"] == 0


def test_eliminar_solo_pendientes(client, admin_headers, cliente_headers):
    p = crear_producto(client, admin_headers, sku="E-1", stock_inicial=10)
    pendiente = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 1}]).json()
    assert client.delete(f"{API}/{pendiente['id']}", headers=admin_headers).status_code == 204
    assert client.get(f"{API}/{pendiente['id']}", headers=admin_headers).status_code == 404

    _, pagada = venta_pagada(client, admin_headers, cliente_headers, sku="E-2")
    res = client.delete(f"{API}/{pagada['id']}", headers=admin_headers)
    assert res.status_code == 409 and res.json()["code"] == "VENTA_NO_ELIMINABLE"


# ------------------------------------------------------------------ facturas
def test_generar_factura_de_venta_pagada(client, admin_headers, cliente_headers):
    _, venta = venta_pagada(client, admin_headers, cliente_headers, cantidad=3, precio="3333.33")
    res = client.post(f"{API}/{venta['id']}/factura", headers=admin_headers)
    assert res.status_code == 201, res.text
    f = res.json()
    assert f["numero"] == "FAC-000001"
    assert f["subtotal"] == "9999.99"
    assert f["porcentaje_iva"] == "19.00"
    assert f["impuestos"] == "1900.00"  # 9999.99 * 0.19 = 1899.9981 → 1900.00
    assert Decimal(f["total"]) == Decimal(f["subtotal"]) + Decimal(f["impuestos"])
    assert len(f["detalles"]) == 1 and f["cliente"]["documento"] == "1001"

    v = client.get(f"{API}/{venta['id']}", headers=cliente_headers).json()
    assert v["factura_id"] == f["id"] and v["numero_factura"] == "FAC-000001"

    res = client.post(f"{API}/{venta['id']}/factura", headers=admin_headers)
    assert res.status_code == 409 and res.json()["code"] == "FACTURA_EXISTENTE"


def test_factura_requiere_venta_pagada_y_consecutivo(client, admin_headers, cliente_headers):
    p = crear_producto(client, admin_headers, sku="F-0", stock_inicial=10)
    pendiente = crear_venta(client, cliente_headers, [{"producto_id": p["id"], "cantidad": 1}]).json()
    res = client.post(f"{API}/{pendiente['id']}/factura", headers=admin_headers)
    assert res.status_code == 409 and res.json()["code"] == "VENTA_NO_PAGADA"

    _, v1 = venta_pagada(client, admin_headers, cliente_headers, sku="F-1")
    _, v2 = venta_pagada(client, admin_headers, cliente_headers, sku="F-2")
    n1 = client.post(f"{API}/{v1['id']}/factura", headers=admin_headers).json()["numero"]
    n2 = client.post(f"{API}/{v2['id']}/factura", headers=admin_headers).json()["numero"]
    assert (n1, n2) == ("FAC-000001", "FAC-000002")


def test_anular_venta_facturada_anula_factura(client, admin_headers, cliente_headers):
    p, venta = venta_pagada(client, admin_headers, cliente_headers)
    factura = client.post(f"{API}/{venta['id']}/factura", headers=admin_headers).json()
    client.post(f"{API}/{venta['id']}/anular", headers=admin_headers, json={"motivo": "Error en el pedido"})

    f = client.get(f"/api/v1/facturas/{factura['id']}", headers=admin_headers).json()
    assert f["anulada"] is True and f["anulada_at"]
    assert stock(client, admin_headers, p["id"]) == 10
    assert client.delete(f"{API}/{venta['id']}", headers=admin_headers).status_code == 409


def test_cliente_solo_ve_sus_facturas(client, admin_headers, cliente_headers, otro_cliente_headers):
    _, v1 = venta_pagada(client, admin_headers, cliente_headers, sku="C-1")
    _, v2 = venta_pagada(client, admin_headers, otro_cliente_headers, sku="C-2")
    f1 = client.post(f"{API}/{v1['id']}/factura", headers=admin_headers).json()
    f2 = client.post(f"{API}/{v2['id']}/factura", headers=admin_headers).json()

    res = client.get("/api/v1/facturas", headers=cliente_headers).json()
    assert [f["id"] for f in res["items"]] == [f1["id"]]
    assert client.get(f"/api/v1/facturas/{f2['id']}", headers=cliente_headers).status_code == 404
    assert client.get(f"/api/v1/facturas/{f1['id']}", headers=cliente_headers).status_code == 200

    todas = client.get("/api/v1/facturas", headers=admin_headers, params={"search": "FAC-000002"}).json()
    assert todas["total"] == 1
