"""Conector del Atlas de Distribución de Renta de los Hogares (INE).

Publicación oficial: https://www.ine.es/dynt3/inebase/index.htm?capsel=5650
El Atlas publica indicadores de renta y desigualdad a nivel municipal,
distrito y sección censal. Esta implementación cubre el nivel municipal,
suficiente para alimentar ``income_per_capita`` del dataset nacional.
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
class IncomeRecord:
    """Fila normalizada del Atlas de Renta."""

    municipality_code: str
    name: str
    net_income_per_capita: float
    gini: float
    period: str

    def as_row(self) -> dict[str, str]:
        return {
            "municipality_code": self.municipality_code,
            "name": self.name,
            "net_income_per_capita": f"{self.net_income_per_capita:.2f}",
            "gini": f"{self.gini:.2f}",
            "period": self.period,
        }


class IneAtlasRentaConnector:
    """Conector del Atlas de Renta del INE (nivel municipal)."""

    source_id = "ine_atlas_renta"

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

    def parse(self, payload: DownloadedPayload) -> tuple[IncomeRecord, ...]:
        data = json.loads(payload.read_text())
        return parse_income_payload(data.get("rows", []), data.get("period", ""))

    def to_csv_rows(self, records: Sequence[IncomeRecord]) -> list[dict[str, str]]:
        return [record.as_row() for record in records]


def parse_income_payload(rows: Iterable[dict[str, Any]], period: str) -> tuple[IncomeRecord, ...]:
    """Transforma filas brutas del Atlas de Renta en objetos tipados."""
    parsed: list[IncomeRecord] = []
    for index, row in enumerate(rows, start=1):
        try:
            code = _normalize_ine_code(str(row["municipality_code"]))
            parsed.append(
                IncomeRecord(
                    municipality_code=code,
                    name=str(row["name"]).strip(),
                    net_income_per_capita=float(row["net_income_per_capita"]),
                    gini=float(row.get("gini", 0.0) or 0.0),
                    period=str(row.get("period", period or "")).strip(),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"ine_atlas_renta: fila {index} inválida ({exc!s}): {row!r}") from exc
    return tuple(parsed)


def _normalize_ine_code(code: str) -> str:
    stripped = code.strip()
    if stripped.isdigit():
        return stripped.zfill(5)
    return stripped


__all__ = ["IncomeRecord", "IneAtlasRentaConnector", "parse_income_payload"]
