"""Servicio de scoring explicable por perfil de decisión.

El cálculo se apoya en la normalización min-max de cada indicador a ``[0, 1]``
con inversión si ``lower_is_better``. Los pesos se reescalan cuando un
municipio carece de datos para algún indicador del perfil. Cada score se
acompaña de contribuciones ordenadas por impacto, highlights y warnings
para garantizar explicabilidad (RF-012).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import replace
from typing import Final

from atlashabita.config import Settings
from atlashabita.domain.indicators import (
    Indicator,
    IndicatorDirection,
    IndicatorObservation,
)
from atlashabita.domain.profiles import DecisionProfile
from atlashabita.domain.scoring import ScoreContribution, TerritoryScore
from atlashabita.domain.territories import Territory, TerritoryKind
from atlashabita.infrastructure.ingestion import SeedDataset
from atlashabita.observability.errors import InvalidProfileError

_HIGHLIGHT_THRESHOLD: Final[float] = 0.7
_WARNING_THRESHOLD: Final[float] = 0.3
_HIGHLIGHT_TOP_K: Final[int] = 2


class ScoringService:
    """Calcula rankings explicables a partir del dataset y los perfiles."""

    def __init__(self, dataset: SeedDataset, settings: Settings) -> None:
        self._dataset = dataset
        self._settings = settings
        self._indicators_by_code: dict[str, Indicator] = {
            indicator.code: indicator for indicator in dataset.indicators
        }
        self._profiles_by_id: dict[str, DecisionProfile] = {
            profile.id: profile for profile in dataset.profiles
        }
        self._municipalities: tuple[Territory, ...] = tuple(
            t for t in dataset.territories if t.kind is TerritoryKind.MUNICIPALITY
        )
        self._observations_index: dict[tuple[str, str], IndicatorObservation] = {
            (obs.indicator_code, obs.territory_id): obs for obs in dataset.observations
        }

    @property
    def dataset(self) -> SeedDataset:
        """Acceso de lectura al dataset asociado."""
        return self._dataset

    def compute(
        self,
        profile_id: str,
        scope: Sequence[Territory] | None = None,
        weights: Mapping[str, float] | None = None,
    ) -> list[TerritoryScore]:
        """Calcula los scores de un conjunto de territorios para un perfil.

        Args:
            profile_id: identificador del perfil de decisión.
            scope: lista opcional de territorios sobre los que calcular. Si es
                ``None`` se usan todos los municipios del dataset.
            weights: pesos personalizados que reemplazan a los del perfil.

        Returns:
            Lista de :class:`TerritoryScore` ordenada por score descendente.
        """
        profile = self._profiles_by_id.get(profile_id)
        if profile is None:
            raise InvalidProfileError(profile_id)

        territories = tuple(scope) if scope is not None else self._municipalities
        effective_weights = self._effective_weights(profile, weights)

        ranges = {
            code: self._resolve_range(code, territories)
            for code in effective_weights
            if code in self._indicators_by_code
        }

        scores: list[TerritoryScore] = []
        for territory in territories:
            score = self._score_territory(
                territory=territory,
                profile_id=profile.id,
                weights=effective_weights,
                ranges=ranges,
            )
            if score is not None:
                scores.append(score)

        scores.sort(key=lambda item: item.score, reverse=True)
        return scores

    def _effective_weights(
        self,
        profile: DecisionProfile,
        override: Mapping[str, float] | None,
    ) -> dict[str, float]:
        base = override if override is not None else profile.weights
        sanitized = {code: float(weight) for code, weight in base.items() if weight > 0}
        if not sanitized:
            raise InvalidProfileError(profile.id)
        return sanitized

    def _resolve_range(
        self,
        indicator_code: str,
        territories: Sequence[Territory],
    ) -> tuple[float, float]:
        indicator = self._indicators_by_code[indicator_code]
        if indicator.min_value is not None and indicator.max_value is not None:
            return (indicator.min_value, indicator.max_value)
        values = [
            obs.value
            for t in territories
            if (obs := self._observations_index.get((indicator_code, t.identifier))) is not None
        ]
        if not values:
            return (0.0, 1.0)
        return (min(values), max(values))

    def _score_territory(
        self,
        territory: Territory,
        profile_id: str,
        weights: Mapping[str, float],
        ranges: Mapping[str, tuple[float, float]],
    ) -> TerritoryScore | None:
        available: dict[str, tuple[IndicatorObservation, Indicator]] = {}
        for code in weights:
            indicator = self._indicators_by_code.get(code)
            if indicator is None:
                continue
            observation = self._observations_index.get((code, territory.identifier))
            if observation is None:
                continue
            available[code] = (observation, indicator)

        if not available:
            return None

        rescaled = _rescale_weights({code: weights[code] for code in available})

        contributions: list[ScoreContribution] = []
        weighted_sum = 0.0
        for code, (observation, indicator) in available.items():
            min_value, max_value = ranges[code]
            normalized = _minmax_normalize(
                observation.value, min_value, max_value, indicator.direction
            )
            weight = rescaled[code]
            impact = weight * normalized * 100.0
            contributions.append(
                _build_contribution(
                    indicator=indicator,
                    weight=weight,
                    normalized=normalized,
                    raw_value=observation.value,
                    impact=impact,
                )
            )
            weighted_sum += weight * normalized

        contributions.sort(key=lambda contribution: contribution.impact, reverse=True)
        highlights = tuple(
            contribution.label
            for contribution in contributions
            if contribution.normalized_value >= _HIGHLIGHT_THRESHOLD
        )[:_HIGHLIGHT_TOP_K]
        warnings = tuple(
            contribution.label
            for contribution in contributions
            if contribution.normalized_value <= _WARNING_THRESHOLD
        )

        confidence = round(len(available) / len(weights), 4)
        score_value = round(weighted_sum * 100.0, 1)

        return TerritoryScore(
            territory_id=territory.identifier,
            territory_name=territory.name,
            profile_id=profile_id,
            score=score_value,
            confidence=confidence,
            contributions=tuple(contributions),
            highlights=highlights,
            warnings=warnings,
            version=self._settings.scoring_version,
        )


def _minmax_normalize(
    value: float,
    min_value: float,
    max_value: float,
    direction: IndicatorDirection,
) -> float:
    """Normaliza un valor al rango ``[0, 1]`` aplicando inversión si procede."""
    if max_value <= min_value:
        return 0.5
    clipped = max(min(value, max_value), min_value)
    normalized = (clipped - min_value) / (max_value - min_value)
    if direction is IndicatorDirection.LOWER_IS_BETTER:
        normalized = 1.0 - normalized
    return round(normalized, 6)


def _rescale_weights(weights: Mapping[str, float]) -> dict[str, float]:
    """Reescala un conjunto de pesos para que sumen ``1.0`` exactamente."""
    total = sum(weights.values())
    if total <= 0:
        raise ValueError("La suma de pesos debe ser positiva para reescalar.")
    return {code: weight / total for code, weight in weights.items()}


def _build_contribution(
    indicator: Indicator,
    weight: float,
    normalized: float,
    raw_value: float,
    impact: float,
) -> ScoreContribution:
    """Construye una :class:`ScoreContribution` con la metadata del indicador."""
    return replace(
        ScoreContribution(
            indicator_code=indicator.code,
            label=indicator.label,
            weight=round(weight, 6),
            normalized_value=normalized,
            raw_value=raw_value,
            unit=indicator.unit,
            impact=round(impact, 4),
            direction=indicator.direction.value,
        )
    )
