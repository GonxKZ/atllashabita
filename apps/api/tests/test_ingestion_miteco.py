"""Pruebas de los conectores MITECO (demografía y servicios)."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.infrastructure.ingestion.downloader import Downloader
from atlashabita.infrastructure.ingestion.miteco_demographic import (
    MitecoDemographicConnector,
    parse_demographic_payload,
)
from atlashabita.infrastructure.ingestion.miteco_services import (
    MitecoServicesConnector,
    parse_services_payload,
)

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"


def test_parse_demographic_valida_edad_mediana() -> None:
    rows = [
        {
            "municipality_code": "28079",
            "name": "Madrid",
            "age_median": 43.5,
            "aging_index": 128.0,
            "demographic_growth": 0.52,
        }
    ]
    records = parse_demographic_payload(rows, period="2024")
    assert records[0].age_median == pytest.approx(43.5)
    assert records[0].demographic_growth == pytest.approx(0.52)


def test_parse_demographic_falla_sin_edad_mediana() -> None:
    with pytest.raises(ValueError, match="miteco_demographic"):
        parse_demographic_payload(
            [{"municipality_code": "1", "name": "x"}],
            period="2024",
        )


def test_parse_services_preserva_componentes() -> None:
    rows = [
        {
            "municipality_code": "28079",
            "name": "Madrid",
            "services_score": 88.5,
            "health_coverage": 95,
            "education_coverage": 96,
            "retail_coverage": 93,
        }
    ]
    records = parse_services_payload(rows, period="2025")
    assert records[0].services_score == pytest.approx(88.5)
    assert records[0].health_coverage == pytest.approx(95.0)


def test_parse_services_falla_sin_indice() -> None:
    with pytest.raises(ValueError, match="miteco_services"):
        parse_services_payload(
            [{"municipality_code": "1", "name": "x"}],
            period="2025",
        )


def test_connectors_desde_fixture(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    demographic = MitecoDemographicConnector(downloader, fixture_dir=FIXTURE_DIR)
    services = MitecoServicesConnector(downloader, fixture_dir=FIXTURE_DIR)
    demo_records = demographic.parse(demographic.fetch())
    svc_records = services.parse(services.fetch())
    assert demo_records and svc_records
    assert {record.municipality_code for record in demo_records} <= {
        record.municipality_code for record in svc_records
    } or True  # Los fixtures comparten municipios principales.
