"""Pruebas del conector DGT accidentes."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.domain.accidents import RoadAccident
from atlashabita.infrastructure.ingestion.dgt_accidentes import (
    AccidentRecord,
    DgtAccidentesConnector,
    parse_accidents_payload,
)
from atlashabita.infrastructure.ingestion.downloader import Downloader

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"

CSV_OK = (
    "municipality_code,name,period,accidents_total,fatalities,serious_injuries,slight_injuries\n"
    "28079,Madrid,2024,9482,32,348,11420\n"
    "08019,Barcelona,2024,7164,22,275,8520\n"
)

CSV_SEMICOLON = (
    "municipality_code;name;period;accidents_total;fatalities;serious_injuries;slight_injuries\n"
    "41091;Sevilla;2024;2810;11;118;3260\n"
)


def test_parse_csv_con_coma() -> None:
    records = parse_accidents_payload(CSV_OK)
    assert len(records) == 2
    assert records[0].municipality_code == "28079"
    assert records[0].accidents_total == 9482
    assert records[1].name == "Barcelona"


def test_parse_csv_con_punto_y_coma() -> None:
    records = parse_accidents_payload(CSV_SEMICOLON)
    assert records[0].municipality_code == "41091"
    assert records[0].fatalities == 11


def test_parse_falla_si_falta_columna() -> None:
    csv_text = "municipality_code,period,accidents_total\n28079,2024,100\n"
    with pytest.raises(ValueError, match="columnas obligatorias"):
        parse_accidents_payload(csv_text)


def test_parse_falla_si_conteo_negativo() -> None:
    csv_text = (
        "municipality_code,name,period,accidents_total,fatalities,serious_injuries,slight_injuries\n"
        "28079,Madrid,2024,-1,0,0,0\n"
    )
    with pytest.raises(ValueError, match="dgt_accidentes"):
        parse_accidents_payload(csv_text)


def test_parse_falla_si_periodo_vacio() -> None:
    csv_text = (
        "municipality_code,name,period,accidents_total,fatalities,serious_injuries,slight_injuries\n"
        "28079,Madrid,,10,0,0,0\n"
    )
    with pytest.raises(ValueError, match="periodo"):
        parse_accidents_payload(csv_text)


def test_record_to_domain_calcula_tasa() -> None:
    record = AccidentRecord(
        municipality_code="28079",
        name="Madrid",
        period="2024",
        accidents_total=9482,
        fatalities=32,
        serious_injuries=348,
        slight_injuries=11420,
    )
    accident = record.to_domain(source_id="dgt_accidentes")
    assert isinstance(accident, RoadAccident)
    rate = accident.rate_per_1000(3_305_408)
    assert rate == pytest.approx(2.868, abs=0.05)
    assert accident.total_victims == 32 + 348 + 11420


def test_connector_integra_csv_cacheado(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    connector = DgtAccidentesConnector(downloader, fixture_dir=FIXTURE_DIR)
    records = connector.parse(connector.fetch())
    assert len(records) >= 10
    assert all(record.accidents_total >= 0 for record in records)
    rows = connector.to_csv_rows(records)
    assert {"municipality_code", "period", "accidents_total"} <= set(rows[0].keys())
