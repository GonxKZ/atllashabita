"""Pruebas del conector CRTM Madrid (GTFS multimodal)."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.domain.transit import TransitMode, TransitRoute, TransitStop
from atlashabita.infrastructure.ingestion.crtm_madrid import (
    CrtmMadridConnector,
    parse_crtm_payload,
)
from atlashabita.infrastructure.ingestion.downloader import Downloader

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"


def test_parse_genera_paradas_y_rutas() -> None:
    payload = {
        "agency_id": "crtm",
        "stops": [
            {
                "stop_id": "MAD-SOL",
                "name": "Sol",
                "lat": 40.4170,
                "lon": -3.7038,
                "mode": "metro",
                "municipality_code": "28079",
            }
        ],
        "routes": [
            {
                "route_id": "M1",
                "short_name": "L1",
                "long_name": "Pinar de Chamartín - Valdecarros",
                "mode": "metro",
                "stop_ids": ["MAD-SOL"],
            }
        ],
    }
    result = parse_crtm_payload(payload)
    assert len(result.stops) == 1
    assert result.stops[0].stop_id == "MAD-SOL"
    assert result.stops[0].mode == "metro"
    assert len(result.routes) == 1
    assert result.routes[0].stop_ids == ("MAD-SOL",)


def test_parse_falla_con_modo_desconocido() -> None:
    payload = {
        "stops": [
            {
                "stop_id": "X",
                "name": "X",
                "lat": 0.0,
                "lon": 0.0,
                "mode": "rocket",
                "municipality_code": "28079",
            }
        ]
    }
    with pytest.raises(ValueError, match="modo de transporte"):
        parse_crtm_payload(payload)


def test_parse_falla_si_coordenadas_fuera_de_rango() -> None:
    payload = {
        "stops": [
            {
                "stop_id": "X",
                "name": "X",
                "lat": 200.0,
                "lon": 0.0,
                "mode": "metro",
                "municipality_code": "28079",
            }
        ]
    }
    with pytest.raises(ValueError, match="coordenadas"):
        parse_crtm_payload(payload)


def test_parse_falla_si_ruta_no_tiene_nombre() -> None:
    payload = {
        "stops": [],
        "routes": [{"route_id": "X", "mode": "bus", "stop_ids": []}],
    }
    with pytest.raises(ValueError, match="short_name"):
        parse_crtm_payload(payload)


def test_record_to_domain_devuelve_transit_stop_y_route() -> None:
    payload = {
        "stops": [
            {
                "stop_id": "MAD-SOL",
                "name": "Sol",
                "lat": 40.4170,
                "lon": -3.7038,
                "mode": "metro",
                "municipality_code": "28079",
            }
        ],
        "routes": [
            {
                "route_id": "M1",
                "short_name": "L1",
                "long_name": "Pinar - Valdecarros",
                "mode": "metro",
                "stop_ids": ["MAD-SOL"],
            }
        ],
    }
    result = parse_crtm_payload(payload)
    stop = result.stops[0].to_domain(source_id="crtm_gtfs")
    assert isinstance(stop, TransitStop)
    assert stop.location.lat == pytest.approx(40.4170)
    route = result.routes[0].to_domain(source_id="crtm_gtfs")
    assert isinstance(route, TransitRoute)
    assert route.mode is TransitMode.METRO


def test_connector_integra_payload_cacheado(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    connector = CrtmMadridConnector(downloader, fixture_dir=FIXTURE_DIR)
    payload = connector.parse(connector.fetch())
    stops = payload.stops
    routes = payload.routes
    assert len(stops) >= 10
    assert any(stop.municipality_code == "28079" for stop in stops)
    assert any(route.short_name.startswith("C-") for route in routes)
    rows = connector.to_csv_rows(stops)
    assert {"stop_id", "lat", "lon", "mode", "municipality_code"} <= set(rows[0].keys())
