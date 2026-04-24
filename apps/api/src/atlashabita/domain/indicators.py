"""Modelo de indicadores y observaciones por territorio y periodo."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class IndicatorDirection(StrEnum):
    """Relación entre el valor del indicador y la deseabilidad.

    Un indicador ``higher_is_better`` aumenta el score cuando crece (por
    ejemplo, cobertura de fibra). ``lower_is_better`` se penaliza cuando crece
    (por ejemplo, alquiler mediano).
    """

    HIGHER_IS_BETTER = "higher_is_better"
    LOWER_IS_BETTER = "lower_is_better"


@dataclass(frozen=True, slots=True)
class Indicator:
    """Definición semántica de un indicador."""

    code: str
    label: str
    unit: str
    direction: IndicatorDirection
    description: str
    source_id: str
    min_value: float | None = None
    max_value: float | None = None


@dataclass(frozen=True, slots=True)
class IndicatorObservation:
    """Observación concreta de un indicador para un territorio en un periodo."""

    indicator_code: str
    territory_id: str
    period: str
    value: float
    source_id: str
    quality: str = "ok"
