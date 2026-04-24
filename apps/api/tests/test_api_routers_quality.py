"""Contrato de ``/quality/reports``."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_reporte_de_calidad_resume_datasets(api_client: TestClient) -> None:
    response = api_client.get("/quality/reports")
    assert response.status_code == 200
    body = response.json()
    assert body["generated_at"]
    datasets = {row["dataset"] for row in body["rows"]}
    assert {"observations", "territories", "sources"}.issubset(datasets)
    observations_row = next(row for row in body["rows"] if row["dataset"] == "observations")
    assert observations_row["total_rows"] == 50
    assert observations_row["quality_ok"] == 50
