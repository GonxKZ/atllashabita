"""Pruebas unitarias del adaptador :class:`FusekiSparqlRunner`.

Se usan ``unittest.mock`` para simular el ``httpx.Client`` y no depender de
un servidor Fuseki real en CI. Cada test comprueba el formato de la
petición (URL, headers, Content-Type) y que el parsing del JSON SPARQL
Results esté alineado con el contrato W3C.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import httpx
import pytest
from rdflib import Graph

from atlashabita.config import Settings
from atlashabita.infrastructure.rdf.fuseki import (
    FusekiRequestError,
    FusekiSparqlRunner,
)
from atlashabita.infrastructure.rdf.runner_factory import get_sparql_runner
from atlashabita.infrastructure.rdf.sparql_queries import SparqlRunner


def _build_client(status_code: int = 200, payload: dict | None = None) -> MagicMock:
    response = SimpleNamespace(
        status_code=status_code,
        text="error body" if status_code >= 400 else "",
        json=lambda: payload or {"results": {"bindings": []}},
    )
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = response
    return client


@pytest.fixture()
def settings() -> Settings:
    return Settings(
        sparql_backend="fuseki",
        fuseki_base_url="http://fuseki.internal:3030",
        fuseki_dataset="atlashabita",
    )


def test_fuseki_municipalities_lanza_post_con_content_type_sparql(
    settings: Settings,
) -> None:
    payload = {
        "results": {
            "bindings": [
                {
                    "municipality": {"type": "uri", "value": "urn:m/41004"},
                    "label": {"type": "literal", "value": "Alcalá"},
                    "code": {"type": "literal", "value": "41004"},
                }
            ]
        }
    }
    client = _build_client(payload=payload)
    runner = FusekiSparqlRunner(settings=settings, client=client)

    rows = runner.municipalities_by_province("41")

    assert rows == [
        {"municipality": "urn:m/41004", "label": "Alcalá", "code": "41004"},
    ]
    client.post.assert_called_once()
    _, kwargs = client.post.call_args
    assert kwargs["headers"]["Accept"] == "application/sparql-results+json"
    assert kwargs["headers"]["Content-Type"] == "application/sparql-query"
    url = client.post.call_args.args[0]
    assert url == "http://fuseki.internal:3030/atlashabita/query"


def test_fuseki_indicators_for_territory_rechaza_id_invalido(settings: Settings) -> None:
    client = _build_client()
    runner = FusekiSparqlRunner(settings=settings, client=client)
    with pytest.raises(ValueError, match="territory_id"):
        runner.indicators_for_territory("id-sin-separador")
    client.post.assert_not_called()


def test_fuseki_top_scores_normaliza_y_agrupa(settings: Settings) -> None:
    payload = {
        "results": {
            "bindings": [
                {
                    "territory": {"type": "uri", "value": "urn:t/1"},
                    "label": {"type": "literal", "value": "Ciudad"},
                    "indicator": {"type": "uri", "value": "urn:i/rent"},
                    "value": {"type": "literal", "value": "10"},
                    "weight": {"type": "literal", "value": "0.5"},
                    "direction": {"type": "literal", "value": "lower_is_better"},
                },
                {
                    "territory": {"type": "uri", "value": "urn:t/1"},
                    "label": {"type": "literal", "value": "Ciudad"},
                    "indicator": {"type": "uri", "value": "urn:i/speed"},
                    "value": {"type": "literal", "value": "80"},
                    "weight": {"type": "literal", "value": "0.5"},
                    "direction": {"type": "literal", "value": "higher_is_better"},
                },
            ]
        }
    }
    client = _build_client(payload=payload)
    runner = FusekiSparqlRunner(settings=settings, client=client)

    rows = runner.top_scores_by_profile("remote_work", "municipality", limit=5)
    assert len(rows) == 1
    assert rows[0]["territory"] == "urn:t/1"
    assert 0 < rows[0]["score"] <= 100


def test_fuseki_error_http_propaga_fuseki_request_error(settings: Settings) -> None:
    client = _build_client(status_code=500)
    runner = FusekiSparqlRunner(settings=settings, client=client)
    with pytest.raises(FusekiRequestError, match="500"):
        runner.count_triples_by_class()


def test_fuseki_error_transporte_se_envuelve(settings: Settings) -> None:
    client = MagicMock(spec=httpx.Client)
    client.post.side_effect = httpx.ConnectError("nope", request=MagicMock())
    runner = FusekiSparqlRunner(settings=settings, client=client)
    with pytest.raises(FusekiRequestError, match="HTTP"):
        runner.municipalities_by_province("41")


def test_fuseki_indicator_definition_vacia_cuando_no_hay_filas(settings: Settings) -> None:
    client = _build_client(payload={"results": {"bindings": []}})
    runner = FusekiSparqlRunner(settings=settings, client=client)
    assert runner.indicator_definition("rent_median") == {}


def test_runner_factory_elige_fuseki_si_backend_es_fuseki() -> None:
    settings = Settings(sparql_backend="fuseki")
    fake_client = MagicMock(spec=httpx.Client)
    with patch(
        "atlashabita.infrastructure.rdf.runner_factory.httpx.Client",
        return_value=fake_client,
    ):
        runner = get_sparql_runner(Graph(), settings)
    assert isinstance(runner, FusekiSparqlRunner)


def test_runner_factory_usa_memory_por_defecto() -> None:
    settings = Settings()
    runner = get_sparql_runner(Graph(), settings)
    assert isinstance(runner, SparqlRunner)
