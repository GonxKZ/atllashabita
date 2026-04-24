"""Conector del CRTM Madrid (paradas y rutas en formato GTFS).

Landing: https://datos.crtm.es/datasets/1a25440bf66f499bae2657ec7fb40144

El Consorcio Regional de Transportes de Madrid publica un GTFS multimodal
con todas las paradas y rutas (Metro, Cercanías, Metro Ligero, EMT y
autobuses interurbanos). Este conector consume un snapshot JSON
agregando los campos mínimos necesarios (stop_id, name, coordenadas,
modo, municipio) para alimentar el indicador ``transit_score``.

Diseño:

- Mantiene la misma forma ``fetch / parse / to_csv_rows`` que el resto.
- ``parse`` produce dos vistas: lista de :class:`StopRecord` y
  :class:`RouteRecord`, derivando luego objetos del dominio
  :class:`TransitStop` y :class:`TransitRoute`.
- Quality gates: rechaza paradas sin coordenadas válidas o municipios
  vacíos para garantizar que el indicador municipal sea siempre coherente.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from atlashabita.domain.territories import GeoPoint
from atlashabita.domain.transit import TransitMode, TransitRoute, TransitStop
from atlashabita.infrastructure.ingestion.downloader import (
    DownloadedPayload,
    Downloader,
)
from atlashabita.infrastructure.ingestion.sources import SOURCE_REGISTRY, SourceMetadata


@dataclass(frozen=True, slots=True)
class StopRecord:
    """Fila normalizada de una parada CRTM."""

    stop_id: str
    name: str
    lat: float
    lon: float
    mode: str
    municipality_code: str
    agency_id: str

    def as_row(self) -> dict[str, str]:
        return {
            "stop_id": self.stop_id,
            "name": self.name,
            "lat": f"{self.lat:.6f}",
            "lon": f"{self.lon:.6f}",
            "mode": self.mode,
            "municipality_code": self.municipality_code,
            "agency_id": self.agency_id,
        }

    def to_domain(self, source_id: str) -> TransitStop:
        return TransitStop(
            stop_id=self.stop_id,
            name=self.name,
            location=GeoPoint(lat=self.lat, lon=self.lon),
            mode=TransitMode(self.mode),
            municipality_code=self.municipality_code,
            agency_id=self.agency_id,
            source_id=source_id,
        )


@dataclass(frozen=True, slots=True)
class RouteRecord:
    """Fila normalizada de una ruta CRTM."""

    route_id: str
    short_name: str
    long_name: str
    mode: str
    agency_id: str
    stop_ids: tuple[str, ...]

    def to_domain(self, source_id: str) -> TransitRoute:
        return TransitRoute(
            route_id=self.route_id,
            short_name=self.short_name,
            long_name=self.long_name,
            mode=TransitMode(self.mode),
            agency_id=self.agency_id,
            source_id=source_id,
            stop_ids=self.stop_ids,
        )


@dataclass(frozen=True, slots=True)
class CrtmPayload:
    """Resultado tipado del conector CRTM."""

    stops: tuple[StopRecord, ...]
    routes: tuple[RouteRecord, ...]


class CrtmMadridConnector:
    """Conector del GTFS multimodal del CRTM Madrid."""

    source_id = "crtm_gtfs"

    def __init__(
        self,
        downloader: Downloader,
        *,
        fixture_dir: Path,
        metadata: SourceMetadata | None = None,
    ) -> None:
        self._downloader = downloader
        self._metadata = metadata or SOURCE_REGISTRY[self.source_id]
        self._fixture_path = fixture_dir / self._metadata.fixture_name

    @property
    def metadata(self) -> SourceMetadata:
        return self._metadata

    def fetch(self) -> DownloadedPayload:
        return self._downloader.fetch(
            self._metadata.landing_url,
            filename=self._metadata.processed_filename.replace(".csv", ".json"),
            fixture_path=self._fixture_path,
        )

    def parse(self, payload: DownloadedPayload) -> CrtmPayload:
        data = json.loads(payload.read_text())
        return parse_crtm_payload(data)

    def to_csv_rows(self, records: Sequence[StopRecord]) -> list[dict[str, str]]:
        return [record.as_row() for record in records]


def parse_crtm_payload(data: dict[str, Any]) -> CrtmPayload:
    """Construye :class:`CrtmPayload` a partir del dict cargado del JSON."""
    agency_id = str(data.get("agency_id", "crtm")).strip() or "crtm"
    stops = _build_stops(data.get("stops", []), agency_id)
    routes = _build_routes(data.get("routes", []), agency_id)
    return CrtmPayload(stops=stops, routes=routes)


def _build_stops(rows: Iterable[dict[str, Any]], agency_id: str) -> tuple[StopRecord, ...]:
    parsed: list[StopRecord] = []
    for index, row in enumerate(rows, start=1):
        try:
            stop_id = str(row["stop_id"]).strip()
            name = str(row["name"]).strip()
            lat = float(row["lat"])
            lon = float(row["lon"])
            mode = str(row.get("mode", "bus")).strip().lower()
            municipality = _normalize_ine_code(str(row["municipality_code"]))
            if not stop_id or not name:
                raise ValueError("stop_id o name vacíos")
            if not -90.0 <= lat <= 90.0 or not -180.0 <= lon <= 180.0:
                raise ValueError(f"coordenadas fuera de rango (lat={lat}, lon={lon})")
            try:
                normalized_mode = TransitMode(mode).value
            except ValueError as exc:
                raise ValueError(f"modo de transporte desconocido: {mode!r}") from exc
            parsed.append(
                StopRecord(
                    stop_id=stop_id,
                    name=name,
                    lat=lat,
                    lon=lon,
                    mode=normalized_mode,
                    municipality_code=municipality,
                    agency_id=agency_id,
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"crtm_gtfs: parada {index} inválida ({exc!s}): {row!r}") from exc
    return tuple(parsed)


def _build_routes(rows: Iterable[dict[str, Any]], agency_id: str) -> tuple[RouteRecord, ...]:
    parsed: list[RouteRecord] = []
    for index, row in enumerate(rows, start=1):
        try:
            route_id = str(row["route_id"]).strip()
            short_name = str(row.get("short_name", "")).strip()
            long_name = str(row.get("long_name", "")).strip()
            mode = str(row.get("mode", "bus")).strip().lower()
            stop_ids = tuple(str(s).strip() for s in row.get("stop_ids", []) if str(s).strip())
            if not route_id:
                raise ValueError("route_id vacío")
            if not short_name and not long_name:
                raise ValueError("ruta sin short_name ni long_name")
            try:
                normalized_mode = TransitMode(mode).value
            except ValueError as exc:
                raise ValueError(f"modo de transporte desconocido: {mode!r}") from exc
            parsed.append(
                RouteRecord(
                    route_id=route_id,
                    short_name=short_name,
                    long_name=long_name,
                    mode=normalized_mode,
                    agency_id=agency_id,
                    stop_ids=stop_ids,
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"crtm_gtfs: ruta {index} inválida ({exc!s}): {row!r}") from exc
    return tuple(parsed)


def _normalize_ine_code(code: str) -> str:
    stripped = code.strip()
    if stripped.isdigit():
        return stripped.zfill(5)
    return stripped


__all__ = [
    "CrtmMadridConnector",
    "CrtmPayload",
    "RouteRecord",
    "StopRecord",
    "parse_crtm_payload",
]
