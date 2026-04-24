"""Pruebas del conector MITMA movilidad."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.domain.mobility import MobilityFlow
from atlashabita.infrastructure.ingestion.downloader import Downloader
from atlashabita.infrastructure.ingestion.mitma_movilidad import (
    MitmaMovilidadConnector,
    MobilityRecord,
    parse_mobility_payload,
)

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"


def test_parse_normaliza_codigos_y_calcula_metricas() -> None:
    rows = [
        {
            "origin_code": "28079",
            "destination_code": "28092",
            "daily_trips": 38500,
            "average_distance_km": 14.6,
            "average_duration_min": 38.2,
        }
    ]
    records = parse_mobility_payload(rows, period="2024")
    assert records[0].origin_code == "28079"
    assert records[0].destination_code == "28092"
    assert records[0].daily_trips == pytest.approx(38500.0)
    assert records[0].average_distance_km == pytest.approx(14.6)
    assert records[0].period == "2024"


def test_parse_rellena_codigo_corto_con_ceros() -> None:
    rows = [
        {
            "origin_code": "1234",
            "destination_code": "5",
            "daily_trips": 100,
            "average_distance_km": 10,
            "average_duration_min": 20,
        }
    ]
    records = parse_mobility_payload(rows, period="2024")
    assert records[0].origin_code == "01234"
    assert records[0].destination_code == "00005"


def test_parse_falla_si_metrica_es_negativa() -> None:
    with pytest.raises(ValueError, match="mitma_movilidad"):
        parse_mobility_payload(
            [
                {
                    "origin_code": "28079",
                    "destination_code": "28092",
                    "daily_trips": -10,
                    "average_distance_km": 10,
                    "average_duration_min": 20,
                }
            ],
            period="2024",
        )


def test_parse_falla_sin_columnas_obligatorias() -> None:
    with pytest.raises(ValueError, match="mitma_movilidad"):
        parse_mobility_payload([{"origin_code": "1"}], period="2024")


def test_record_to_domain_genera_objeto_valor() -> None:
    record = MobilityRecord(
        origin_code="41091",
        destination_code="41038",
        daily_trips=32400.0,
        average_distance_km=14.9,
        average_duration_min=31.2,
        period="2024",
    )
    flow = record.to_domain(source_id="mitma_movilidad")
    assert isinstance(flow, MobilityFlow)
    assert not flow.is_internal
    assert flow.identifier == "41091->41038@2024"


def test_connector_integra_payload_cacheado(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    connector = MitmaMovilidadConnector(downloader, fixture_dir=FIXTURE_DIR)
    records = connector.parse(connector.fetch())
    assert len(records) >= 30
    assert any(
        record.origin_code == "41091" and record.destination_code == "41038" for record in records
    )
    assert all(record.daily_trips >= 0 for record in records)
    rows = connector.to_csv_rows(records)
    assert {"origin_code", "destination_code", "daily_trips", "period"} <= set(rows[0].keys())
