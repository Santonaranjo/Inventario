def test_health_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["database"] == "ok"


def test_ruta_inexistente_formato_error(client):
    res = client.get("/api/v1/no-existe")
    assert res.status_code == 404
    assert res.json() == {"detail": "Recurso no encontrado", "code": "NOT_FOUND"}


def test_openapi_disponible(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"]
