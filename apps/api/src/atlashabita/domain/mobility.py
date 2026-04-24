"""Modelo de movilidad: flujos origen-destino agregados.

Los datos de movilidad provienen del estudio MITMA (Ministerio de Transportes)
basado en big data de telefonía móvil anonimizada. Cada flujo describe el
desplazamiento medio diario entre dos territorios para un periodo concreto.

Diseño:

- ``MobilityFlow`` es un objeto valor inmutable: dos códigos de territorio
  (origen y destino) más métricas agregadas (viajes diarios, viaje medio).
- La identidad se define por la tupla ``(origin_code, destination_code, period)``
  para permitir series temporales sin colisiones.
- Las distancias y duraciones se modelan como ``float`` no negativos; la
  validación garantiza que el dominio rechaza valores absurdos antes de que
  lleguen al grafo o al scoring.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MobilityFlow:
    """Flujo de movilidad agregado entre dos municipios.

    Attributes:
        origin_code: código INE de 5 dígitos del municipio origen.
        destination_code: código INE de 5 dígitos del municipio destino.
        period: identificador del periodo (``YYYY`` o ``YYYY-MM``).
        daily_trips: número medio diario de viajes (personas/día).
        average_distance_km: distancia media del viaje en kilómetros.
        average_duration_min: duración media del viaje en minutos.
        source_id: identificador de la fuente origen del dato.
    """

    origin_code: str
    destination_code: str
    period: str
    daily_trips: float
    average_distance_km: float
    average_duration_min: float
    source_id: str

    def __post_init__(self) -> None:
        if not self.origin_code or not self.destination_code:
            raise ValueError("origen y destino deben estar definidos")
        if self.daily_trips < 0:
            raise ValueError(f"daily_trips negativo: {self.daily_trips}")
        if self.average_distance_km < 0:
            raise ValueError(f"average_distance_km negativo: {self.average_distance_km}")
        if self.average_duration_min < 0:
            raise ValueError(f"average_duration_min negativo: {self.average_duration_min}")

    @property
    def is_internal(self) -> bool:
        """Indica si el flujo es intramunicipal (origen == destino)."""
        return self.origin_code == self.destination_code

    @property
    def identifier(self) -> str:
        """Identificador estable de la tupla origen-destino-periodo."""
        return f"{self.origin_code}->{self.destination_code}@{self.period}"


__all__ = ["MobilityFlow"]
