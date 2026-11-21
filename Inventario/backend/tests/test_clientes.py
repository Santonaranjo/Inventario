API = "/api/v1/clientes"

CLIENTE = {"tipo_documento": "CC", "documento": "900100", "nombre": "Tienda La 23", "email": "tienda@correo.com"}


def test_cliente_no_accede_a_clientes(client, cliente_headers):
    assert client.get(API, headers=cliente_headers).status_code == 403


def test_admin_crud_clientes(client, admin_headers):
    res = client.post(API, headers=admin_headers, json=CLIENTE)
    assert res.status_code == 201
    cid = res.json()["id"]

    res = client.post(API, headers=admin_headers, json=CLIENTE)
    assert res.status_code == 409
    assert res.json()["code"] == "DOCUMENTO_DUPLICADO"

    res = client.patch(f"{API}/{cid}", headers=admin_headers, json={"telefono": "3001234567"})
    assert res.json()["telefono"] == "3001234567"

    res = client.get(API, headers=admin_headers, params={"search": "la 23"})
    assert res.json()["total"] == 1

    assert client.delete(f"{API}/{cid}", headers=admin_headers).status_code == 204
    res = client.get(API, headers=admin_headers, params={"activo": False})
    assert [c["id"] for c in res.json()["items"]] == [cid]


def test_vincular_usuario(client, admin_headers, admin_user, cliente_headers):
    # El cliente registrado ya está vinculado → no se puede vincular a otra ficha.
    usuario_cliente = client.get("/api/v1/auth/me", headers=cliente_headers).json()
    res = client.post(API, headers=admin_headers, json={**CLIENTE, "usuario_id": usuario_cliente["id"]})
    assert res.status_code == 409
    assert res.json()["code"] == "USUARIO_YA_VINCULADO"

    # Un ADMIN no puede vincularse como cliente.
    res = client.post(API, headers=admin_headers, json={**CLIENTE, "usuario_id": admin_user.id})
    assert res.status_code == 400
    assert res.json()["code"] == "USUARIO_NO_CLIENTE"
