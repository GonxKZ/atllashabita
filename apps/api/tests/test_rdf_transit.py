"""Pruebas de emisión RDF para paradas y rutas de transporte público.

Prueba la conexión paradas-rutas (``ah:servesStop``), la geometría puntual
de las paradas, y la conformidad SHACL de las shapes ``ah:TransitStopShape``
y ``ah:TransitRouteShape``.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import URIRef
from rdflib.namespace import RDF

from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader
from atlashabita.infrastructure.rdf import AH, GraphBuilder, ShaclValidator, URIBuilder
from atlashabita.infrastructure.rdf.graph_builder import (
    GRAPH_TRANSIT,
    MobilityDataset,
    TransitRouteRecord,
    TransitStopRecord,
)
from atlashabita.infrastructure.rdf.namespaces import GEO

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
SHAPES = ROOT / "ontology" / "shapes.ttl"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def dataset() -> SeedDataset:
    return SeedLoader(SEED_DIR).load()


@pytest.fixture(scope="module")
def transit() -> MobilityDataset:
    """Dos paradas y una ruta sintéticas de operadores reales (CRTM/EMT)."""
    stops = (
        TransitStopRecord(
            operator="emt_madrid",
            stop_id="1001",
            name="Plaza de Cibeles",
            lat=40.4193,
            lon=-3.6929,
            source_id="emt_gtfs",
            code="C1",
            municipality_code="28079",
        ),
        TransitStopRecord(
            operator="emt_madrid",
            stop_id="1002",
            name="Atocha",
            lat=40.4063,
            lon=-3.6906,
            source_id="emt_gtfs",
            code="A1",
            municipality_code="28079",
        ),
    )
    routes = (
        TransitRouteRecord(
            operator="emt_madrid",
            route_id="L27",
            short_name="27",
            long_name="Plaza de Cibeles - Atocha",
            mode="bus",
            source_id="emt_gtfs",
            stop_ids=("1001", "1002"),
        ),
    )
    return MobilityDataset(transit_stops=stops, transit_routes=routes)


def test_emite_paradas_de_transporte(dataset: SeedDataset, transit: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=transit)
    stops = list(graph.subjects(RDF.type, AH.TransitStop))
    assert len(stops) == 2


def test_emite_rutas_de_transporte(dataset: SeedDataset, transit: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=transit)
    routes = list(graph.subjects(RDF.type, AH.TransitRoute))
    assert len(routes) == 1


def test_ruta_sirve_a_paradas(dataset: SeedDataset, transit: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=transit)
    route = URIRef(BASE + "resource/transit_route/emt_madrid/L27")
    served = set(graph.objects(route, AH.servesStop))
    assert {
        URIRef(BASE + "resource/transit_stop/emt_madrid/1001"),
        URIRef(BASE + "resource/transit_stop/emt_madrid/1002"),
    } == served


def test_paradas_tienen_geometria_puntual(dataset: SeedDataset, transit: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=transit)
    stop = URIRef(BASE + "resource/transit_stop/emt_madrid/1001")
    geometries = list(graph.objects(stop, AH.hasGeometry))
    assert geometries
    geometry = geometries[0]
    assert (geometry, RDF.type, GEO.Point) in graph


def test_named_graph_de_transito(dataset: SeedDataset, transit: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    ds = builder.build(dataset, mobility=transit)
    identifiers = {str(g.identifier) for g in ds.graphs() if len(g) > 0}
    assert f"{BASE}graph/{GRAPH_TRANSIT}" in identifiers


def test_grafo_con_transit_conforma_shacl(dataset: SeedDataset, transit: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=transit)
    validator = ShaclValidator(SHAPES)
    report = validator.validate(graph)
    assert report.conforms, [v.message for v in report.violations]


def test_modo_invalido_rompe_shacl(dataset: SeedDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    bad = MobilityDataset(
        transit_routes=(
            TransitRouteRecord(
                operator="emt_madrid",
                route_id="X",
                short_name="X",
                long_name="Invalid",
                mode="hyperloop",  # no permitido por la shape
                source_id="emt_gtfs",
            ),
        ),
    )
    graph = builder.build_graph(dataset, mobility=bad)
    validator = ShaclValidator(SHAPES)
    report = validator.validate(graph)
    assert not report.conforms
    messages = " ".join(v.message for v in report.violations)
    assert "modo" in messages.lower() or "transit" in messages.lower() or "GTFS" in messages


@pytest.mark.skipif(
    not (SEED_DIR / "transit_stops.csv").exists(),
    reason=(
        "TODO(M11/TM1): activar cuando el seed extendido contenga "
        "transit_stops.csv producido por TM1."
    ),
)
def test_seed_extendido_contiene_paradas(dataset: SeedDataset) -> None:  # pragma: no cover
    raise AssertionError("Activar al integrar transit_stops.csv")
