"""Contrato de los endpoints ``/sparql`` y ``/sparql/catalog``."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from atlashabita.config import Settings
from atlashabita.interfaces.api import create_app

REPO_SEED_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture()
def capped_settings() -> Settings:
    """Configuración con ``sparql_max_results`` reducido para verificar el tope."""
    return Settings(
        env="test",
        data_root=REPO_SEED_ROOT / "data",
        ontology_root=REPO_SEED_ROOT / "ontology",
        rate_limit_rpm=10_000,
        sparql_max_results=2,
    )


@pytest.fixture()
def capped_client(capped_settings: Settings) -> Iterator[TestClient]:
    app = create_app(capped_settings)
    with TestClient(app) as client:
        yield client


def test_sparql_catalog_lista_las_consultas(api_client: TestClient) -> None:
    response = api_client.get("/sparql/catalog")
    assert response.status_code == 200
    body = response.json()
    ids = {entry["query_id"] for entry in body["queries"]}
    assert {
        "top_scores_by_profile",
        "municipalities_by_province",
        "indicators_for_territory",
        "sources_used_by_territory",
        "count_triples_by_class",
        "indicator_definition",
        "mobility_flow_between",
        "accidents_in_radius",
        "transit_stops_in_municipality",
        "risk_index",
    } == ids
    for entry in body["queries"]:
        assert isinstance(entry["description"], str)
        assert entry["description"].strip() != ""


def test_sparql_ejecuta_municipios_por_provincia(api_client: TestClient) -> None:
    response = api_client.post(
        "/sparql",
        json={
            "query_id": "municipalities_by_province",
            "bindings": {"province_code": "41"},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["query_id"] == "municipalities_by_province"
    assert isinstance(body["elapsed_ms"], int)
    codes = {row["code"] for row in body["rows"]}
    assert codes == {"41091", "41038", "41004"}


def test_sparql_indicadores_de_territorio(api_client: TestClient) -> None:
    response = api_client.post(
        "/sparql",
        json={
            "query_id": "indicators_for_territory",
            "bindings": {"territory_id": "municipality:41091"},
        },
    )
    assert response.status_code == 200
    labels = {row["label"] for row in response.json()["rows"]}
    assert "Alquiler mediano" in labels


def test_sparql_top_scores_por_perfil(api_client: TestClient) -> None:
    response = api_client.post(
        "/sparql",
        json={
            "query_id": "top_scores_by_profile",
            "bindings": {"profile_id": "remote_work", "limit": 3},
        },
    )
    assert response.status_code == 200
    rows = response.json()["rows"]
    assert 1 <= len(rows) <= 3
    scores = [row["score"] for row in rows]
    assert scores == sorted(scores, reverse=True)


def test_sparql_count_triples_by_class(api_client: TestClient) -> None:
    response = api_client.post(
        "/sparql",
        json={"query_id": "count_triples_by_class", "bindings": {}},
    )
    assert response.status_code == 200
    body = response.json()
    rows = {row["class"]: row["total"] for row in body["rows"]}
    assert "https://data.atlashabita.example/ontology/Municipality" in rows


def test_sparql_indicator_definition(api_client: TestClient) -> None:
    response = api_client.post(
        "/sparql",
        json={
            "query_id": "indicator_definition",
            "bindings": {"indicator_code": "rent_median"},
        },
    )
    assert response.status_code == 200
    rows = response.json()["rows"]
    assert len(rows) == 1
    assert rows[0]["label"] == "Alquiler mediano"


def test_sparql_query_id_inexistente_devuelve_invalid_query(api_client: TestClient) -> None:
    response = api_client.post(
        "/sparql",
        json={"query_id": "drop_all_triples", "bindings": {}},
    )
    # Pydantic rechaza el Literal antes de llegar al caso de uso → 422.
    assert response.status_code in (400, 422)


def test_sparql_bindings_obligatorio_faltante(api_client: TestClient) -> None:
    response = api_client.post(
        "/sparql",
        json={"query_id": "municipalities_by_province", "bindings": {}},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "INVALID_BINDINGS"
    assert body["details"]["binding"] == "province_code"


def test_sparql_max_results_se_respeta(capped_client: TestClient) -> None:
    response = capped_client.post(
        "/sparql",
        json={
            "query_id": "top_scores_by_profile",
            "bindings": {"profile_id": "remote_work", "limit": 50},
        },
    )
    assert response.status_code == 200
    rows = response.json()["rows"]
    assert len(rows) <= 2
