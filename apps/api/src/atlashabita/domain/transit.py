"""Modelo de transporte público: paradas y rutas.

Las paradas y rutas se alinean con el formato GTFS (General Transit Feed
Specification) que publican operadores como CRTM Madrid o TMB Barcelona.
Aquí se modela el subconjunto necesario para alimentar indicadores como la
proximidad a transporte público o el ``transit_score``.

Diseño:

- ``TransitStop`` es un objeto valor con coordenadas WGS84 validadas.
- ``TransitRoute`` agrupa metadatos de la línea (modo, color, agencia) y se
  vincula a las paradas por sus identificadores estables (``stop_id``).
- El modo se modela como ``StrEnum`` para que el dominio acepte sólo los
  modos GTFS estándar y cualquier valor no soportado falle en el parser.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from atlashabita.domain.territories import GeoPoint


class TransitMode(StrEnum):
    """Modos de transporte alineados con GTFS ``route_type`` (subset)."""

    TRAM = "tram"
    METRO = "metro"
    RAIL = "rail"
    BUS = "bus"
    FERRY = "ferry"
    CABLE = "cable"
    OTHER = "other"


@dataclass(frozen=True, slots=True)
class TransitStop:
    """Parada de transporte público.

    Attributes:
        stop_id: identificador estable publicado por la agencia.
        name: nombre comercial de la parada.
        location: punto WGS84 (validado en :class:`GeoPoint`).
        mode: modo de transporte principal de la parada.
        municipality_code: código INE del municipio donde se ubica.
        agency_id: identificador de la agencia operadora.
        source_id: identificador de la fuente.
    """

    stop_id: str
    name: str
    location: GeoPoint
    mode: TransitMode
    municipality_code: str
    agency_id: str
    source_id: str

    def __post_init__(self) -> None:
        if not self.stop_id:
            raise ValueError("stop_id obligatorio")
        if not self.name:
            raise ValueError("name obligatorio")
        if not self.municipality_code:
            raise ValueError("municipality_code obligatorio")


@dataclass(frozen=True, slots=True)
class TransitRoute:
    """Línea o ruta de transporte público.

    Attributes:
        route_id: identificador estable de la línea.
        short_name: nombre corto (p. ej. ``L1``, ``C-1``).
        long_name: descripción larga.
        mode: modo de transporte.
        agency_id: identificador de la agencia operadora.
        stop_ids: identificadores de las paradas atendidas (orden estable).
        source_id: identificador de la fuente.
    """

    route_id: str
    short_name: str
    long_name: str
    mode: TransitMode
    agency_id: str
    source_id: str
    stop_ids: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        if not self.route_id:
            raise ValueError("route_id obligatorio")
        if not self.short_name and not self.long_name:
            raise ValueError("la ruta requiere al menos short_name o long_name")


__all__ = ["TransitMode", "TransitRoute", "TransitStop"]
