"""Pruebas de las consultas SPARQL extendidas en el milestone M11.

Cubren las cuatro consultas nuevas:

* ``mobility_flow_between(origin, destination, period)``
* ``accidents_in_radius(lat, lon, km, year)``
* ``transit_stops_in_municipality(municipality_code)``
* ``risk_index(municipality_code)`` — agregación accidentes+flujos.

Como los CSV reales todavía no están en ``data/seed`` cuando esta rama se
integra (TM1 los produce en otra rama), los tests construyen el grafo
sintéticamente reusando los DTOs ``MobilityFlowRecord``/``RoadAccidentRecord``
y verifican el comportamiento de las consultas SPARQL contra el grafo
combinado.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import Graph

from atlashabita.config import Settings
from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import GraphBuilder, SparqlRunner, URIBuilder
from atlashabita.infrastructure.rdf.graph_builder import (
    MobilityDataset,
    MobilityFlowRecord,
    RoadAccidentRecord,
    TransitRouteRecord,
    TransitStopRecord,
)

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
BASE = "https://data.atlashabita.example/"


def _build_full_dataset() -> MobilityDataset:
    """Conjunto sintético cubriendo flujos, accidentes y transporte."""
    flows = (
        MobilityFlowRecord(
            origin="municipality:41091",
            destination="municipality:41038",
            period="2024",
            trips=15000.0,
            source_id="mitma_om",
            mode="all",
        ),
        MobilityFlowRecord(
            origin="municipality:41091",
            destination="municipality:41004",
            period="2024",
            trips=4500.0,
            source_id="mitma_om",
            mode="all",
        ),
        MobilityFlowRecord(
            origin="municipality:41091",
            destination="municipality:41038",
            period="2025",
            trips=16500.0,
            source_id="mitma_om",
            mode="all",
        ),
    )
    accidents = (
        RoadAccidentRecord(
            accident_id="dgt-2024-A",
            date="2024-03-10",
            lat=37.3886,
            lon=-5.9823,
            severity="serious",
            source_id="dgt_accidentes",
            municipality_code="41091",
            victims=2,
            fatalities=0,
        ),
        RoadAccidentRecord(
            accident_id="dgt-2024-B",
            date="2024-07-21",
            lat=37.4000,
            lon=-5.9700,
            severity="slight",
            source_id="dgt_accidentes",
            municipality_code="41091",
            victims=1,
            fatalities=0,
        ),
        RoadAccidentRecord(
            accident_id="dgt-2025-C",
            date="2025-02-02",
            lat=37.5500,
            lon=-5.5000,
            severity="fatal",
            source_id="dgt_accidentes",
            municipality_code="41091",
            victims=3,
            fatalities=1,
        ),
        RoadAccidentRecord(
            accident_id="dgt-2024-D",
            date="2024-09-15",
            lat=40.4193,
            lon=-3.6929,
            severity="slight",
            source_id="dgt_accidentes",
            municipality_code="28079",
        ),
    )
    stops = (
        TransitStopRecord(
            operator="tussam_sevilla",
            stop_id="2001",
            name="Avenida de la Constitución",
            lat=37.3870,
            lon=-5.9930,
            source_id="tussam_gtfs",
            municipality_code="41091",
        ),
        TransitStopRecord(
            operator="tussam_sevilla",
            stop_id="2002",
            name="Reyes Católicos",
            lat=37.3900,
            lon=-5.9970,
            source_id="tussam_gtfs",
            municipality_code="41091",
        ),
    )
    routes = (
        TransitRouteRecord(
            operator="tussam_sevilla",
            route_id="C5",
            short_name="C5",
            long_name="Circular Centro",
            mode="bus",
            source_id="tussam_gtfs",
            stop_ids=("2001", "2002"),
        ),
    )
    return MobilityDataset(
        flows=flows,
        accidents=accidents,
        transit_stops=stops,
        transit_routes=routes,
    )


@pytest.fixture(scope="module")
def graph() -> Graph:
    dataset = SeedLoader(SEED_DIR).load()
    return GraphBuilder(URIBuilder(BASE)).build_graph(dataset, mobility=_build_full_dataset())


@pytest.fixture()
def settings() -> Settings:
    return Settings()


def test_mobility_flow_between_devuelve_flujo(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.mobility_flow_between("41091", "41038", "2024")
    assert rows
    first = rows[0]
    assert first["trips"] == pytest.approx(15000.0)
    assert first["period"] == "2024"


def test_mobility_flow_between_filtra_por_periodo(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows_2024 = runner.mobility_flow_between("41091", "41038", "2024")
    rows_2025 = runner.mobility_flow_between("41091", "41038", "2025")
    trips_2024 = {row["trips"] for row in rows_2024}
    trips_2025 = {row["trips"] for row in rows_2025}
    assert trips_2024 != trips_2025


def test_mobility_flow_between_rechaza_periodo_invalido(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="period"):
        runner.mobility_flow_between("41091", "41038", "2024 OR 1=1")


def test_accidents_in_radius_devuelve_proximos(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.accidents_in_radius(37.3886, -5.9823, 5.0)
    ids = {row["id"] for row in rows}
    # dgt-2024-A está exactamente en el centro, dgt-2024-B muy cerca.
    assert "dgt-2024-A" in ids
    assert "dgt-2024-B" in ids
    # El accidente de Madrid no debe entrar en un radio de 5km en Sevilla.
    assert "dgt-2024-D" not in ids


def test_accidents_in_radius_filtra_por_anio(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows_2024 = runner.accidents_in_radius(37.3886, -5.9823, 100.0, year=2024)
    ids_2024 = {row["id"] for row in rows_2024}
    assert "dgt-2024-A" in ids_2024
    assert "dgt-2025-C" not in ids_2024


def test_accidents_in_radius_rechaza_radio_excesivo(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="radius_km"):
        runner.accidents_in_radius(37.0, -5.0, 5000.0)


def test_accidents_in_radius_rechaza_anio_invalido(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="year"):
        runner.accidents_in_radius(37.0, -5.0, 10.0, year=1500)


def test_transit_stops_in_municipality(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.transit_stops_in_municipality("41091")
    labels = {row["label"] for row in rows}
    assert "Avenida de la Constitución" in labels
    assert "Reyes Católicos" in labels


def test_transit_stops_in_municipality_sin_resultados(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    rows = runner.transit_stops_in_municipality("99999")
    assert rows == []


def test_risk_index_combina_accidentes_y_flujos(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    result = runner.risk_index("41091")
    assert result["code"] == "41091"
    # Tres accidentes están vinculados al municipio 41091.
    assert result["accidents"] == 3
    # Suma de fatalidades reportadas: 0 + 0 + 1 = 1.
    assert result["fatalities"] == 1
    # Hay flujos salientes desde 41091.
    assert result["outbound_flows"] >= 2
    assert result["outbound_trips"] > 0
    assert "risk_per_1000_trips" in result


def test_risk_index_municipio_sin_datos(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    result = runner.risk_index("99999")
    assert result["code"] == "99999"
    assert result["accidents"] == 0
    assert result["outbound_flows"] == 0
    assert result["risk_per_1000_trips"] == pytest.approx(0.0)


def test_risk_index_rechaza_codigo_invalido(graph: Graph, settings: Settings) -> None:
    runner = SparqlRunner(graph, settings)
    with pytest.raises(ValueError, match="municipality_code"):
        runner.risk_index("NULL); DROP TABLE")
