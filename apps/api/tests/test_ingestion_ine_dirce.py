"""Pruebas del conector DIRCE del INE."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.infrastructure.ingestion.downloader import Downloader
from atlashabita.infrastructure.ingestion.ine_dirce import (
    IneDirceConnector,
    parse_dirce_payload,
)

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"


def test_parse_convierte_enteros_y_densidad() -> None:
    rows = [
        {
            "municipality_code": "28079",
            "name": "Madrid",
            "active_enterprises": 313_800,
            "enterprises_per_1k": 95.0,
        }
    ]
    records = parse_dirce_payload(rows, period="2024")
    assert records[0].active_enterprises == 313_800
    assert records[0].enterprises_per_1k == pytest.approx(95.0)


def test_parse_falla_si_falta_active_enterprises() -> None:
    with pytest.raises(ValueError, match="ine_dirce"):
        parse_dirce_payload(
            [{"municipality_code": "1", "name": "x", "enterprises_per_1k": 10.0}],
            period="2024",
        )


def test_connector_desde_fixture(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    connector = IneDirceConnector(downloader, fixture_dir=FIXTURE_DIR)
    records = connector.parse(connector.fetch())
    assert len(records) >= 5
    assert all(record.enterprises_per_1k > 0 for record in records)
