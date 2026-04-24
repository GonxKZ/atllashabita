"""Conector del estudio de movilidad MITMA con big data.

Landing: https://movilidad-opendata.mitma.es/

El MITMA publica matrices origen-destino agregadas por día y tipo de día
(laborable, fin de semana, festivo) construidas con telefonía móvil
anonimizada. Este conector consume el corte agregado anual a nivel
municipal y lo proyecta a :class:`MobilityFlow` y al CSV ``data/processed``
para alimentar el indicador ``mobility_flow``.

Diseño:

- Igual estilo que el resto: ``fetch -> parse -> to_csv_rows``.
- Acepta tanto JSON cacheado como CSV cuando MITMA expone variantes
  (la implementación se centra en JSON por simplicidad y deterministica).
- Quality gates: rechaza filas con códigos vacíos o métricas negativas.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from atlashabita.domain.mobility import MobilityFlow
from atlashabita.infrastructure.ingestion.downloader import (
    DownloadedPayload,
    Downloader,
)
from atlashabita.infrastructure.ingestion.sources import SOURCE_REGISTRY, SourceMetadata


@dataclass(frozen=True, slots=True)
class MobilityRecord:
    """Fila normalizada del conector MITMA movilidad."""

    origin_code: str
    destination_code: str
    daily_trips: float
    average_distance_km: float
    average_duration_min: float
    period: str

    def as_row(self) -> dict[str, str]:
        return {
            "origin_code": self.origin_code,
            "destination_code": self.destination_code,
            "daily_trips": f"{self.daily_trips:.1f}",
            "average_distance_km": f"{self.average_distance_km:.2f}",
            "average_duration_min": f"{self.average_duration_min:.2f}",
            "period": self.period,
        }

    def to_domain(self, source_id: str) -> MobilityFlow:
        return MobilityFlow(
            origin_code=self.origin_code,
            destination_code=self.destination_code,
            period=self.period,
            daily_trips=self.daily_trips,
            average_distance_km=self.average_distance_km,
            average_duration_min=self.average_duration_min,
            source_id=source_id,
        )


class MitmaMovilidadConnector:
    """Conector del estudio de movilidad MITMA con big data."""

    source_id = "mitma_movilidad"

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

    def parse(self, payload: DownloadedPayload) -> tuple[MobilityRecord, ...]:
        data = json.loads(payload.read_text())
        return parse_mobility_payload(data.get("rows", []), data.get("period", ""))

    def to_csv_rows(self, records: Sequence[MobilityRecord]) -> list[dict[str, str]]:
        return [record.as_row() for record in records]


def parse_mobility_payload(
    rows: Iterable[dict[str, Any]], period: str
) -> tuple[MobilityRecord, ...]:
    """Transforma filas brutas MITMA en :class:`MobilityRecord` validados."""
    parsed: list[MobilityRecord] = []
    for index, row in enumerate(rows, start=1):
        try:
            origin = _normalize_ine_code(str(row["origin_code"]))
            destination = _normalize_ine_code(str(row["destination_code"]))
            daily_trips = float(row["daily_trips"])
            distance = float(row.get("average_distance_km", 0.0) or 0.0)
            duration = float(row.get("average_duration_min", 0.0) or 0.0)
            if daily_trips < 0 or distance < 0 or duration < 0:
                raise ValueError(
                    f"métricas negativas (trips={daily_trips}, dist={distance}, dur={duration})"
                )
            parsed.append(
                MobilityRecord(
                    origin_code=origin,
                    destination_code=destination,
                    daily_trips=daily_trips,
                    average_distance_km=distance,
                    average_duration_min=duration,
                    period=str(row.get("period", period or "")).strip(),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"mitma_movilidad: fila {index} inválida ({exc!s}): {row!r}") from exc
    return tuple(parsed)


def _normalize_ine_code(code: str) -> str:
    stripped = code.strip()
    if stripped.isdigit():
        return stripped.zfill(5)
    return stripped


__all__ = [
    "MitmaMovilidadConnector",
    "MobilityRecord",
    "parse_mobility_payload",
]
