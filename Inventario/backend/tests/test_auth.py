from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, CLIENTE_PASSWORD, auth_header, login, registrar_cliente

API = "/api/v1"


def test_registro_crea_usuario_cliente_con_ficha(client):
    data = registrar_cliente(client, "Nuevo@Correo.com", "555")
    assert data["token_type"] == "bearer"
    assert data["usuario"]["rol"] == "CLIENTE"
    assert data["usuario"]["email"] == "nuevo@correo.com"  # se normaliza a minúsculas

    me = client.get(f"{API}/auth/me", headers=auth_header(data["access_token"])).json()
    assert me["cliente"]["documento"] == "555"


def test_registro_email_duplicado(client):
    registrar_cliente(client, "dup@correo.com", "111")
    res = client.post(
        f"{API}/auth/register",
        json={"email": "dup@correo.com", "password": "Clave123*", "nombre": "Otro", "documento": "222"},
    )
    assert res.status_code == 409
    assert res.json()["code"] == "EMAIL_DUPLICADO"

    res = client.post(
        f"{API}/auth/register",
        json={"email": "otro@correo.com", "password": "Clave123*", "nombre": "Otro", "documento": "111"},
    )
    assert res.status_code == 409
    assert res.json()["code"] == "DOCUMENTO_DUPLICADO"


def test_registro_valida_datos(client):
    res = client.post(f"{API}/auth/register", json={"email": "no-es-email", "password": "123"})
    assert res.status_code == 422
    body = res.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert {e["campo"] for e in body["errors"]} >= {"email", "password", "nombre", "documento"}


def test_login_ok_y_credenciales_invalidas(client, admin_user):
    data = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert data["usuario"]["rol"] == "ADMIN"
    assert data["expires_in"] > 0

    res = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "mala"})
    assert res.status_code == 401
    assert res.json()["code"] == "CREDENCIALES_INVALIDAS"


def test_me_requiere_token(client):
    res = client.get(f"{API}/auth/me")
    assert res.status_code == 401
    assert res.json()["code"] == "NOT_AUTHENTICATED"

    res = client.get(f"{API}/auth/me", headers=auth_header("token-falso"))
    assert res.status_code == 401
    assert res.json()["code"] == "TOKEN_INVALIDO"


def test_refresh_rota_tokens_y_detecta_reuso(client, admin_user):
    tokens = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    res = client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert res.status_code == 200
    nuevos = res.json()
    assert nuevos["refresh_token"] != tokens["refresh_token"]

    # Reusar el refresh viejo → revocado, y además invalida el nuevo.
    res = client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert res.status_code == 401
    assert res.json()["code"] == "TOKEN_REVOCADO"
    res = client.post(f"{API}/auth/refresh", json={"refresh_token": nuevos["refresh_token"]})
    assert res.status_code == 401


def test_refresh_no_acepta_access_token(client, admin_user):
    tokens = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    res = client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert res.status_code == 401
    assert res.json()["code"] == "TOKEN_INVALIDO"


def test_logout_revoca_refresh(client, admin_user):
    tokens = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert client.post(f"{API}/auth/logout", json={"refresh_token": tokens["refresh_token"]}).status_code == 204
    res = client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert res.status_code == 401


def test_actualizar_perfil_y_password(client):
    data = registrar_cliente(client, "perfil@correo.com", "777")
    headers = auth_header(data["access_token"])

    res = client.patch(f"{API}/auth/me", headers=headers, json={"telefono": "3001112233", "nombre": "Nombre Nuevo"})
    assert res.status_code == 200
    assert res.json()["cliente"]["telefono"] == "3001112233"
    assert res.json()["nombre"] == "Nombre Nuevo"

    res = client.patch(f"{API}/auth/me", headers=headers, json={"password_actual": "mala", "password_nuevo": "Nueva123*"})
    assert res.status_code == 400
    assert res.json()["code"] == "PASSWORD_INCORRECTO"

    res = client.patch(
        f"{API}/auth/me", headers=headers, json={"password_actual": CLIENTE_PASSWORD, "password_nuevo": "Nueva123*"}
    )
    assert res.status_code == 200
    login(client, "perfil@correo.com", "Nueva123*")
