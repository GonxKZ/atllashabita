"""Caso de uso para datos de transporte público (paradas y líneas).

Lee el CSV ``data/seed/transit_stops.csv`` (cuando exista) y expone el
listado paginable filtrable por territorio. Si el CSV todavía no se ha
publicado, devuelve lista vacía con log informativo.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from atlashabita.observability import get_logger

logger = get_logger(__name__)


REQUIRED_COLUMNS: tuple[str, ...] = (
    "stop_id",
    "territory_id",
    "name",
    "lat",
    "lon",
)
OPTIONAL_COLUMNS: tuple[str, ...] = (
    "modes",
    "operator",
    "lines",
    "source_id",
)


@dataclass(frozen=True, slots=True)
class TransitStop:
    """Parada de transporte público normalizada."""

    stop_id: str
    territory_id: str
    name: str
    lat: float
    lon: float
    modes: tuple[str, ...]
    operator: str | None
    lines: tuple[str, ...]
    source_id: str | None

    def to_public(self) -> dict[str, Any]:
        return {
            "stop_id": self.stop_id,
            "territory_id": self.territory_id,
            "name": self.name,
            "lat": self.lat,
            "lon": self.lon,
            "modes": list(self.modes),
            "operator": self.operator,
            "lines": list(self.lines),
            "source_id": self.source_id,
        }


class ListTransitUseCase:
    """Lee el CSV de paradas y proyecta hacia la API."""

    def __init__(self, seed_dir: Path) -> None:
        self._seed_dir = seed_dir
        self._cache: tuple[TransitStop, ...] | None = None

    @property
    def csv_path(self) -> Path:
        return self._seed_dir / "transit_stops.csv"

    def list_stops(
        self,
        *,
        territory_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Lista paradas filtradas, paginadas y serializables."""
        stops = self._load()
        filtered = [
            stop for stop in stops if territory_id is None or stop.territory_id == territory_id
        ]
        bounded = filtered[offset : offset + limit]
        return [stop.to_public() for stop in bounded]

    def count_stops(self, *, territory_id: str | None = None) -> int:
        stops = self._load()
        return sum(1 for stop in stops if territory_id is None or stop.territory_id == territory_id)

    def _load(self) -> tuple[TransitStop, ...]:
        if self._cache is not None:
            return self._cache
        path = self.csv_path
        if not path.exists():
            logger.info(
                "transit.csv_missing",
                path=str(path),
                hint="El CSV todavía no se ha publicado; se devuelve lista vacía.",
            )
            self._cache = ()
            return self._cache
        stops: list[TransitStop] = []
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            columns = set(reader.fieldnames or [])
            missing = [c for c in REQUIRED_COLUMNS if c not in columns]
            if missing:
                raise ValueError(f"transit_stops.csv: columnas obligatorias ausentes: {missing}")
            for index, row in enumerate(reader, start=2):
                stops.append(_parse_row(row, index))
        self._cache = tuple(stops)
        logger.info("transit.csv_loaded", path=str(path), rows=len(stops))
        return self._cache


def _parse_row(row: dict[str, str], number: int) -> TransitStop:
    try:
        lat = float((row.get("lat") or "0").strip() or "0")
        lon = float((row.get("lon") or "0").strip() or "0")
    except ValueError as exc:
        raise ValueError(f"transit_stops.csv fila {number}: lat/lon no son decimales") from exc
    return TransitStop(
        stop_id=(row.get("stop_id") or "").strip(),
        territory_id=(row.get("territory_id") or "").strip(),
        name=(row.get("name") or "").strip(),
        lat=lat,
        lon=lon,
        modes=_split(row.get("modes")),
        operator=_optional_str(row.get("operator")),
        lines=_split(row.get("lines")),
        source_id=_optional_str(row.get("source_id")),
    )


def _split(value: str | None) -> tuple[str, ...]:
    if value is None:
        return ()
    cleaned = value.strip()
    if not cleaned:
        return ()
    separator = "|" if "|" in cleaned else ","
    return tuple(token.strip() for token in cleaned.split(separator) if token.strip())


def _optional_str(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


__all__ = ["ListTransitUseCase", "TransitStop"]
