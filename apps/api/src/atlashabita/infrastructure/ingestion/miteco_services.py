"""Conector del MITECO — Reto Demográfico (datos de servicios).

Landing: https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/reto-demografico/datos-servicios.html

Parsea el índice sintético de servicios básicos y los componentes
(sanidad; educación; comercio) a nivel municipal.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from atlashabita.infrastructure.ingestion.downloader import (
    DownloadedPayload,
    Downloader,
)
from atlashabita.infrastructure.ingestion.sources import SOURCE_REGISTRY, SourceMetadata


@dataclass(frozen=True, slots=True)
class ServicesRecord:
    """Fila normalizada del dataset de servicios del MITECO."""

    municipality_code: str
    name: str
    services_score: float
    health_coverage: float
    education_coverage: float
    retail_coverage: float
    period: str

    def as_row(self) -> dict[str, str]:
        return {
            "municipality_code": self.municipality_code,
            "name": self.name,
            "services_score": f"{self.services_score:.2f}",
            "health_coverage": f"{self.health_coverage:.2f}",
            "education_coverage": f"{self.education_coverage:.2f}",
            "retail_coverage": f"{self.retail_coverage:.2f}",
            "period": self.period,
        }


class MitecoServicesConnector:
    """Conector del dataset de servicios del Reto Demográfico del MITECO."""

    source_id = "miteco_reto_demografico_servicios"

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

    def parse(self, payload: DownloadedPayload) -> tuple[ServicesRecord, ...]:
        data = json.loads(payload.read_text())
        return parse_services_payload(data.get("rows", []), data.get("period", ""))

    def to_csv_rows(self, records: Sequence[ServicesRecord]) -> list[dict[str, str]]:
        return [record.as_row() for record in records]


def parse_services_payload(
    rows: Iterable[dict[str, Any]], period: str
) -> tuple[ServicesRecord, ...]:
    """Transforma filas brutas del MITECO servicios en objetos tipados."""
    parsed: list[ServicesRecord] = []
    for index, row in enumerate(rows, start=1):
        try:
            code = _normalize_ine_code(str(row["municipality_code"]))
            parsed.append(
                ServicesRecord(
                    municipality_code=code,
                    name=str(row["name"]).strip(),
                    services_score=float(row["services_score"]),
                    health_coverage=float(row.get("health_coverage", 0.0) or 0.0),
                    education_coverage=float(row.get("education_coverage", 0.0) or 0.0),
                    retail_coverage=float(row.get("retail_coverage", 0.0) or 0.0),
                    period=str(row.get("period", period or "")).strip(),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"miteco_services: fila {index} inválida ({exc!s}): {row!r}") from exc
    return tuple(parsed)


def _normalize_ine_code(code: str) -> str:
    stripped = code.strip()
    if stripped.isdigit():
        return stripped.zfill(5)
    return stripped


__all__ = [
    "MitecoServicesConnector",
    "ServicesRecord",
    "parse_services_payload",
]
