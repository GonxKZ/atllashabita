"""Contrato de ``/map/layers`` y ``/map/layers/{id}``."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_listar_capas_incluye_broadband_coverage(api_client: TestClient) -> None:
    response = api_client.get("/map/layers")
    assert response.status_code == 200
    ids = {layer["id"] for layer in response.json()}
    assert "broadband_coverage" in ids
    assert "score_remote_work" in ids


def test_obtener_capa_devuelve_featurecollection(api_client: TestClient) -> None:
    response = api_client.get("/map/layers/broadband_coverage")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert body["layer_id"] == "broadband_coverage"
    assert len(body["features"]) == 10
    sample = body["features"][0]
    assert sample["type"] == "Feature"
    assert sample["geometry"]["type"] == "Point"
    assert len(sample["geometry"]["coordinates"]) == 2
    assert "value" in sample["properties"]


def test_obtener_capa_inexistente_devuelve_400(api_client: TestClient) -> None:
    response = api_client.get("/map/layers/does_not_exist")
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_SCOPE"
