"""Casos de uso para datos de movilidad (MITMA y derivados).

Lee el CSV ``data/seed/mobility_flows.csv`` (cuando exista) y expone:

- Listado de flujos origen-destino filtrable por origen, destino y periodo.
- Resumen agregado por territorio: viajes entrantes, salientes y top
  origen/destino.

El CSV es propiedad del Teammate 1 (issue de datasets) y puede no estar
presente todavía. En ese caso degradamos a una respuesta vacía con un log
informativo: el endpoint sigue devolviendo 200 sin reventar.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from atlashabita.observability import get_logger

logger = get_logger(__name__)


REQUIRED_COLUMNS: tuple[str, ...] = (
    "origin_id",
    "destination_id",
    "period",
    "trips",
)
OPTIONAL_COLUMNS: tuple[str, ...] = (
    "mode",
    "purpose",
    "source_id",
)


@dataclass(frozen=True, slots=True)
class MobilityFlow:
    """Flujo origen-destino normalizado en memoria."""

    origin_id: str
    destination_id: str
    period: str
    trips: float
    mode: str | None
    purpose: str | None
    source_id: str | None

    def to_public(self) -> dict[str, Any]:
        """Proyección JSON-serializable expuesta por la API."""
        return {
            "origin_id": self.origin_id,
            "destination_id": self.destination_id,
            "period": self.period,
            "trips": self.trips,
            "mode": self.mode,
            "purpose": self.purpose,
            "source_id": self.source_id,
        }


class ListMobilityUseCase:
    """Lee el CSV de movilidad y lo proyecta hacia la API.

    El loader es perezoso: la primera lectura se cachea y las subsiguientes
    consultas filtran sobre la lista en memoria. Si el CSV no existe se
    cachea una lista vacía y se loguea el motivo, evitando spam.
    """

    def __init__(self, seed_dir: Path) -> None:
        self._seed_dir = seed_dir
        self._cache: tuple[MobilityFlow, ...] | None = None

    @property
    def csv_path(self) -> Path:
        """Ruta esperada del CSV de movilidad."""
        return self._seed_dir / "mobility_flows.csv"

    def list_flows(
        self,
        *,
        origin: str | None = None,
        destination: str | None = None,
        period: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Lista flujos filtrados, paginados y serializables."""
        flows = self._load()
        filtered = [
            flow
            for flow in flows
            if (origin is None or flow.origin_id == origin)
            and (destination is None or flow.destination_id == destination)
            and (period is None or flow.period == period)
        ]
        bounded = filtered[offset : offset + limit]
        return [flow.to_public() for flow in bounded]

    def count_flows(
        self,
        *,
        origin: str | None = None,
        destination: str | None = None,
        period: str | None = None,
    ) -> int:
        """Total de flujos que cumplen los filtros (para metadata de paginación)."""
        flows = self._load()
        return sum(
            1
            for flow in flows
            if (origin is None or flow.origin_id == origin)
            and (destination is None or flow.destination_id == destination)
            and (period is None or flow.period == period)
        )

    def summary(self, territory_id: str) -> dict[str, Any]:
        """Resumen agregado de movilidad para un territorio.

        Devuelve el total de viajes con origen y destino en el territorio,
        más el top de pares origen/destino. Si no hay datos, devuelve ceros
        con listas vacías para que la pantalla técnica pueda mostrar el
        estado "sin datos" sin tratamientos especiales en el frontend.
        """
        flows = self._load()
        outgoing = [flow for flow in flows if flow.origin_id == territory_id]
        incoming = [flow for flow in flows if flow.destination_id == territory_id]

        total_outgoing = sum(flow.trips for flow in outgoing)
        total_incoming = sum(flow.trips for flow in incoming)

        top_destinations = self._top_pairs(outgoing, key="destination_id")
        top_origins = self._top_pairs(incoming, key="origin_id")

        return {
            "territory_id": territory_id,
            "total_outgoing_trips": total_outgoing,
            "total_incoming_trips": total_incoming,
            "outgoing_flows": len(outgoing),
            "incoming_flows": len(incoming),
            "top_destinations": top_destinations,
            "top_origins": top_origins,
        }

    def _top_pairs(
        self, flows: list[MobilityFlow], *, key: str, top: int = 5
    ) -> list[dict[str, Any]]:
        accumulator: dict[str, float] = {}
        for flow in flows:
            target = getattr(flow, key)
            accumulator[target] = accumulator.get(target, 0.0) + flow.trips
        ranked = sorted(accumulator.items(), key=lambda item: item[1], reverse=True)
        return [{"territory_id": territory, "trips": value} for territory, value in ranked[:top]]

    def _load(self) -> tuple[MobilityFlow, ...]:
        if self._cache is not None:
            return self._cache
        path = self.csv_path
        if not path.exists():
            logger.info(
                "mobility.csv_missing",
                path=str(path),
                hint="El CSV todavía no se ha publicado; se devuelve lista vacía.",
            )
            self._cache = ()
            return self._cache
        flows: list[MobilityFlow] = []
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            columns = set(reader.fieldnames or [])
            missing = [c for c in REQUIRED_COLUMNS if c not in columns]
            if missing:
                raise ValueError(f"mobility_flows.csv: columnas obligatorias ausentes: {missing}")
            for index, row in enumerate(reader, start=2):
                flows.append(_parse_row(row, index))
        self._cache = tuple(flows)
        logger.info("mobility.csv_loaded", path=str(path), rows=len(flows))
        return self._cache


def _parse_row(row: dict[str, str], number: int) -> MobilityFlow:
    try:
        trips = float((row.get("trips") or "0").strip() or "0")
    except ValueError as exc:
        raise ValueError(
            f"mobility_flows.csv fila {number}: 'trips' no es decimal: {row.get('trips')!r}"
        ) from exc
    return MobilityFlow(
        origin_id=(row.get("origin_id") or "").strip(),
        destination_id=(row.get("destination_id") or "").strip(),
        period=(row.get("period") or "").strip(),
        trips=trips,
        mode=_optional(row.get("mode")),
        purpose=_optional(row.get("purpose")),
        source_id=_optional(row.get("source_id")),
    )


def _optional(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


__all__ = ["ListMobilityUseCase", "MobilityFlow"]
