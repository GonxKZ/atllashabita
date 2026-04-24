"""Contrato mínimo del endpoint /health."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_devuelve_estado_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["environment"] == "test"
    assert body["version"]
