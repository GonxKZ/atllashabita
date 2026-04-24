"""Pruebas del servicio de scoring explicable."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest

from atlashabita.application.scoring import (
    ScoringService,
    _minmax_normalize,
    _rescale_weights,
)
from atlashabita.config import Settings
from atlashabita.domain.indicators import IndicatorDirection
from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader
from atlashabita.observability.errors import InvalidProfileError

REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = REPO_ROOT / "data" / "seed"


@pytest.fixture(scope="module")
def dataset() -> SeedDataset:
    return SeedLoader(SEED_DIR).load()


@pytest.fixture(scope="module")
def settings() -> Settings:
    return Settings(
        env="test",
        data_root=REPO_ROOT / "data",
        ontology_root=REPO_ROOT / "ontology",
        scoring_version="2026.04.1-test",
    )


@pytest.fixture(scope="module")
def scoring(dataset: SeedDataset, settings: Settings) -> ScoringService:
    return ScoringService(dataset, settings)


def test_minmax_normalize_higher_is_better_monotono() -> None:
    low = _minmax_normalize(10.0, 0.0, 100.0, IndicatorDirection.HIGHER_IS_BETTER)
    high = _minmax_normalize(90.0, 0.0, 100.0, IndicatorDirection.HIGHER_IS_BETTER)
    assert low < high
    assert 0.0 <= low <= 1.0
    assert 0.0 <= high <= 1.0


def test_minmax_normalize_lower_is_better_invierte() -> None:
    low = _minmax_normalize(5.0, 0.0, 20.0, IndicatorDirection.LOWER_IS_BETTER)
    high = _minmax_normalize(18.0, 0.0, 20.0, IndicatorDirection.LOWER_IS_BETTER)
    assert low > high
    assert low == pytest.approx(0.75)
    assert high == pytest.approx(0.1)


def test_minmax_normalize_clipea_fuera_de_rango() -> None:
    por_debajo = _minmax_normalize(-5.0, 0.0, 100.0, IndicatorDirection.HIGHER_IS_BETTER)
    por_encima = _minmax_normalize(120.0, 0.0, 100.0, IndicatorDirection.HIGHER_IS_BETTER)
    assert por_debajo == pytest.approx(0.0)
    assert por_encima == pytest.approx(1.0)


def test_rescale_weights_suman_uno() -> None:
    result = _rescale_weights({"a": 0.2, "b": 0.3, "c": 0.5})
    assert sum(result.values()) == pytest.approx(1.0)


def test_rescale_weights_mantiene_proporciones() -> None:
    result = _rescale_weights({"a": 1.0, "b": 3.0})
    assert result["b"] == pytest.approx(0.75)
    assert result["a"] == pytest.approx(0.25)


def test_rescale_weights_rechaza_total_cero() -> None:
    with pytest.raises(ValueError):
        _rescale_weights({"a": 0.0, "b": 0.0})


def test_compute_ordena_por_score_descendente(scoring: ScoringService) -> None:
    results = scoring.compute("remote_work")
    scores = [result.score for result in results]
    assert scores == sorted(scores, reverse=True)
    assert len(results) == 10


def test_compute_highlights_y_warnings_coherentes(scoring: ScoringService) -> None:
    results = scoring.compute("remote_work")
    for result in results:
        for contribution in result.contributions:
            if contribution.label in result.highlights:
                assert contribution.normalized_value >= 0.7
            if contribution.label in result.warnings:
                assert contribution.normalized_value <= 0.3
        assert len(result.highlights) <= 2


def test_compute_propaga_version_del_settings(scoring: ScoringService, settings: Settings) -> None:
    results = scoring.compute("remote_work")
    assert all(result.version == settings.scoring_version for result in results)


def test_compute_rescala_pesos_si_faltan_datos(dataset: SeedDataset, settings: Settings) -> None:
    observations = tuple(
        obs
        for obs in dataset.observations
        if not (
            obs.indicator_code == "broadband_coverage" and obs.territory_id == "municipality:41091"
        )
    )
    mutated = replace(dataset, observations=observations)
    scoring = ScoringService(mutated, settings)
    results = scoring.compute("remote_work")
    sevilla = next(r for r in results if r.territory_id == "municipality:41091")
    assert sevilla.confidence == pytest.approx(0.8)
    total_weights = sum(contribution.weight for contribution in sevilla.contributions)
    assert total_weights == pytest.approx(1.0)


def test_compute_lanza_error_si_perfil_no_existe(scoring: ScoringService) -> None:
    with pytest.raises(InvalidProfileError):
        scoring.compute("inexistente")


def test_compute_respeta_weights_personalizados(scoring: ScoringService) -> None:
    custom = {"broadband_coverage": 1.0}
    results = scoring.compute("remote_work", weights=custom)
    for result in results:
        assert len(result.contributions) == 1
        assert result.contributions[0].indicator_code == "broadband_coverage"
        assert result.contributions[0].weight == pytest.approx(1.0)


def test_contribuciones_ordenadas_por_impact(scoring: ScoringService) -> None:
    results = scoring.compute("family")
    for result in results:
        impacts = [contribution.impact for contribution in result.contributions]
        assert impacts == sorted(impacts, reverse=True)
