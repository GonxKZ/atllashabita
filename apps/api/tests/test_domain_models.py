"""Pruebas del resto de objetos valor del dominio."""

from __future__ import annotations

import pytest

from atlashabita.domain.indicators import (
    Indicator,
    IndicatorDirection,
    IndicatorObservation,
)
from atlashabita.domain.profiles import DecisionProfile
from atlashabita.domain.scoring import ScoreContribution, TerritoryScore
from atlashabita.domain.sources import DataSource


def test_indicator_mantiene_direccion_semantica() -> None:
    indicator = Indicator(
        code="broadband_coverage",
        label="Cobertura de banda ancha",
        unit="%",
        direction=IndicatorDirection.HIGHER_IS_BETTER,
        description="Porcentaje de hogares con acceso a banda ancha fija.",
        source_id="seteleco_broadband_maps",
    )
    assert indicator.direction is IndicatorDirection.HIGHER_IS_BETTER


def test_indicator_observation_guarda_procedencia() -> None:
    obs = IndicatorObservation(
        indicator_code="rent_median",
        territory_id="municipality:41091",
        period="2025",
        value=10.8,
        source_id="mivau_serpavi",
    )
    assert obs.quality == "ok"
    assert obs.source_id == "mivau_serpavi"


def test_profile_rechaza_pesos_nulos() -> None:
    with pytest.raises(ValueError):
        DecisionProfile(
            id="vacio",
            label="Vacío",
            description="Ningún indicador se evalúa.",
            weights={"a": 0.0, "b": 0.0},
        )


def test_profile_valido_preserva_pesos() -> None:
    profile = DecisionProfile(
        id="remote_work",
        label="Teletrabajo",
        description="Prioriza conectividad y alquiler razonable.",
        weights={"broadband_coverage": 0.6, "rent_median": 0.4},
    )
    assert profile.weights["broadband_coverage"] == 0.6


def test_score_contribution_detecta_riesgo() -> None:
    riesgo = ScoreContribution(
        indicator_code="rent_median",
        label="Alquiler mediano",
        weight=0.4,
        normalized_value=0.2,
        raw_value=16.0,
        unit="EUR/m2/mes",
        impact=-4.0,
        direction="lower_is_better",
    )
    bueno = ScoreContribution(
        indicator_code="broadband_coverage",
        label="Cobertura de banda ancha",
        weight=0.6,
        normalized_value=0.9,
        raw_value=95.0,
        unit="%",
        impact=15.0,
        direction="higher_is_better",
    )
    assert riesgo.is_risk is True
    assert bueno.is_risk is False


def test_territory_score_agrupa_contribuciones() -> None:
    score = TerritoryScore(
        territory_id="municipality:41091",
        territory_name="Sevilla",
        profile_id="remote_work",
        score=78.5,
        confidence=0.9,
        contributions=(),
        highlights=("Conectividad alta",),
        warnings=(),
        version="2026.04.1",
    )
    assert score.score == pytest.approx(78.5)
    assert score.highlights == ("Conectividad alta",)


def test_data_source_incluye_metadatos_de_licencia() -> None:
    fuente = DataSource(
        id="ine_atlas_renta",
        title="Atlas de Renta de los Hogares",
        publisher="INE",
        url="https://www.ine.es/",
        license="CC BY 4.0",
        periodicity="anual",
        indicators=("income_per_capita", "gini"),
    )
    assert "income_per_capita" in fuente.indicators
    assert fuente.coverage == "ES"
