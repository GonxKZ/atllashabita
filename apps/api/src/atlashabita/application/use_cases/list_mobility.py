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
import heapq
from collections.abc import Callable
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
        match = _build_match(origin=origin, destination=destination, period=period)
        filtered = [flow for flow in self._load() if match(flow)]
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
        match = _build_match(origin=origin, destination=destination, period=period)
        return sum(1 for flow in self._load() if match(flow))

    def summary(self, territory_id: str) -> dict[str, Any]:
        """Resumen agregado de movilidad para un territorio.

        Devuelve el total de viajes con origen y destino en el territorio,
        más el top de pares origen/destino. Si no hay datos, devuelve ceros
        con listas vacías para que la pantalla técnica pueda mostrar el
        estado "sin datos" sin tratamientos especiales en el frontend.

        Implementación **single-pass**: la lista de flujos se recorre una
        única vez y se acumulan en paralelo los totales, conteos y los
        diccionarios de pares (origen/destino) que después alimentan el top.
        Antes se recorría 4 veces (incoming, outgoing, total_in, total_out).
        """
        outgoing_flows = 0
        incoming_flows = 0
        total_outgoing = 0.0
        total_incoming = 0.0
        outgoing_pairs: dict[str, float] = {}
        incoming_pairs: dict[str, float] = {}
        for flow in self._load():
            if flow.origin_id == territory_id:
                outgoing_flows += 1
                total_outgoing += flow.trips
                outgoing_pairs[flow.destination_id] = (
                    outgoing_pairs.get(flow.destination_id, 0.0) + flow.trips
                )
            if flow.destination_id == territory_id:
                incoming_flows += 1
                total_incoming += flow.trips
                incoming_pairs[flow.origin_id] = (
                    incoming_pairs.get(flow.origin_id, 0.0) + flow.trips
                )

        return {
            "territory_id": territory_id,
            "total_outgoing_trips": total_outgoing,
            "total_incoming_trips": total_incoming,
            "outgoing_flows": outgoing_flows,
            "incoming_flows": incoming_flows,
            "top_destinations": _top_n(outgoing_pairs),
            "top_origins": _top_n(incoming_pairs),
        }

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


def _build_match(
    *,
    origin: str | None,
    destination: str | None,
    period: str | None,
) -> Callable[[MobilityFlow], bool]:
    """Predicado reutilizable para los filtros de listado/conteo.

    Centraliza la lógica de filtrado que antes estaba duplicada literalmente
    entre ``list_flows`` y ``count_flows``, evitando que un cambio futuro
    desincronice ambas variantes.
    """
    if origin is None and destination is None and period is None:
        return lambda _flow: True

    def _match(flow: MobilityFlow) -> bool:
        if origin is not None and flow.origin_id != origin:
            return False
        if destination is not None and flow.destination_id != destination:
            return False
        return not (period is not None and flow.period != period)

    return _match


def _top_n(accumulator: dict[str, float], *, top: int = 5) -> list[dict[str, Any]]:
    """Devuelve las ``top`` entradas con más viajes en O(n log k).

    ``heapq.nlargest`` es asintóticamente mejor que ``sorted`` cuando ``top``
    es pequeño respecto al tamaño del diccionario: el coste pasa de
    O(n log n) a O(n log k). Para los típicos ``top=5`` el ahorro es
    significativo en municipios con miles de pares O/D.
    """
    if not accumulator:
        return []
    pairs = heapq.nlargest(top, accumulator.items(), key=lambda item: item[1])
    return [{"territory_id": territory, "trips": value} for territory, value in pairs]


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
