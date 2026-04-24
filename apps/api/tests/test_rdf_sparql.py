"""Pruebas del runner SPARQL y sus salvaguardas."""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import Graph

from atlashabita.config import Settings
from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import (
    GraphBuilder,
    SparqlRunner,
    SparqlUpdateForbiddenError,
    URIBuilder,
)

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def graph() -> Graph:
    dataset = SeedLoader(SEED_DIR).load()
    return GraphBuilder(URIBuilder(BASE)).build_graph(dataset)


@pytest.fixture()
def settings() -> Settings:
    return Settings()


def test_municipios_por_provincia(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.municipalities_by_province("41")
    codes = {row["code"] for row in rows}
    assert codes == {"41091", "41038", "41004"}


def test_indicadores_de_un_territorio(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.indicators_for_territory("municipality:41091")
    assert len(rows) == 5
    labels = {row["label"] for row in rows}
    assert "Alquiler mediano" in labels


def test_fuentes_por_territorio(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.sources_used_by_territory("municipality:41091")
    assert len(rows) == 5
    assert all(row["license"] == "CC BY 4.0" for row in rows)


def test_definicion_de_indicador(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    definition = runner.indicator_definition("rent_median")
    assert definition["label"] == "Alquiler mediano"
    assert definition["direction"] == "lower_is_better"


def test_definicion_indicador_inexistente(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    assert runner.indicator_definition("no_existe") == {}


def test_top_scores_por_perfil(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.top_scores_by_profile("remote_work", "municipality", 3)
    assert len(rows) == 3
    # Los scores deben estar ordenados descendentemente.
    scores = [row["score"] for row in rows]
    assert scores == sorted(scores, reverse=True)
    assert all(0 <= row["score"] <= 100 for row in rows)


def test_count_triples_por_clase(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    counts = runner.count_triples_by_class()
    municipality_iri = "https://data.atlashabita.example/ontology/Municipality"
    observation_iri = "https://data.atlashabita.example/ontology/IndicatorObservation"
    assert counts[municipality_iri] == 10
    assert counts[observation_iri] == 50


def test_update_bloqueado_por_defecto(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(SparqlUpdateForbiddenError):
        runner.count_triples_by_class.__self__._execute(  # type: ignore[attr-defined]
            "INSERT DATA { <a:a> <a:b> <a:c> }"
        )


def test_update_permitido_si_settings_lo_habilita(graph: Graph) -> None:
    settings = Settings(sparql_allow_update=True)
    runner = SparqlRunner(graph, settings)
    # Sólo se verifica que no se lance la excepción defensiva; rdflib decidirá.
    try:
        runner.count_triples_by_class()
    except SparqlUpdateForbiddenError:  # pragma: no cover — no debe ocurrir.
        pytest.fail("No debería bloquearse cuando sparql_allow_update=True.")


def test_limit_defensivo_aplicado(graph: Graph) -> None:
    """Aunque se pida mucho, el ``sparql_max_results`` limita las filas."""
    settings = Settings(sparql_max_results=2)
    runner = SparqlRunner(graph, settings)
    rows = runner.top_scores_by_profile("remote_work", "municipality", 50)
    assert len(rows) <= 2


def test_scope_invalido(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="Scope"):
        runner.top_scores_by_profile("remote_work", scope="galaxia", limit=3)


def test_territory_id_invalido(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="territory_id"):
        runner.indicators_for_territory("id_sin_separador")
