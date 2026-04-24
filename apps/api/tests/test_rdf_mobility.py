"""Pruebas de emisión RDF para flujos de movilidad MITMA.

Construye un :class:`MobilityDataset` sintético (no depende del seed real
extendido, todavía pendiente de ingesta por parte de TM1) y comprueba que
``GraphBuilder`` emite las tripletas esperadas para ``ah:MobilityFlow``,
incluyendo la alineación con SOSA y QB.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import URIRef
from rdflib.namespace import RDF, XSD

from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader
from atlashabita.infrastructure.rdf import AH, GraphBuilder, URIBuilder
from atlashabita.infrastructure.rdf.graph_builder import (
    GRAPH_MOBILITY,
    MobilityDataset,
    MobilityFlowRecord,
)
from atlashabita.infrastructure.rdf.namespaces import QB, SOSA

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def dataset() -> SeedDataset:
    return SeedLoader(SEED_DIR).load()


@pytest.fixture(scope="module")
def mobility() -> MobilityDataset:
    """Tres flujos sintéticos entre municipios reales del seed."""
    flows = (
        MobilityFlowRecord(
            origin="municipality:41091",
            destination="municipality:41038",
            period="2024",
            trips=12500.0,
            source_id="mitma_om",
            mode="all",
            distance_km=12.4,
        ),
        MobilityFlowRecord(
            origin="municipality:41091",
            destination="municipality:41038",
            period="2024",
            trips=4200.0,
            source_id="mitma_om",
            mode="public_transit",
        ),
        MobilityFlowRecord(
            origin="municipality:41038",
            destination="municipality:41091",
            period="2024",
            trips=11800.0,
            source_id="mitma_om",
            mode="all",
        ),
    )
    return MobilityDataset(flows=flows)


def test_emite_clase_mobility_flow(dataset: SeedDataset, mobility: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=mobility)
    flows = list(graph.subjects(RDF.type, AH.MobilityFlow))
    assert len(flows) == 3


def test_emite_alineacion_sosa_y_qb(dataset: SeedDataset, mobility: MobilityDataset) -> None:
    """Cada flujo declara también ``sosa:Observation`` y ``qb:Observation``."""
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=mobility)
    flow_uri = URIRef(BASE + "resource/flow/41091/41038/2024/all")
    assert (flow_uri, RDF.type, SOSA.Observation) in graph
    assert (flow_uri, RDF.type, QB.Observation) in graph


def test_flujo_emite_origin_destino_y_trips(
    dataset: SeedDataset, mobility: MobilityDataset
) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=mobility)
    flow_uri = URIRef(BASE + "resource/flow/41091/41038/2024/all")
    origins = list(graph.objects(flow_uri, AH.flowOrigin))
    destinations = list(graph.objects(flow_uri, AH.flowDestination))
    assert origins == [URIRef(BASE + "resource/territory/municipality/41091")]
    assert destinations == [URIRef(BASE + "resource/territory/municipality/41038")]
    trips = list(graph.objects(flow_uri, AH.flowTrips))
    assert trips
    assert trips[0].datatype == XSD.decimal


def test_uri_diferente_por_modo(dataset: SeedDataset, mobility: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=mobility)
    all_modes = URIRef(BASE + "resource/flow/41091/41038/2024/all")
    transit = URIRef(BASE + "resource/flow/41091/41038/2024/public_transit")
    assert (all_modes, RDF.type, AH.MobilityFlow) in graph
    assert (transit, RDF.type, AH.MobilityFlow) in graph
    assert all_modes != transit


def test_named_graph_de_movilidad(dataset: SeedDataset, mobility: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    ds = builder.build(dataset, mobility=mobility)
    identifiers = {str(g.identifier) for g in ds.graphs() if len(g) > 0}
    assert f"{BASE}graph/{GRAPH_MOBILITY}" in identifiers


def test_build_sin_mobility_no_emite_flujos(dataset: SeedDataset) -> None:
    """Compatibilidad: la build clásica no debe contener flujos M11."""
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset)
    assert not list(graph.subjects(RDF.type, AH.MobilityFlow))


def test_mobility_dataset_vacio_es_idempotente(dataset: SeedDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    g1 = builder.build_graph(dataset)
    g2 = builder.build_graph(dataset, mobility=MobilityDataset())
    assert len(g1) == len(g2)


def test_origen_o_destino_sin_kind_se_ignora(dataset: SeedDataset) -> None:
    """Un registro mal formado no rompe la build, simplemente se omite."""
    builder = GraphBuilder(URIBuilder(BASE))
    bad = MobilityDataset(
        flows=(
            MobilityFlowRecord(
                origin="invalid_no_colon",
                destination="municipality:41091",
                period="2024",
                trips=1.0,
                source_id="mitma_om",
            ),
        )
    )
    graph = builder.build_graph(dataset, mobility=bad)
    assert not list(graph.subjects(RDF.type, AH.MobilityFlow))


def test_seed_extendido_contiene_flujos() -> None:
    """El seed extendido publicado por TM1 incluye los flujos MITMA."""
    csv_path = SEED_DIR / "mobility_flows.csv"
    assert csv_path.exists(), "TM1 ya debería haber publicado mobility_flows.csv"
    rows = csv_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(rows) > 1, "El CSV debe contener al menos una fila de datos"
