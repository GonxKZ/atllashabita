"""Contrato de ``/quality/reports``."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_reporte_de_calidad_resume_datasets(api_client: TestClient) -> None:
    response = api_client.get("/quality/reports")
    assert response.status_code == 200
    body = response.json()
    assert body["data_version"].startswith("seed:")
    assert body["tables"]["observations"] == 50
    assert body["tables"]["indicators"] == 5
    assert body["tables"]["sources"] == 5
    assert body["tables"]["municipalities"] == 10
    assert body["observations_by_quality"]["ok"] == 50
    assert body["coverage"]["expected_observations"] == 50
    assert body["coverage"]["actual_observations"] == 50
    assert body["coverage"]["ratio"] == 1.0
    assert isinstance(body["warnings"], list)
