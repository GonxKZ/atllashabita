"""Contrato de ``/quality/reports``."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_reporte_de_calidad_resume_datasets(api_client: TestClient) -> None:
    response = api_client.get("/quality/reports")
    assert response.status_code == 200
    body = response.json()
    assert body["data_version"].startswith("seed:")
    municipalities = body["tables"]["municipalities"]
    indicators = body["tables"]["indicators"]
    expected_observations = municipalities * indicators
    assert municipalities >= 100
    assert indicators >= 9
    assert body["tables"]["sources"] >= 5
    assert body["tables"]["observations"] == expected_observations
    assert body["observations_by_quality"]["ok"] == expected_observations
    assert body["coverage"]["expected_observations"] == expected_observations
    assert body["coverage"]["actual_observations"] == expected_observations
    assert body["coverage"]["ratio"] == 1.0
    assert isinstance(body["warnings"], list)
