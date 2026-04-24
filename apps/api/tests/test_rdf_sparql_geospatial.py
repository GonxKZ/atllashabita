"""Pruebas de la capa SPARQL geoespacial y las nuevas consultas de M8 Fase B.

Cubre:

* ``territories_within_radius`` — valida Haversine contra el seed real y un
  centro próximo a Sevilla con 80 km de radio.
* ``top_by_composite_score`` — ranking con agregación SPARQL.
* ``indicators_timeseries`` — serie temporal ordenada por periodo.
* ``provenance_chain`` — cadena PROV-O desde una observación conocida.
* Validaciones de seguridad contra inputs maliciosos/inválidos.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import Graph

from atlashabita.config import Settings
from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import GraphBuilder, SparqlRunner, URIBuilder

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


def test_territories_within_radius_desde_sevilla(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    # Centroide de Sevilla: 37.3886 / -5.9823 ; radio 80 km debe capturar
    # Sevilla capital, Dos Hermanas y Alcalá de Guadaíra, pero no los
    # municipios de Málaga (que están a > 150 km) ni los del País Vasco.
    rows = runner.territories_within_radius(37.3886, -5.9823, 80.0)
    codes = {row["code"] for row in rows}
    assert "41091" in codes  # Sevilla
    assert "41038" in codes  # Dos Hermanas
    assert "41004" in codes  # Alcalá de Guadaíra
    # Málaga ciudad queda fuera del radio.
    assert "29067" not in codes
    assert "20069" not in codes  # Donostia/San Sebastián
    # Todas las distancias devueltas <= 80.
    assert all(float(row["distance_km"]) <= 80.0 for row in rows)


def test_territories_within_radius_rechaza_latitud_fuera(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="lat"):
        runner.territories_within_radius(120.0, 0.0, 10.0)


def test_territories_within_radius_rechaza_radio_negativo(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="radius_km"):
        runner.territories_within_radius(37.0, -5.9, -1.0)


def test_top_by_composite_score_devuelve_ranking(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.top_by_composite_score("remote_work", limit=5)
    assert rows
    scores = [row["score"] for row in rows]
    assert scores == sorted(scores, reverse=True)
    assert all(0.0 <= row["score"] <= 100.0 for row in rows)
    # Esperamos hasta 5 indicadores por municipio (todos los del perfil).
    assert all(row["indicators"] >= 1 for row in rows)


def test_indicators_timeseries_ordenada(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.indicators_timeseries("municipality:41091", "rent_median")
    assert rows
    periods = [row["period"] for row in rows]
    assert periods == sorted(periods)


def test_indicators_timeseries_requiere_territorio_valido(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="territory_id"):
        runner.indicators_timeseries("malformed", "rent_median")


def test_provenance_chain_devuelve_fuente(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    observation = BASE + "resource/observation/rent_median/municipality/41091/2025"
    chain = runner.provenance_chain(observation)
    assert chain["observation"] == observation
    assert chain["source"] is not None
    assert chain["source_title"]
    assert chain["activity"] is not None
    assert chain["period"] == "2025"


def test_provenance_chain_rechaza_uri_no_canonica(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="observation_uri"):
        runner.provenance_chain("https://example.com/other")


def test_provenance_chain_rechaza_inyeccion(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    malicious = (
        BASE
        + "resource/observation/rent_median/municipality/41091/2025> . DELETE WHERE {?s ?p ?o} #"
    )
    # El patrón de periodo rechaza el segmento inyectado antes de llegar al SPARQL.
    with pytest.raises(ValueError, match=r"period|observation_uri"):
        runner.provenance_chain(malicious)
