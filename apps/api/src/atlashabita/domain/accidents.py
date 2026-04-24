"""Modelo de siniestralidad vial: accidentes por municipio y periodo.

Los datos provienen del anuario estadístico de la DGT (Dirección General de
Tráfico). Cada registro agrega los accidentes con víctimas para un municipio
en un periodo (``YYYY`` o ``YYYY-MM``), separados por gravedad.

Diseño:

- ``RoadAccident`` se modela como objeto valor inmutable; la identidad es
  ``(territory_code, period)`` para permitir series mensuales o anuales.
- Las cifras se almacenan como enteros porque la DGT publica conteos
  agregados; las divisiones (tasa por 1.000 habitantes) se calculan en
  capas superiores con la población oficial.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RoadAccident:
    """Registro agregado de accidentes con víctimas para un municipio.

    Attributes:
        territory_code: código INE del municipio (5 dígitos).
        period: identificador del periodo (``YYYY`` o ``YYYY-MM``).
        accidents_total: número total de accidentes con víctimas.
        fatalities: víctimas mortales en el periodo.
        serious_injuries: heridos graves (hospitalización > 24h).
        slight_injuries: heridos leves.
        source_id: identificador de la fuente DGT.
    """

    territory_code: str
    period: str
    accidents_total: int
    fatalities: int
    serious_injuries: int
    slight_injuries: int
    source_id: str

    def __post_init__(self) -> None:
        if not self.territory_code:
            raise ValueError("territory_code obligatorio")
        for field_name in (
            "accidents_total",
            "fatalities",
            "serious_injuries",
            "slight_injuries",
        ):
            value = getattr(self, field_name)
            if value < 0:
                raise ValueError(f"{field_name} negativo: {value}")

    @property
    def total_victims(self) -> int:
        """Total de víctimas (mortales + graves + leves)."""
        return self.fatalities + self.serious_injuries + self.slight_injuries

    def rate_per_1000(self, population: int) -> float:
        """Tasa de accidentes por cada 1.000 habitantes."""
        if population <= 0:
            raise ValueError(f"population debe ser positiva: {population}")
        return (self.accidents_total / population) * 1000.0


__all__ = ["RoadAccident"]
