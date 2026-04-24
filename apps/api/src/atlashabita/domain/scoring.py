"""Modelo de scoring explicable.

El scoring se construye a partir de indicadores normalizados al rango ``[0, 1]``
y pesos por perfil. Devuelve además contribuciones desglosadas para poder
explicar al usuario por qué un territorio encaja o no con un perfil.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class ScoreContribution:
    """Contribución de un indicador al score final."""

    indicator_code: str
    label: str
    weight: float
    normalized_value: float
    raw_value: float
    unit: str
    impact: float
    direction: str

    @property
    def is_risk(self) -> bool:
        """Indica si la contribución es una penalización relativa."""
        return self.normalized_value < 0.4


@dataclass(frozen=True, slots=True)
class TerritoryScore:
    """Resultado del scoring para un territorio y un perfil."""

    territory_id: str
    territory_name: str
    profile_id: str
    score: float
    confidence: float
    contributions: tuple[ScoreContribution, ...]
    highlights: tuple[str, ...] = field(default_factory=tuple)
    warnings: tuple[str, ...] = field(default_factory=tuple)
    version: str = "0.0.0"
