"""Conector del MITECO — Reto Demográfico (datos demográficos).

Landing: https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/reto-demografico/datos-demograficos.html

Parsea indicadores demográficos a nivel municipal: edad mediana, índice de
envejecimiento y crecimiento vegetativo.
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
class DemographicRecord:
    """Fila normalizada del dataset demográfico del MITECO."""

    municipality_code: str
    name: str
    age_median: float
    aging_index: float
    demographic_growth: float
    period: str

    def as_row(self) -> dict[str, str]:
        return {
            "municipality_code": self.municipality_code,
            "name": self.name,
            "age_median": f"{self.age_median:.2f}",
            "aging_index": f"{self.aging_index:.2f}",
            "demographic_growth": f"{self.demographic_growth:.3f}",
            "period": self.period,
        }


class MitecoDemographicConnector:
    """Conector del dataset demográfico del Reto Demográfico del MITECO."""

    source_id = "miteco_reto_demografico_demografia"

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

    def parse(self, payload: DownloadedPayload) -> tuple[DemographicRecord, ...]:
        data = json.loads(payload.read_text())
        return parse_demographic_payload(data.get("rows", []), data.get("period", ""))

    def to_csv_rows(self, records: Sequence[DemographicRecord]) -> list[dict[str, str]]:
        return [record.as_row() for record in records]


def parse_demographic_payload(
    rows: Iterable[dict[str, Any]], period: str
) -> tuple[DemographicRecord, ...]:
    """Transforma filas brutas del MITECO demografía en objetos tipados."""
    parsed: list[DemographicRecord] = []
    for index, row in enumerate(rows, start=1):
        try:
            code = _normalize_ine_code(str(row["municipality_code"]))
            parsed.append(
                DemographicRecord(
                    municipality_code=code,
                    name=str(row["name"]).strip(),
                    age_median=float(row["age_median"]),
                    aging_index=float(row.get("aging_index", 0.0) or 0.0),
                    demographic_growth=float(row.get("demographic_growth", 0.0) or 0.0),
                    period=str(row.get("period", period or "")).strip(),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(
                f"miteco_demographic: fila {index} inválida ({exc!s}): {row!r}"
            ) from exc
    return tuple(parsed)


def _normalize_ine_code(code: str) -> str:
    stripped = code.strip()
    if stripped.isdigit():
        return stripped.zfill(5)
    return stripped


__all__ = [
    "DemographicRecord",
    "MitecoDemographicConnector",
    "parse_demographic_payload",
]
