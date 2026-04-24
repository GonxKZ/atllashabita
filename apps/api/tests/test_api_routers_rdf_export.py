"""Contrato del endpoint ``GET /rdf/export``."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize(
    ("format_value", "expected_content_type"),
    [
        ("turtle", "text/turtle"),
        ("nt", "application/n-triples"),
        ("trig", "application/trig"),
        ("json-ld", "application/ld+json"),
    ],
)
def test_rdf_export_formatos(
    api_client: TestClient, format_value: str, expected_content_type: str
) -> None:
    response = api_client.get("/rdf/export", params={"format": format_value})
    assert response.status_code == 200
    assert response.headers["content-type"].split(";")[0].strip() == expected_content_type
    assert response.headers["x-atlashabita-format"] == format_value
    assert int(response.headers["content-length"]) > 0


def test_rdf_export_turtle_contiene_prefijo_ah(api_client: TestClient) -> None:
    response = api_client.get("/rdf/export", params={"format": "turtle"})
    assert response.status_code == 200
    text = response.content.decode("utf-8")
    assert "@prefix ah:" in text or "PREFIX ah:" in text


def test_rdf_export_jsonld_es_json_valido(api_client: TestClient) -> None:
    response = api_client.get("/rdf/export", params={"format": "json-ld"})
    assert response.status_code == 200
    body = json.loads(response.content.decode("utf-8"))
    assert isinstance(body, list | dict)


def test_rdf_export_formato_invalido_devuelve_422(api_client: TestClient) -> None:
    response = api_client.get("/rdf/export", params={"format": "rdfxml"})
    # Pydantic rechaza el literal antes de llegar al caso de uso.
    assert response.status_code == 422


def test_rdf_export_default_es_turtle(api_client: TestClient) -> None:
    response = api_client.get("/rdf/export")
    assert response.status_code == 200
    assert response.headers["content-type"].split(";")[0].strip() == "text/turtle"


def test_rdf_export_tamanio_razonable(api_client: TestClient) -> None:
    response = api_client.get("/rdf/export", params={"format": "nt"})
    assert response.status_code == 200
    # El dataset seed ampliado (101 municipios y 9 indicadores) genera miles
    # de triples; al serializar en N-Triples rondamos los pocos MB. Se
    # comprueba un rango laxo para no acoplar al conteo exacto.
    assert 5_000 < len(response.content) < 16_000_000
