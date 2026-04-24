"""Contrato de ``/sources``."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_listar_fuentes_incluye_mivau(api_client: TestClient) -> None:
    response = api_client.get("/sources")
    assert response.status_code == 200
    ids = {source["id"] for source in response.json()}
    assert "mivau_serpavi" in ids
    assert "aemet_opendata" in ids


def test_obtener_fuente_devuelve_metadatos(api_client: TestClient) -> None:
    response = api_client.get("/sources/mivau_serpavi")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "mivau_serpavi"
    assert body["license"] == "CC BY 4.0"
    assert "rent_median" in body["indicators"]


def test_obtener_fuente_inexistente_devuelve_503(api_client: TestClient) -> None:
    response = api_client.get("/sources/zombie")
    assert response.status_code == 503
    body = response.json()
    assert body["error"] == "SOURCE_UNAVAILABLE"
    assert body["details"]["source_id"] == "zombie"
