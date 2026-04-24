"""Pruebas del conector del INE datos abiertos (población y hogares)."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.infrastructure.ingestion.downloader import Downloader
from atlashabita.infrastructure.ingestion.ine_api import (
    IneApiConnector,
    parse_population_payload,
)

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"


def test_parse_normaliza_codigos_a_cinco_digitos() -> None:
    rows = [
        {
            "municipality_code": "79",
            "name": "Madrid",
            "population": 3_305_408,
            "households": 1_271_300,
            "household_size": 2.6,
            "period": "2025",
        }
    ]
    records = parse_population_payload(rows)
    assert records[0].municipality_code == "00079"


def test_parse_falla_con_fila_incompleta() -> None:
    with pytest.raises(ValueError, match="ine_api"):
        parse_population_payload([{"name": "solo-nombre"}])


def test_connector_devuelve_registros_desde_fixture(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    connector = IneApiConnector(downloader, fixture_dir=FIXTURE_DIR)
    payload = connector.fetch()
    assert payload.from_cache is True
    records = connector.parse(payload)
    assert len(records) >= 10
    codes = {record.municipality_code for record in records}
    assert "28079" in codes  # Madrid
    assert "08019" in codes  # Barcelona


def test_connector_exporta_filas_csv_compatibles(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    connector = IneApiConnector(downloader, fixture_dir=FIXTURE_DIR)
    records = connector.parse(connector.fetch())
    rows = connector.to_csv_rows(records)
    assert all(
        {
            "municipality_code",
            "name",
            "population",
            "households",
            "household_size",
            "period",
        }.issubset(row.keys())
        for row in rows
    )
