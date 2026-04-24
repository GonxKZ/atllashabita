"""Tests de calidad tabular sobre el dataset seed y reglas unitarias."""

from __future__ import annotations

import dataclasses
import json
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import pytest

from atlashabita.config import Settings
from atlashabita.domain.indicators import Indicator, IndicatorDirection, IndicatorObservation
from atlashabita.domain.sources import DataSource
from atlashabita.domain.territories import Territory, TerritoryKind
from atlashabita.infrastructure.data import (
    QualityReport,
    ValidationIssue,
    check_coverage,
    check_no_nulls_in_keys,
    check_required_columns,
    check_unique_key,
    check_values_in_range,
    validate_observations,
    validate_sources,
    validate_territories,
    write_quality_report,
)
from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader

SEED_DIR = Path(__file__).resolve().parents[3] / "data" / "seed"


@pytest.fixture(scope="module")
def dataset() -> SeedDataset:
    """Dataset real, compartido entre pruebas del módulo."""
    return SeedLoader(SEED_DIR).load()


# ---------------------------------------------------------------------------
# Reglas puras
# ---------------------------------------------------------------------------


def test_check_required_columns_detecta_faltantes() -> None:
    rows = [{"a": 1}]
    issues = check_required_columns(rows, ("a", "b"))
    assert len(issues) == 1
    assert issues[0].severity == "critical"
    assert "b" in issues[0].details["missing"]


def test_check_required_columns_acepta_cuando_todas_estan() -> None:
    rows = [{"a": 1, "b": 2}]
    assert check_required_columns(rows, ("a", "b")) == ()


def test_check_required_columns_sobre_dataset_vacio_advierte() -> None:
    issues = check_required_columns([], ("a",))
    assert len(issues) == 1
    assert issues[0].severity == "warning"


def test_check_no_nulls_in_keys_detecta_valor_vacio() -> None:
    rows = [{"k": "41091"}, {"k": "   "}, {"k": None}]
    issues = check_no_nulls_in_keys(rows, ("k",))
    assert len(issues) == 2
    assert {issue.details["row"] for issue in issues} == {2, 3}


def test_check_no_nulls_in_keys_acepta_valores_validos() -> None:
    rows = [{"k": "A"}, {"k": "B"}]
    assert check_no_nulls_in_keys(rows, ("k",)) == ()


def test_check_values_in_range_detecta_fuera_de_rango_y_no_numericos() -> None:
    rows = [
        {"v": 1.0},
        {"v": 10.0},
        {"v": 200.0},
        {"v": "no-numero"},
    ]
    issues = check_values_in_range(rows, "v", min_v=0.0, max_v=100.0)
    severities = [issue.severity for issue in issues]
    assert "warning" in severities  # 200 > 100
    assert "critical" in severities  # no-numero
    assert len(issues) == 2


def test_check_values_in_range_acepta_valores_correctos() -> None:
    rows = [{"v": 5.0}, {"v": 50.0}]
    assert check_values_in_range(rows, "v", min_v=0.0, max_v=100.0) == ()


def test_check_unique_key_detecta_duplicados() -> None:
    rows = [{"a": 1, "b": 2}, {"a": 1, "b": 2}, {"a": 1, "b": 3}]
    issues = check_unique_key(rows, ("a", "b"))
    assert len(issues) == 1
    assert issues[0].severity == "critical"
    assert issues[0].details["count"] == 2


def test_check_unique_key_acepta_llaves_unicas() -> None:
    rows = [{"a": 1}, {"a": 2}, {"a": 3}]
    assert check_unique_key(rows, ("a",)) == ()


def test_check_coverage_detecta_cobertura_insuficiente() -> None:
    expected = ["a", "b", "c", "d"]
    actual = ["a"]
    issues = check_coverage(actual, expected, threshold=0.9)
    assert len(issues) == 1
    assert issues[0].details["ratio"] == pytest.approx(0.25)


def test_check_coverage_acepta_cobertura_superior_al_umbral() -> None:
    expected = ["a", "b", "c", "d"]
    actual = ["a", "b", "c", "d"]
    assert check_coverage(actual, expected, threshold=0.9) == ()


# ---------------------------------------------------------------------------
# Orquestadores sobre el seed real
# ---------------------------------------------------------------------------


def test_validate_observations_pasa_sobre_el_seed_real(dataset: SeedDataset) -> None:
    report = validate_observations(dataset)
    assert isinstance(report, QualityReport)
    assert report.status == "ok", report.issues
    assert report.critical_count == 0
    assert report.counters["rows"] == len(dataset.observations)


def test_validate_territories_pasa_sobre_el_seed_real(dataset: SeedDataset) -> None:
    report = validate_territories(dataset)
    assert report.status == "ok", report.issues
    assert report.critical_count == 0
    assert report.counters["municipalities"] == len(dataset.municipalities)


def test_validate_sources_pasa_sobre_el_seed_real(dataset: SeedDataset) -> None:
    report = validate_sources(dataset)
    assert report.status == "ok", report.issues
    assert report.counters["sources"] == len(dataset.sources)


# ---------------------------------------------------------------------------
# Detección de regresiones intencionales
# ---------------------------------------------------------------------------


def _indicators(dataset: SeedDataset) -> tuple[Indicator, ...]:
    return dataset.indicators


def _replace_observations(
    dataset: SeedDataset, observations: Iterable[IndicatorObservation]
) -> SeedDataset:
    return dataclasses.replace(dataset, observations=tuple(observations))


def _replace_territories(dataset: SeedDataset, territories: Iterable[Territory]) -> SeedDataset:
    return dataclasses.replace(dataset, territories=tuple(territories))


def _replace_sources(dataset: SeedDataset, sources: Iterable[DataSource]) -> SeedDataset:
    return dataclasses.replace(dataset, sources=tuple(sources))


def test_validate_observations_detecta_duplicados(dataset: SeedDataset) -> None:
    duplicate = dataset.observations[0]
    broken = _replace_observations(dataset, (*dataset.observations, duplicate))
    report = validate_observations(broken)
    assert report.status == "error"
    assert any(issue.rule == "unique_key" for issue in report.issues)


def test_validate_observations_detecta_valor_fuera_de_rango(
    dataset: SeedDataset,
) -> None:
    first = dataset.observations[0]
    outlier = IndicatorObservation(
        indicator_code=first.indicator_code,
        territory_id=first.territory_id,
        period="2099",
        value=999.0,
        source_id=first.source_id,
    )
    broken = _replace_observations(dataset, (*dataset.observations, outlier))
    report = validate_observations(broken)
    assert any(issue.rule == "values_in_range" for issue in report.issues)


def test_validate_observations_detecta_cobertura_incompleta(
    dataset: SeedDataset,
) -> None:
    target = dataset.municipalities[0].identifier
    reduced = tuple(obs for obs in dataset.observations if obs.territory_id != target)
    # Dejamos sólo una observación para que caiga por debajo del mínimo.
    reduced = (*reduced, dataset.observations[0])
    broken = _replace_observations(dataset, reduced)
    report = validate_observations(broken)
    assert any(issue.rule == "minimum_indicator_coverage" for issue in report.issues)


def test_validate_territories_detecta_codigo_ine_invalido(
    dataset: SeedDataset,
) -> None:
    target = dataset.municipalities[0]
    mutated = Territory(
        code="999",  # sólo tres dígitos
        name=target.name,
        kind=TerritoryKind.MUNICIPALITY,
        parent_code=target.parent_code,
        province_code=target.province_code,
        autonomous_community_code=target.autonomous_community_code,
        centroid=target.centroid,
        population=target.population,
        area_km2=target.area_km2,
    )
    others = tuple(t for t in dataset.territories if t is not target)
    broken = _replace_territories(dataset, (*others, mutated))
    report = validate_territories(broken)
    assert any(issue.rule == "ine_code_format" for issue in report.issues)


def test_validate_sources_detecta_url_no_http(dataset: SeedDataset) -> None:
    target = dataset.sources[0]
    mutated = DataSource(
        id=target.id,
        title=target.title,
        publisher=target.publisher,
        url="ftp://legacy.example.com/data.zip",
        license=target.license,
        periodicity=target.periodicity,
        description=target.description,
        indicators=target.indicators,
    )
    others = tuple(source for source in dataset.sources if source.id != target.id)
    broken = _replace_sources(dataset, (*others, mutated))
    report = validate_sources(broken)
    assert any(issue.rule == "source_url_scheme" for issue in report.issues)


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


def test_write_quality_report_crea_json_en_zona_reports(
    dataset: SeedDataset, tmp_path: Path
) -> None:
    settings = Settings(data_root=tmp_path)
    report = validate_observations(dataset)
    destination = write_quality_report(report, settings, "observations")
    assert destination.exists()
    assert destination.parent == settings.data_zone("reports")
    payload: dict[str, Any] = json.loads(destination.read_text(encoding="utf-8"))
    assert payload["source"] == "observations"
    assert payload["status"] == report.status


def test_validation_issue_serializable() -> None:
    issue = ValidationIssue(severity="info", rule="demo", message="hola", details={"x": 1})
    assert issue.to_dict() == {
        "severity": "info",
        "rule": "demo",
        "message": "hola",
        "details": {"x": 1},
    }


def test_indicadores_seed_tienen_min_max_definidos(dataset: SeedDataset) -> None:
    for indicator in _indicators(dataset):
        assert indicator.direction in {
            IndicatorDirection.HIGHER_IS_BETTER,
            IndicatorDirection.LOWER_IS_BETTER,
        }
        assert indicator.min_value is not None
        assert indicator.max_value is not None
