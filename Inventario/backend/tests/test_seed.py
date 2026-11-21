from app.core.config import settings
from app.seed import CLIENTE_DEMO_EMAIL, CLIENTE_DEMO_PASSWORD, run
from tests.conftest import auth_header, login


def test_seed_es_idempotente_y_deja_datos_usables(db, client):
    run(db)
    run(db)  # segunda vez no falla ni duplica

    admin = auth_header(login(client, settings.ADMIN_EMAIL, settings.ADMIN_PASSWORD)["access_token"])
    assert client.get("/api/v1/productos", headers=admin).json()["total"] == 8
    assert client.get("/api/v1/ventas", headers=admin).json()["total"] == 3
    assert client.get("/api/v1/facturas", headers=admin).json()["items"][0]["numero"] == "FAC-000001"
    alertas = {i["sku"] for i in client.get("/api/v1/inventario/alertas", headers=admin).json()["items"]}
    assert alertas == {"PAP-003", "TEC-002", "ASE-001"}

    cliente = auth_header(login(client, CLIENTE_DEMO_EMAIL, CLIENTE_DEMO_PASSWORD)["access_token"])
    assert client.get("/api/v1/ventas", headers=cliente).json()["total"] == 2
