"""Lector del dataset demo versionado en ``data/seed``.

Lee los cinco CSV (territorios, fuentes, indicadores, observaciones y perfiles)
y los transforma en los objetos valor del dominio. Es el único punto de
entrada que convierte ficheros tabulares en entidades puras; ningún otro
módulo depende directamente de ``csv``.

Diseño:

- Usa la librería estándar para evitar añadir pandas/polars cuando todavía no
  aportan valor (el dataset demo tiene 50 observaciones).
- Cachea la lectura mediante ``@lru_cache`` para que las pruebas y los
  endpoints puedan llamarlo repetidas veces sin recalcular.
- Es estricto con los errores: una fila mal formada lanza una excepción con
  el número de fila y la columna, no produce datos silenciosamente corruptos.
"""

from __future__ import annotations

import csv
import json
from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from types import MappingProxyType

from atlashabita.config import Settings
from atlashabita.domain.indicators import (
    Indicator,
    IndicatorDirection,
    IndicatorObservation,
)
from atlashabita.domain.profiles import DecisionProfile
from atlashabita.domain.sources import DataSource
from atlashabita.domain.territories import GeoPoint, Territory, TerritoryKind

REQUIRED_TERRITORY_COLUMNS = (
    "kind",
    "code",
    "name",
    "parent_code",
    "province_code",
    "autonomous_community_code",
    "lat",
    "lon",
    "population",
    "area_km2",
)
REQUIRED_SOURCE_COLUMNS = (
    "id",
    "title",
    "publisher",
    "url",
    "license",
    "periodicity",
    "description",
    "indicators",
)
REQUIRED_INDICATOR_COLUMNS = (
    "code",
    "label",
    "unit",
    "direction",
    "description",
    "source_id",
    "min_value",
    "max_value",
)
REQUIRED_OBSERVATION_COLUMNS = (
    "indicator_code",
    "territory_id",
    "period",
    "value",
    "source_id",
    "quality",
)
REQUIRED_PROFILE_COLUMNS = ("id", "label", "description", "weights")


@dataclass(frozen=True, slots=True)
class SeedDataset:
    """Colección de objetos valor derivada del dataset demo."""

    territories: tuple[Territory, ...]
    sources: tuple[DataSource, ...]
    indicators: tuple[Indicator, ...]
    observations: tuple[IndicatorObservation, ...]
    profiles: tuple[DecisionProfile, ...]

    @property
    def municipalities(self) -> tuple[Territory, ...]:
        return tuple(t for t in self.territories if t.kind is TerritoryKind.MUNICIPALITY)

    @property
    def provinces(self) -> tuple[Territory, ...]:
        return tuple(t for t in self.territories if t.kind is TerritoryKind.PROVINCE)

    @property
    def autonomous_communities(self) -> tuple[Territory, ...]:
        return tuple(t for t in self.territories if t.kind is TerritoryKind.AUTONOMOUS_COMMUNITY)

    def get_territory(self, identifier: str) -> Territory | None:
        for territory in self.territories:
            if territory.identifier == identifier:
                return territory
        return None


class SeedLoader:
    """Lee el pack demo y entrega entidades de dominio inmutables."""

    def __init__(self, seed_dir: Path) -> None:
        self._seed_dir = seed_dir

    @property
    def seed_dir(self) -> Path:
        return self._seed_dir

    def load(self) -> SeedDataset:
        if not self._seed_dir.exists():
            raise FileNotFoundError(
                f"No existe el directorio de seed: {self._seed_dir}. "
                "Confirma que data/seed/ se ha conservado en el checkout."
            )
        territories = self._load_territories()
        sources = self._load_sources()
        indicators = self._load_indicators()
        observations = self._load_observations()
        profiles = self._load_profiles()
        return SeedDataset(
            territories=territories,
            sources=sources,
            indicators=indicators,
            observations=observations,
            profiles=profiles,
        )

    def _load_territories(self) -> tuple[Territory, ...]:
        rows = self._read_csv("territories.csv", REQUIRED_TERRITORY_COLUMNS)
        result: list[Territory] = []
        for row, number in rows:
            kind = TerritoryKind(row["kind"])
            lat = _parse_optional_float(row, "lat", number)
            lon = _parse_optional_float(row, "lon", number)
            centroid = GeoPoint(lat=lat, lon=lon) if lat is not None and lon is not None else None
            result.append(
                Territory(
                    code=row["code"].strip(),
                    name=row["name"].strip(),
                    kind=kind,
                    parent_code=_non_empty(row.get("parent_code")),
                    province_code=_non_empty(row.get("province_code")),
                    autonomous_community_code=_non_empty(row.get("autonomous_community_code")),
                    centroid=centroid,
                    population=_parse_optional_int(row, "population", number),
                    area_km2=_parse_optional_float(row, "area_km2", number),
                )
            )
        return tuple(result)

    def _load_sources(self) -> tuple[DataSource, ...]:
        rows = self._read_csv("sources.csv", REQUIRED_SOURCE_COLUMNS)
        result: list[DataSource] = []
        for row, _ in rows:
            indicators = (
                tuple(
                    indicator.strip()
                    for indicator in row["indicators"].split("|")
                    if indicator.strip()
                )
                if "|" in row["indicators"]
                else (tuple(i.strip() for i in row["indicators"].split(",") if i.strip()))
            )
            result.append(
                DataSource(
                    id=row["id"].strip(),
                    title=row["title"].strip(),
                    publisher=row["publisher"].strip(),
                    url=row["url"].strip(),
                    license=row["license"].strip(),
                    periodicity=row["periodicity"].strip(),
                    description=row["description"].strip(),
                    indicators=indicators,
                )
            )
        return tuple(result)

    def _load_indicators(self) -> tuple[Indicator, ...]:
        rows = self._read_csv("indicators.csv", REQUIRED_INDICATOR_COLUMNS)
        result: list[Indicator] = []
        for row, number in rows:
            result.append(
                Indicator(
                    code=row["code"].strip(),
                    label=row["label"].strip(),
                    unit=row["unit"].strip(),
                    direction=IndicatorDirection(row["direction"].strip()),
                    description=row["description"].strip(),
                    source_id=row["source_id"].strip(),
                    min_value=_parse_optional_float(row, "min_value", number),
                    max_value=_parse_optional_float(row, "max_value", number),
                )
            )
        return tuple(result)

    def _load_observations(self) -> tuple[IndicatorObservation, ...]:
        rows = self._read_csv("observations.csv", REQUIRED_OBSERVATION_COLUMNS)
        result: list[IndicatorObservation] = []
        for row, number in rows:
            value = _parse_required_float(row, "value", number)
            result.append(
                IndicatorObservation(
                    indicator_code=row["indicator_code"].strip(),
                    territory_id=row["territory_id"].strip(),
                    period=row["period"].strip(),
                    value=value,
                    source_id=row["source_id"].strip(),
                    quality=(row.get("quality") or "ok").strip() or "ok",
                )
            )
        return tuple(result)

    def _load_profiles(self) -> tuple[DecisionProfile, ...]:
        rows = self._read_csv("profiles.csv", REQUIRED_PROFILE_COLUMNS)
        result: list[DecisionProfile] = []
        for row, number in rows:
            try:
                weights = json.loads(row["weights"])
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"profiles.csv fila {number}: pesos JSON inválidos ({exc.msg})"
                ) from exc
            if not isinstance(weights, dict):
                raise ValueError(
                    f"profiles.csv fila {number}: el campo weights debe ser un objeto JSON."
                )
            result.append(
                DecisionProfile(
                    id=row["id"].strip(),
                    label=row["label"].strip(),
                    description=row["description"].strip(),
                    weights=MappingProxyType({str(k): float(v) for k, v in weights.items()}),
                )
            )
        return tuple(result)

    def _read_csv(
        self, filename: str, required_columns: Iterable[str]
    ) -> list[tuple[dict[str, str], int]]:
        path = self._seed_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Falta el fichero seed obligatorio: {path}")
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            columns = set(reader.fieldnames or [])
            missing = [c for c in required_columns if c not in columns]
            if missing:
                raise ValueError(f"{filename}: columnas obligatorias ausentes: {missing}")
            rows: list[tuple[dict[str, str], int]] = []
            for index, row in enumerate(reader, start=2):  # 1-based + cabecera
                rows.append((row, index))
        return rows


def _non_empty(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _parse_optional_int(row: dict[str, str], column: str, number: int) -> int | None:
    raw = row.get(column, "").strip()
    if not raw:
        return None
    try:
        return int(float(raw))
    except ValueError as exc:
        raise ValueError(f"fila {number}: columna {column!r} no es entero: {raw!r}") from exc


def _parse_optional_float(row: dict[str, str], column: str, number: int) -> float | None:
    raw = row.get(column, "").strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError as exc:
        raise ValueError(f"fila {number}: columna {column!r} no es decimal: {raw!r}") from exc


def _parse_required_float(row: dict[str, str], column: str, number: int) -> float:
    value = _parse_optional_float(row, column, number)
    if value is None:
        raise ValueError(f"fila {number}: columna {column!r} es obligatoria")
    return value


@lru_cache(maxsize=1)
def seed_loader_from_settings(settings: Settings) -> SeedLoader:
    """Singleton de lector para la configuración dada."""
    return SeedLoader(settings.data_zone("seed"))
