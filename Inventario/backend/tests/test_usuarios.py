from tests.conftest import auth_header, login

API = "/api/v1/usuarios"


def test_cliente_no_puede_gestionar_usuarios(client, cliente_headers):
    res = client.get(API, headers=cliente_headers)
    assert res.status_code == 403
    assert res.json()["code"] == "FORBIDDEN"


def test_admin_crud_usuarios(client, admin_headers):
    res = client.post(
        API,
        headers=admin_headers,
        json={"email": "otro.admin@inventario.com", "password": "Clave123*", "nombre": "Otro Admin", "rol": "ADMIN"},
    )
    assert res.status_code == 201
    nuevo = res.json()

    res = client.get(API, headers=admin_headers, params={"rol": "ADMIN", "sort": "-id"})
    body = res.json()
    assert body["total"] == 2
    assert body["items"][0]["id"] == nuevo["id"]
    assert body["pages"] == 1

    res = client.get(API, headers=admin_headers, params={"search": "otro"})
    assert res.json()["total"] == 1

    res = client.patch(f"{API}/{nuevo['id']}", headers=admin_headers, json={"nombre": "Renombrado"})
    assert res.json()["nombre"] == "Renombrado"

    assert client.delete(f"{API}/{nuevo['id']}", headers=admin_headers).status_code == 204
    assert client.get(f"{API}/{nuevo['id']}", headers=admin_headers).json()["activo"] is False

    res = client.post("/api/v1/auth/login", json={"email": "otro.admin@inventario.com", "password": "Clave123*"})
    assert res.status_code == 403
    assert res.json()["code"] == "USUARIO_INACTIVO"


def test_usuario_desactivado_pierde_acceso_con_token_vigente(client, admin_headers):
    client.post(
        API,
        headers=admin_headers,
        json={"email": "temp@inventario.com", "password": "Clave123*", "nombre": "Temporal", "rol": "CLIENTE"},
    )
    token = login(client, "temp@inventario.com", "Clave123*")["access_token"]
    usuario_id = client.get("/api/v1/auth/me", headers=auth_header(token)).json()["id"]
    client.delete(f"{API}/{usuario_id}", headers=admin_headers)
    res = client.get("/api/v1/auth/me", headers=auth_header(token))
    assert res.status_code == 403


def test_admin_no_puede_desactivarse(client, admin_headers, admin_user):
    res = client.delete(f"{API}/{admin_user.id}", headers=admin_headers)
    assert res.status_code == 409


def test_email_duplicado_y_sort_invalido(client, admin_headers):
    res = client.post(
        API, headers=admin_headers, json={"email": "admin@test.com", "password": "Clave123*", "nombre": "X Y"}
    )
    assert res.status_code == 409
    res = client.get(API, headers=admin_headers, params={"sort": "password_hash"})
    assert res.status_code == 400
    assert res.json()["code"] == "INVALID_SORT"


def test_usuario_inexistente(client, admin_headers):
    res = client.get(f"{API}/9999", headers=admin_headers)
    assert res.status_code == 404
    assert res.json() == {"detail": "Usuario no encontrado", "code": "NOT_FOUND"}
