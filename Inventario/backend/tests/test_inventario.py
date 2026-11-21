API = "/api/v1/inventario"


def crear_producto(client, headers, sku="INV-001", stock_inicial=0, stock_minimo=0, **extra) -> dict:
    res = client.post(
        "/api/v1/productos",
        headers=headers,
        json={
            "sku": sku,
            "nombre": f"Producto {sku}",
            "precio_venta": "1000.00",
            "costo": "600.00",
            "stock_inicial": stock_inicial,
            "stock_minimo": stock_minimo,
            **extra,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_producto_nuevo_crea_inventario_y_entrada_inicial(client, admin_headers):
    p = crear_producto(client, admin_headers, stock_inicial=25, stock_minimo=5)
    assert p["stock"] == 25 and p["stock_minimo"] == 5

    movs = client.get(f"{API}/movimientos", headers=admin_headers, params={"producto_id": p["id"]}).json()
    assert movs["total"] == 1
    m = movs["items"][0]
    assert (m["tipo"], m["cantidad"], m["stock_anterior"], m["stock_nuevo"]) == ("ENTRADA", 25, 0, 25)
    assert m["motivo"] == "Stock inicial" and m["usuario_nombre"] == "Admin"


def test_entrada_salida_y_ajuste(client, admin_headers):
    p = crear_producto(client, admin_headers, stock_inicial=10)
    pid = p["id"]

    res = client.post(f"{API}/movimientos", headers=admin_headers, json={"producto_id": pid, "tipo": "ENTRADA", "cantidad": 5, "motivo": "Compra"})
    assert res.status_code == 201 and res.json()["stock_nuevo"] == 15

    res = client.post(f"{API}/movimientos", headers=admin_headers, json={"producto_id": pid, "tipo": "SALIDA", "cantidad": 3, "motivo": "Merma"})
    assert res.json()["stock_nuevo"] == 12

    res = client.post(f"{API}/movimientos", headers=admin_headers, json={"producto_id": pid, "tipo": "AJUSTE", "stock_nuevo": 9, "motivo": "Conteo físico"})
    assert res.status_code == 201
    assert (res.json()["cantidad"], res.json()["stock_anterior"], res.json()["stock_nuevo"]) == (3, 12, 9)

    assert client.get(f"{API}/{pid}", headers=admin_headers).json()["stock"] == 9
    assert client.get(f"{API}/movimientos", headers=admin_headers, params={"tipo": "AJUSTE"}).json()["total"] == 1


def test_salida_mayor_al_stock_da_409(client, admin_headers):
    p = crear_producto(client, admin_headers, stock_inicial=2)
    res = client.post(f"{API}/movimientos", headers=admin_headers, json={"producto_id": p["id"], "tipo": "SALIDA", "cantidad": 5, "motivo": "Merma"})
    assert res.status_code == 409
    assert res.json()["code"] == "STOCK_INSUFICIENTE"
    assert "disponible: 2" in res.json()["detail"]
    assert client.get(f"{API}/{p['id']}", headers=admin_headers).json()["stock"] == 2


def test_validaciones_de_movimiento(client, admin_headers):
    p = crear_producto(client, admin_headers, stock_inicial=4)
    res = client.post(f"{API}/movimientos", headers=admin_headers, json={"producto_id": p["id"], "tipo": "AJUSTE", "motivo": "Sin stock nuevo"})
    assert res.status_code == 422
    res = client.post(f"{API}/movimientos", headers=admin_headers, json={"producto_id": p["id"], "tipo": "AJUSTE", "stock_nuevo": 4, "motivo": "Igual"})
    assert res.status_code == 400 and res.json()["code"] == "AJUSTE_SIN_CAMBIO"
    res = client.post(f"{API}/movimientos", headers=admin_headers, json={"producto_id": 999, "tipo": "ENTRADA", "cantidad": 1, "motivo": "X12"})
    assert res.status_code == 404


def test_alertas_stock_minimo(client, admin_headers):
    critico = crear_producto(client, admin_headers, sku="A-1", stock_inicial=0, stock_minimo=5)
    en_limite = crear_producto(client, admin_headers, sku="A-2", stock_inicial=5, stock_minimo=5)
    holgado = crear_producto(client, admin_headers, sku="A-3", stock_inicial=50, stock_minimo=5)
    inactivo = crear_producto(client, admin_headers, sku="A-4", stock_inicial=0, stock_minimo=5)
    client.delete(f"/api/v1/productos/{inactivo['id']}", headers=admin_headers)

    res = client.get(f"{API}/alertas", headers=admin_headers).json()
    assert [i["producto_id"] for i in res["items"]] == [critico["id"], en_limite["id"]]
    assert all(i["en_alerta"] for i in res["items"])

    # Subir el mínimo de A-3 lo pone en alerta
    client.patch(f"{API}/{holgado['id']}", headers=admin_headers, json={"stock_minimo": 60})
    assert client.get(f"{API}/alertas", headers=admin_headers).json()["total"] == 3


def test_inventario_solo_admin(client, cliente_headers):
    assert client.get(API, headers=cliente_headers).status_code == 403
    assert client.get(f"{API}/alertas", headers=cliente_headers).status_code == 403
    res = client.post(f"{API}/movimientos", headers=cliente_headers, json={"producto_id": 1, "tipo": "ENTRADA", "cantidad": 1, "motivo": "Hack"})
    assert res.status_code == 403
