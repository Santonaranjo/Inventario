API = "/api/v1/productos"


def crear_categoria(client, headers, nombre="Papelería") -> int:
    res = client.post("/api/v1/categorias", headers=headers, json={"nombre": nombre})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def producto_payload(**extra):
    return {"sku": "pap-001", "nombre": "Cuaderno", "precio_venta": "8500.00", "costo": "5200.50", **extra}


def test_admin_crea_producto_con_decimales(client, admin_headers):
    cat = crear_categoria(client, admin_headers)
    res = client.post(API, headers=admin_headers, json=producto_payload(categoria_id=cat))
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["sku"] == "PAP-001"  # se normaliza a mayúsculas
    assert body["precio_venta"] == "8500.00"  # Decimal viaja como string
    assert body["costo"] == "5200.50"
    assert body["categoria"]["nombre"] == "Papelería"


def test_sku_duplicado_y_validaciones(client, admin_headers):
    client.post(API, headers=admin_headers, json=producto_payload())
    res = client.post(API, headers=admin_headers, json=producto_payload(sku="PAP-001"))
    assert res.status_code == 409
    assert res.json()["code"] == "SKU_DUPLICADO"

    res = client.post(API, headers=admin_headers, json=producto_payload(sku="X-1", precio_venta="-1"))
    assert res.status_code == 422
    res = client.post(API, headers=admin_headers, json=producto_payload(sku="X-2", precio_venta="10.123"))
    assert res.status_code == 422


def test_soft_delete_y_catalogo_cliente(client, admin_headers, cliente_headers):
    p1 = client.post(API, headers=admin_headers, json=producto_payload()).json()
    p2 = client.post(API, headers=admin_headers, json=producto_payload(sku="PAP-002", nombre="Lapicero")).json()

    assert client.delete(f"{API}/{p2['id']}", headers=admin_headers).status_code == 204

    # ADMIN sigue viendo el producto inactivo
    assert client.get(f"{API}/{p2['id']}", headers=admin_headers).json()["activo"] is False
    assert client.get(API, headers=admin_headers).json()["total"] == 2

    # CLIENTE solo ve activos y sin costo
    res = client.get(API, headers=cliente_headers, params={"activo": False})
    items = res.json()["items"]
    assert [p["id"] for p in items] == [p1["id"]]
    assert items[0]["costo"] is None
    assert client.get(f"{API}/{p2['id']}", headers=cliente_headers).status_code == 404


def test_cliente_no_puede_crear_ni_editar(client, cliente_headers):
    assert client.post(API, headers=cliente_headers, json=producto_payload()).status_code == 403
    assert client.patch(f"{API}/1", headers=cliente_headers, json={"nombre": "X"}).status_code == 403
    assert client.post("/api/v1/categorias", headers=cliente_headers, json={"nombre": "X"}).status_code == 403


def test_listado_paginacion_filtros_y_orden(client, admin_headers):
    cat = crear_categoria(client, admin_headers)
    for i, precio in enumerate(["300.00", "100.00", "200.00"]):
        client.post(
            API,
            headers=admin_headers,
            json=producto_payload(sku=f"P-{i}", nombre=f"Producto {i}", precio_venta=precio, categoria_id=cat if i else None),
        )
    res = client.get(API, headers=admin_headers, params={"sort": "-precio_venta", "size": 2})
    body = res.json()
    assert body["total"] == 3 and body["pages"] == 2 and len(body["items"]) == 2
    assert [p["precio_venta"] for p in body["items"]] == ["300.00", "200.00"]

    res = client.get(API, headers=admin_headers, params={"sort": "-precio_venta", "size": 2, "page": 2})
    assert [p["precio_venta"] for p in res.json()["items"]] == ["100.00"]

    assert client.get(API, headers=admin_headers, params={"categoria_id": cat}).json()["total"] == 2
    assert client.get(API, headers=admin_headers, params={"search": "producto 1"}).json()["total"] == 1


def test_categorias_duplicada_y_visibilidad(client, admin_headers, cliente_headers):
    cat = crear_categoria(client, admin_headers, "Aseo")
    res = client.post("/api/v1/categorias", headers=admin_headers, json={"nombre": "aseo"})
    assert res.status_code == 409
    assert res.json()["code"] == "CATEGORIA_DUPLICADA"

    client.delete(f"/api/v1/categorias/{cat}", headers=admin_headers)
    assert client.get("/api/v1/categorias", headers=cliente_headers).json()["total"] == 0
    assert client.get("/api/v1/categorias", headers=admin_headers).json()["total"] == 1
