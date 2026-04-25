"""Casos de uso para datos de accidentes (DGT y derivados).

Lee el CSV ``data/seed/accidents.csv`` (cuando exista) y expone:

- Listado por territorio.
- Indicador de riesgo agregado (accidentes por 1.000 habitantes).

Si el CSV todavía no se ha publicado, los métodos degradan a respuestas
neutras (lista vacía y riesgo cero) acompañados de un log informativo.
"""

from __future__ import annotations

import csv
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from atlashabita.infrastructure.ingestion import SeedDataset
from atlashabita.observability import get_logger

logger = get_logger(__name__)


REQUIRED_COLUMNS: tuple[str, ...] = (
    "territory_id",
    "period",
    "accidents",
)
OPTIONAL_COLUMNS: tuple[str, ...] = (
    "fatalities",
    "injuries",
    "severity",
    "source_id",
)


@dataclass(frozen=True, slots=True)
class AccidentRecord:
    """Registro normalizado de accidentes."""

    territory_id: str
    period: str
    accidents: float
    fatalities: float | None
    injuries: float | None
    severity: str | None
    source_id: str | None

    def to_public(self) -> dict[str, Any]:
        return {
            "territory_id": self.territory_id,
            "period": self.period,
            "accidents": self.accidents,
            "fatalities": self.fatalities,
            "injuries": self.injuries,
            "severity": self.severity,
            "source_id": self.source_id,
        }


class ListAccidentsUseCase:
    """Lee el CSV de accidentes y calcula indicadores derivados."""

    def __init__(self, seed_dir: Path, dataset: SeedDataset) -> None:
        self._seed_dir = seed_dir
        self._dataset = dataset
        self._cache: tuple[AccidentRecord, ...] | None = None

    @property
    def csv_path(self) -> Path:
        return self._seed_dir / "accidents.csv"

    def list_records(
        self,
        *,
        territory_id: str | None = None,
        period: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Lista accidentes filtrados, paginados y serializables."""
        match = _build_match(territory_id=territory_id, period=period)
        filtered = [record for record in self._load() if match(record)]
        bounded = filtered[offset : offset + limit]
        return [record.to_public() for record in bounded]

    def count_records(
        self,
        *,
        territory_id: str | None = None,
        period: str | None = None,
    ) -> int:
        match = _build_match(territory_id=territory_id, period=period)
        return sum(1 for record in self._load() if match(record))

    def risk(self, territory_id: str) -> dict[str, Any]:
        """Indicador de riesgo: accidentes por 1.000 habitantes y agregados.

        Si no hay datos para el territorio, devuelve un payload coherente
        con valores cero para que la pantalla técnica pueda renderizar la
        ficha sin manejar nulos. La iteración es **single-pass**: se recorren
        los records una sola vez acumulando los tres totales y el conteo, en
        lugar de filtrar la lista y volver a recorrerla tres veces más.
        """
        accidents = 0.0
        fatalities = 0.0
        injuries = 0.0
        records = 0
        for record in self._load():
            if record.territory_id != territory_id:
                continue
            accidents += record.accidents
            fatalities += record.fatalities or 0.0
            injuries += record.injuries or 0.0
            records += 1

        territory = self._dataset.get_territory(territory_id)
        population = territory.population if territory else None

        accidents_per_1000 = round(accidents / population * 1000, 4) if population else None
        fatalities_per_1000 = round(fatalities / population * 1000, 4) if population else None

        return {
            "territory_id": territory_id,
            "accidents": accidents,
            "fatalities": fatalities,
            "injuries": injuries,
            "population": population,
            "accidents_per_1000": accidents_per_1000,
            "fatalities_per_1000": fatalities_per_1000,
            "records": records,
        }

    def _load(self) -> tuple[AccidentRecord, ...]:
        if self._cache is not None:
            return self._cache
        path = self.csv_path
        if not path.exists():
            logger.info(
                "accidents.csv_missing",
                path=str(path),
                hint="El CSV todavía no se ha publicado; se devuelve lista vacía.",
            )
            self._cache = ()
            return self._cache
        records: list[AccidentRecord] = []
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            columns = set(reader.fieldnames or [])
            missing = [c for c in REQUIRED_COLUMNS if c not in columns]
            if missing:
                raise ValueError(f"accidents.csv: columnas obligatorias ausentes: {missing}")
            for index, row in enumerate(reader, start=2):
                records.append(_parse_row(row, index))
        self._cache = tuple(records)
        logger.info("accidents.csv_loaded", path=str(path), rows=len(records))
        return self._cache


def _build_match(
    *,
    territory_id: str | None,
    period: str | None,
) -> Callable[[AccidentRecord], bool]:
    """Construye un predicado reutilizable para los filtros opcionales.

    Tener una función única elimina la duplicación entre ``list_records`` y
    ``count_records`` (DRY) y permite cortocircuitar la evaluación cuando
    ningún filtro está activo.
    """
    if territory_id is None and period is None:
        return lambda _record: True
    if period is None:
        return lambda record: record.territory_id == territory_id
    if territory_id is None:
        return lambda record: record.period == period
    return lambda record: record.territory_id == territory_id and record.period == period


def _parse_row(row: dict[str, str], number: int) -> AccidentRecord:
    try:
        accidents = float((row.get("accidents") or "0").strip() or "0")
    except ValueError as exc:
        raise ValueError(
            f"accidents.csv fila {number}: 'accidents' no es decimal: {row.get('accidents')!r}"
        ) from exc
    return AccidentRecord(
        territory_id=(row.get("territory_id") or "").strip(),
        period=(row.get("period") or "").strip(),
        accidents=accidents,
        fatalities=_optional_float(row, "fatalities", number),
        injuries=_optional_float(row, "injuries", number),
        severity=_optional_str(row.get("severity")),
        source_id=_optional_str(row.get("source_id")),
    )


def _optional_str(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _optional_float(row: dict[str, str], column: str, number: int) -> float | None:
    raw = (row.get(column) or "").strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError as exc:
        raise ValueError(
            f"accidents.csv fila {number}: columna {column!r} no es decimal: {raw!r}"
        ) from exc


__all__ = ["AccidentRecord", "ListAccidentsUseCase"]
