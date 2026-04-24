"""Perfiles de decisión y pesos base de scoring."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from types import MappingProxyType


@dataclass(frozen=True, slots=True)
class DecisionProfile:
    """Perfil de usuario con pesos por indicador y umbrales mínimos."""

    id: str
    label: str
    description: str
    weights: Mapping[str, float]
    hard_filters: Mapping[str, float] = field(default_factory=lambda: MappingProxyType({}))

    def __post_init__(self) -> None:
        total = sum(self.weights.values())
        if total <= 0:
            raise ValueError("Los pesos del perfil deben sumar más de cero.")
