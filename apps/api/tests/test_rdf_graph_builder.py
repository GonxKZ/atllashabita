"""Pruebas del constructor del grafo RDF a partir del seed real."""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import Dataset, Graph, URIRef
from rdflib.namespace import RDF, XSD

from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader
from atlashabita.infrastructure.rdf import (
    AH,
    GraphBuilder,
    URIBuilder,
)
from atlashabita.infrastructure.rdf.graph_builder import (
    GRAPH_INDICATORS,
    GRAPH_OBSERVATIONS,
    GRAPH_PROFILES,
    GRAPH_SOURCES,
    GRAPH_TERRITORIES,
)

SEED_DIR = Path(__file__).resolve().parents[3] / "data" / "seed"
ONTOLOGY = Path(__file__).resolve().parents[3] / "ontology" / "atlashabita.ttl"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def dataset() -> SeedDataset:
    return SeedLoader(SEED_DIR).load()


@pytest.fixture()
def builder() -> GraphBuilder:
    return GraphBuilder(URIBuilder(BASE))


def test_build_graph_incluye_municipios(builder: GraphBuilder, dataset: SeedDataset) -> None:
    graph = builder.build_graph(dataset)
    municipalities = set(graph.subjects(RDF.type, AH.Municipality))
    assert len(municipalities) == len(dataset.municipalities)
    assert len(municipalities) >= 100


def test_build_graph_enlaza_municipio_a_provincia(
    builder: GraphBuilder, dataset: SeedDataset
) -> None:
    graph = builder.build_graph(dataset)
    sevilla = URIRef(BASE + "resource/territory/municipality/41091")
    sevilla_province = URIRef(BASE + "resource/territory/province/41")
    assert (sevilla, AH.belongsTo, sevilla_province) in graph


def test_build_graph_conecta_territorio_y_observacion(
    builder: GraphBuilder, dataset: SeedDataset
) -> None:
    graph = builder.build_graph(dataset)
    sevilla = URIRef(BASE + "resource/territory/municipality/41091")
    observations = list(graph.objects(sevilla, AH.hasIndicatorObservation))
    assert len(observations) == len(dataset.indicators)


def test_build_genera_named_graphs_por_dominio(builder: GraphBuilder, dataset: SeedDataset) -> None:
    ds = builder.build(dataset)
    identifiers = {str(g.identifier) for g in ds.graphs() if len(g) > 0}
    for domain in (
        GRAPH_TERRITORIES,
        GRAPH_INDICATORS,
        GRAPH_SOURCES,
        GRAPH_OBSERVATIONS,
        GRAPH_PROFILES,
    ):
        assert f"{BASE}graph/{domain}" in identifiers


def test_build_con_ontologia_incluye_tbox(builder: GraphBuilder, dataset: SeedDataset) -> None:
    ds = builder.build(dataset, ontology_path=ONTOLOGY)
    # La clase ``ah:Municipality`` aparece como ``owl:Class`` en la ontología.
    found = False
    for _subject, _predicate, obj, _graph in ds.quads((AH.Municipality, RDF.type, None, None)):
        if str(obj).endswith("#Class"):
            found = True
    assert found, "El named graph de ontología no contiene la clase Municipality."


def test_build_es_determinista(builder: GraphBuilder, dataset: SeedDataset) -> None:
    g1 = builder.build_graph(dataset)
    g2 = builder.build_graph(dataset)
    assert len(g1) == len(g2)
    # Comparar iso-hashable: mismos triples exactos.
    assert set(g1) == set(g2)


def test_build_graph_emite_decimales(builder: GraphBuilder, dataset: SeedDataset) -> None:
    """Valor y peso se modelan como ``xsd:decimal`` para cumplir SHACL."""
    graph = builder.build_graph(dataset)
    any_value = next(graph.objects(predicate=AH.value))
    assert getattr(any_value, "datatype", None) == XSD.decimal


def test_build_devuelve_tipos_correctos(builder: GraphBuilder, dataset: SeedDataset) -> None:
    assert isinstance(builder.build(dataset), Dataset)
    assert isinstance(builder.build_graph(dataset), Graph)
