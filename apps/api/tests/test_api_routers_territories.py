"""Contrato de los endpoints ``/territories``."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_buscar_territorios_por_nombre_tolera_acentos(api_client: TestClient) -> None:
    response = api_client.get("/territories/search", params={"q": "sevilla"})
    assert response.status_code == 200
    body = response.json()
    names = {entry["name"] for entry in body}
    assert "Sevilla" in names


def test_buscar_territorios_limit_invalido_devuelve_422(api_client: TestClient) -> None:
    response = api_client.get("/territories/search", params={"q": "ma", "limit": 0})
    assert response.status_code == 422


def test_buscar_territorios_requiere_query(api_client: TestClient) -> None:
    """Sin ``q`` la API responde 422 (validación)."""
    response = api_client.get("/territories/search")
    assert response.status_code == 422


def test_ficha_de_sevilla_incluye_todos_los_indicadores(api_client: TestClient) -> None:
    response = api_client.get("/territories/municipality:41091")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Sevilla"
    assert body["type"] == "municipality"
    assert body["hierarchy"]["province"] == "Sevilla"
    assert body["hierarchy"]["autonomous_community"] == "Andalucía"
    assert len(body["indicators"]) >= 9
    scores_by_profile = {score["profile"]: score for score in body["scores"]}
    assert "remote_work" in scores_by_profile
    assert 0.0 <= scores_by_profile["remote_work"]["score"] <= 100.0


def test_ficha_de_territorio_inexistente_devuelve_404(api_client: TestClient) -> None:
    response = api_client.get("/territories/municipality:00000")
    assert response.status_code == 404
    assert response.json()["error"] == "TERRITORY_NOT_FOUND"


def test_indicadores_de_sevilla_incluyen_alquiler(api_client: TestClient) -> None:
    response = api_client.get("/territories/municipality:41091/indicators")
    assert response.status_code == 200
    codes = {entry["id"] for entry in response.json()}
    assert "rent_median" in codes
    assert "broadband_coverage" in codes
