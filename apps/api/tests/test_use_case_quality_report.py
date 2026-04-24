"""Pruebas del caso de uso de informe de calidad."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application import Container
from atlashabita.config import Settings

REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="module")
def container() -> Container:
    settings = Settings(
        env="test",
        data_root=REPO_ROOT / "data",
        ontology_root=REPO_ROOT / "ontology",
    )
    return Container(settings)


def test_informe_incluye_conteos_esperados(container: Container) -> None:
    report = container.get_quality_report.execute()
    assert report["tables"]["municipalities"] == 10
    assert report["tables"]["provinces"] == 3
    assert report["tables"]["autonomous_communities"] == 2
    assert report["tables"]["sources"] == 5
    assert report["tables"]["indicators"] == 5
    assert report["tables"]["observations"] == 50
    assert report["tables"]["profiles"] == 3


def test_informe_cobertura_100_para_seed(container: Container) -> None:
    report = container.get_quality_report.execute()
    assert report["coverage"]["actual_observations"] == 50
    assert report["coverage"]["expected_observations"] == 50
    assert report["coverage"]["ratio"] == pytest.approx(1.0)


def test_informe_incluye_data_version(container: Container) -> None:
    report = container.get_quality_report.execute()
    assert report["data_version"].startswith("seed:")


def test_informe_no_genera_warnings_si_cobertura_completa(container: Container) -> None:
    report = container.get_quality_report.execute()
    assert report["warnings"] == []
