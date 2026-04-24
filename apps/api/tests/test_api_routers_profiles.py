"""Contrato de ``GET /profiles``."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_profiles_lista_todos_los_perfiles(api_client: TestClient) -> None:
    response = api_client.get("/profiles")

    assert response.status_code == 200
    body = response.json()
    ids = {profile["id"] for profile in body}
    assert {"remote_work", "family", "student"}.issubset(ids)
    for profile in body:
        assert 0.99 < sum(profile["weights"].values()) < 1.01


def test_profiles_responde_con_descripcion_legible(api_client: TestClient) -> None:
    response = api_client.get("/profiles")
    assert response.status_code == 200
    remote = next(p for p in response.json() if p["id"] == "remote_work")
    assert "conectividad" in remote["description"].lower()
