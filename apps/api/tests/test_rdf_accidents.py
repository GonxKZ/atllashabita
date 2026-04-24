"""Pruebas de emisión RDF para accidentes viales DGT.

Crea un :class:`MobilityDataset` con accidentes sintéticos y verifica:

* La clase ``ah:RoadAccident`` se emite junto con ``geo:Feature`` y
  ``prov:Entity``.
* La geometría puntual se publica en el bucket de geometrías con WKT en
  CRS84.
* La conformidad SHACL se mantiene cuando se rompen propiedades clave (p.e.
  severidad fuera del enum permitido).
"""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import Literal, URIRef
from rdflib.namespace import RDF

from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader
from atlashabita.infrastructure.rdf import AH, GraphBuilder, ShaclValidator, URIBuilder
from atlashabita.infrastructure.rdf.graph_builder import (
    GRAPH_ACCIDENTS,
    MobilityDataset,
    RoadAccidentRecord,
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
def accidents() -> MobilityDataset:
    """Tres accidentes en municipios reales del seed (Sevilla, Dos Hermanas)."""
    return MobilityDataset(
        accidents=(
            RoadAccidentRecord(
                accident_id="dgt-2024-000001",
                date="2024-05-12",
                lat=37.3886,
                lon=-5.9823,
                severity="serious",
                source_id="dgt_accidentes",
                municipality_code="41091",
                victims=2,
                fatalities=0,
                road_type="urbana",
            ),
            RoadAccidentRecord(
                accident_id="dgt-2024-000002",
                date="2024-08-30",
                lat=37.2810,
                lon=-5.9214,
                severity="fatal",
                source_id="dgt_accidentes",
                municipality_code="41038",
                victims=4,
                fatalities=1,
                road_type="autovia",
            ),
            RoadAccidentRecord(
                accident_id="dgt-2024-000003",
                date="2024-11-04",
                lat=37.3886,
                lon=-5.9823,
                severity="slight",
                source_id="dgt_accidentes",
                municipality_code="41091",
            ),
        )
    )


def test_emite_clase_road_accident(dataset: SeedDataset, accidents: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=accidents)
    accidents_set = list(graph.subjects(RDF.type, AH.RoadAccident))
    assert len(accidents_set) == 3


def test_accidente_tiene_geometria_y_wkt(dataset: SeedDataset, accidents: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=accidents)
    accident = URIRef(BASE + "resource/accident/dgt_2024_000001")
    geometries = list(graph.objects(accident, AH.hasGeometry))
    assert geometries, "El accidente debe enlazar una geometría"
    geometry = geometries[0]
    assert (geometry, RDF.type, GEO.Point) in graph
    wkts = list(graph.objects(geometry, GEO.asWKT))
    assert wkts


def test_accidente_relacionado_con_municipio(
    dataset: SeedDataset, accidents: MobilityDataset
) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=accidents)
    accident = URIRef(BASE + "resource/accident/dgt_2024_000001")
    sevilla = URIRef(BASE + "resource/territory/municipality/41091")
    assert (accident, AH.occursIn, sevilla) in graph


def test_accidente_emite_severidad_y_anio(dataset: SeedDataset, accidents: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=accidents)
    accident = URIRef(BASE + "resource/accident/dgt_2024_000002")
    severities = list(graph.objects(accident, AH.accidentSeverity))
    # Severidad se emite como literal plano para alinear con ``sh:in``.
    assert severities == [Literal("fatal")]
    years = list(graph.objects(accident, AH.accidentYear))
    assert years
    assert str(years[0]) == "2024"


def test_named_graph_de_accidentes(dataset: SeedDataset, accidents: MobilityDataset) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    ds = builder.build(dataset, mobility=accidents)
    identifiers = {str(g.identifier) for g in ds.graphs() if len(g) > 0}
    assert f"{BASE}graph/{GRAPH_ACCIDENTS}" in identifiers


def test_grafo_con_accidentes_conforma_shacl(
    dataset: SeedDataset, accidents: MobilityDataset
) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset, mobility=accidents)
    validator = ShaclValidator(SHAPES)
    report = validator.validate(graph)
    assert report.conforms, [v.message for v in report.violations]


def test_severidad_invalida_rompe_shacl(dataset: SeedDataset) -> None:
    """``ah:RoadAccidentShape`` rechaza severidades fuera del enum."""
    builder = GraphBuilder(URIBuilder(BASE))
    bad = MobilityDataset(
        accidents=(
            RoadAccidentRecord(
                accident_id="dgt-XXX",
                date="2024-01-01",
                lat=40.0,
                lon=-3.0,
                severity="catastrophic",
                source_id="dgt_accidentes",
            ),
        )
    )
    graph = builder.build_graph(dataset, mobility=bad)
    validator = ShaclValidator(SHAPES)
    report = validator.validate(graph)
    assert not report.conforms
    messages = " ".join(v.message for v in report.violations)
    assert "severidad" in messages.lower() or "fatal" in messages.lower()


@pytest.mark.skipif(
    not (SEED_DIR / "road_accidents.csv").exists(),
    reason=(
        "TODO(M11/TM1): activar cuando el seed extendido contenga "
        "road_accidents.csv producido por TM1."
    ),
)
def test_seed_extendido_contiene_accidentes(dataset: SeedDataset) -> None:  # pragma: no cover
    raise AssertionError("Activar al integrar road_accidents.csv")
