"""Pruebas del conector INE Atlas de Renta."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.infrastructure.ingestion.downloader import Downloader
from atlashabita.infrastructure.ingestion.ine_atlas_renta import (
    IneAtlasRentaConnector,
    parse_income_payload,
)

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"


def test_parse_valida_campos_obligatorios() -> None:
    rows = [
        {
            "municipality_code": "28079",
            "name": "Madrid",
            "net_income_per_capita": 18500,
            "gini": 32.1,
        }
    ]
    records = parse_income_payload(rows, period="2024")
    assert records[0].municipality_code == "28079"
    assert records[0].net_income_per_capita == pytest.approx(18500.0)
    assert records[0].period == "2024"


def test_parse_falla_si_falta_renta() -> None:
    with pytest.raises(ValueError, match="ine_atlas_renta"):
        parse_income_payload(
            [{"municipality_code": "1", "name": "x"}],
            period="2024",
        )


def test_connector_integra_payload_cacheado(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    connector = IneAtlasRentaConnector(downloader, fixture_dir=FIXTURE_DIR)
    records = connector.parse(connector.fetch())
    assert len(records) >= 5
    assert all(record.net_income_per_capita > 0 for record in records)
