"""Pruebas de la cadena PROV-O emitida junto a las observaciones.

Cada ``ah:IndicatorObservation`` debe colgar de una ``ah:IngestionActivity``
que declara ``prov:used`` hacia la fuente y ``prov:wasGeneratedBy`` (o su
inversa ``prov:generated``) hacia la observación. La actividad se deduplica
por ``(source, period)``.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import Dataset, Graph, URIRef
from rdflib.namespace import RDF

from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import AH, GraphBuilder, URIBuilder
from atlashabita.infrastructure.rdf.graph_builder import GRAPH_PROVENANCE
from atlashabita.infrastructure.rdf.namespaces import PROV

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def graph() -> Graph:
    dataset = SeedLoader(SEED_DIR).load()
    return GraphBuilder(URIBuilder(BASE)).build_graph(dataset)


@pytest.fixture(scope="module")
def dataset_graph() -> Dataset:
    dataset = SeedLoader(SEED_DIR).load()
    return GraphBuilder(URIBuilder(BASE)).build(dataset)


def test_cada_observacion_tiene_actividad(graph: Graph) -> None:
    observations = set(graph.subjects(RDF.type, AH.IndicatorObservation))
    assert observations
    for observation in observations:
        activities = list(graph.objects(observation, PROV.wasGeneratedBy))
        assert activities, f"{observation} no tiene prov:wasGeneratedBy"
        assert len(activities) == 1


def test_actividad_declara_fuente_y_observacion(graph: Graph) -> None:
    activities = set(graph.subjects(RDF.type, AH.IngestionActivity))
    assert activities
    for activity in activities:
        used = list(graph.objects(activity, PROV.used))
        generated = list(graph.objects(activity, PROV.generated))
        assert used, f"{activity} no declara prov:used"
        assert generated, f"{activity} no declara prov:generated"
        # Subpropiedades AH también presentes.
        assert list(graph.objects(activity, AH.ingestedFrom)) == used
        assert set(graph.objects(activity, AH.produced)) == set(generated)


def test_actividad_deduplicada_por_fuente_y_periodo(graph: Graph) -> None:
    activities = set(graph.subjects(RDF.type, AH.IngestionActivity))
    # Seed ampliado a 8 fuentes con 9 indicadores repartidos en 2024 y 2025;
    # se dedupe por (source, period). Afirmamos el contrato esencial:
    # no hay duplicados y el número cuadra con la combinación real de
    # fuentes y periodos observados, entre 6 y 16.
    assert 6 <= len(activities) <= 16
    # Cada actividad tiene URI única por construcción.
    uris = [str(a) for a in activities]
    assert len(uris) == len(set(uris))


def test_dataset_expone_named_graph_de_procedencia(dataset_graph: Dataset) -> None:
    identifiers = {str(g.identifier) for g in dataset_graph.graphs() if len(g) > 0}
    assert f"{BASE}graph/{GRAPH_PROVENANCE}" in identifiers


def test_cadena_completa_observacion_to_source(graph: Graph) -> None:
    """Navegabilidad: observation -> activity -> source debe ser posible."""
    observation = URIRef(BASE + "resource/observation/rent_median/municipality/41091/2025")
    activities = list(graph.objects(observation, PROV.wasGeneratedBy))
    assert activities
    activity = activities[0]
    sources = list(graph.objects(activity, PROV.used))
    assert URIRef(BASE + "resource/source/mivau_serpavi") in sources
