"""Modelo de dominio territorial: CCAA, provincia, municipio.

Diseñado como objetos valor inmutables. La identidad se apoya en el código INE,
que es estable y permite reconstruir URIs sin ambigüedades.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class TerritoryKind(StrEnum):
    """Nivel administrativo del territorio."""

    AUTONOMOUS_COMMUNITY = "autonomous_community"
    PROVINCE = "province"
    MUNICIPALITY = "municipality"


@dataclass(frozen=True, slots=True)
class GeoPoint:
    """Centroide geográfico en WGS84."""

    lat: float
    lon: float

    def __post_init__(self) -> None:
        if not -90.0 <= self.lat <= 90.0:
            raise ValueError(f"latitud fuera de rango: {self.lat}")
        if not -180.0 <= self.lon <= 180.0:
            raise ValueError(f"longitud fuera de rango: {self.lon}")


@dataclass(frozen=True, slots=True)
class Territory:
    """Territorio administrativo canonicalizado."""

    code: str
    name: str
    kind: TerritoryKind
    parent_code: str | None = None
    province_code: str | None = None
    autonomous_community_code: str | None = None
    centroid: GeoPoint | None = None
    population: int | None = None
    area_km2: float | None = None
    aliases: tuple[str, ...] = field(default_factory=tuple)

    @property
    def identifier(self) -> str:
        """Identificador público combinando tipo y código (``municipality:41091``)."""
        return f"{self.kind.value}:{self.code}"
