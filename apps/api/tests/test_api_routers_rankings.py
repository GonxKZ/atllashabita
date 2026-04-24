"""Contrato de ``/rankings`` y ``/rankings/custom``."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_ranking_remote_work_ordena_municipios(api_client: TestClient) -> None:
    response = api_client.get("/rankings", params={"profile": "remote_work", "limit": 20})

    assert response.status_code == 200
    body = response.json()
    assert body["profile"] == "remote_work"
    assert body["scope"] == "es"
    results = body["results"]
    assert len(results) == 20
    scores = [entry["score"] for entry in results]
    assert scores == sorted(scores, reverse=True)
    assert results[0]["rank"] == 1
    assert results[-1]["rank"] == 20


def test_ranking_perfil_inexistente_devuelve_400(api_client: TestClient) -> None:
    response = api_client.get("/rankings", params={"profile": "nope"})
    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "INVALID_PROFILE"
    assert body["details"]["profile"] == "nope"


def test_ranking_filtra_por_provincia(api_client: TestClient) -> None:
    response = api_client.get(
        "/rankings", params={"profile": "remote_work", "scope": "province:41"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["scope"] == "province:41"
    names = [entry["name"] for entry in body["results"]]
    assert names and set(names).issubset({"Sevilla", "Dos Hermanas", "Alcalá de Guadaíra"})


def test_ranking_rechaza_scope_invalido(api_client: TestClient) -> None:
    response = api_client.get("/rankings", params={"profile": "remote_work", "scope": "bogus:99"})
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_SCOPE"


def test_ranking_custom_usa_pesos_personalizados(api_client: TestClient) -> None:
    payload = {
        "profile": "remote_work",
        "scope": "es",
        "weights": {"broadband_coverage": 0.9, "rent_median": 0.1},
        "limit": 5,
    }
    response = api_client.post("/rankings/custom", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert len(body["results"]) == 5
    top = body["results"][0]
    assert "top_contributions" in top
    assert len(top["top_contributions"]) <= 3


def test_ranking_custom_perfil_invalido(api_client: TestClient) -> None:
    response = api_client.post("/rankings/custom", json={"profile": "nope", "weights": {}})
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_PROFILE"


def test_ranking_respeta_request_max_limit(api_client: TestClient) -> None:
    response = api_client.get("/rankings", params={"profile": "remote_work", "limit": 10_000})
    # No debería devolver 422: se recorta al request_max_limit (200 por defecto).
    assert response.status_code == 200
