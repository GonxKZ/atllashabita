"""Conector del DIRCE — Directorio Central de Empresas del INE.

Landing: https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C
El DIRCE recoge empresas activas por CNAE y municipio. Aquí se parsea la
versión municipal agregada y se derivan dos columnas:

- ``active_enterprises``: número absoluto de empresas.
- ``enterprises_per_1k``: densidad por cada 1.000 habitantes (se publica
  directamente por INE o se calcula cuando falta).
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
class EnterpriseRecord:
    """Fila normalizada del DIRCE."""

    municipality_code: str
    name: str
    active_enterprises: int
    enterprises_per_1k: float
    period: str

    def as_row(self) -> dict[str, str]:
        return {
            "municipality_code": self.municipality_code,
            "name": self.name,
            "active_enterprises": str(self.active_enterprises),
            "enterprises_per_1k": f"{self.enterprises_per_1k:.2f}",
            "period": self.period,
        }


class IneDirceConnector:
    """Conector del DIRCE a nivel municipal."""

    source_id = "ine_dirce"

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

    def parse(self, payload: DownloadedPayload) -> tuple[EnterpriseRecord, ...]:
        data = json.loads(payload.read_text())
        return parse_dirce_payload(data.get("rows", []), data.get("period", ""))

    def to_csv_rows(self, records: Sequence[EnterpriseRecord]) -> list[dict[str, str]]:
        return [record.as_row() for record in records]


def parse_dirce_payload(
    rows: Iterable[dict[str, Any]], period: str
) -> tuple[EnterpriseRecord, ...]:
    """Transforma filas brutas del DIRCE en objetos tipados."""
    parsed: list[EnterpriseRecord] = []
    for index, row in enumerate(rows, start=1):
        try:
            code = _normalize_ine_code(str(row["municipality_code"]))
            parsed.append(
                EnterpriseRecord(
                    municipality_code=code,
                    name=str(row["name"]).strip(),
                    active_enterprises=int(row["active_enterprises"]),
                    enterprises_per_1k=float(row["enterprises_per_1k"]),
                    period=str(row.get("period", period or "")).strip(),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"ine_dirce: fila {index} inválida ({exc!s}): {row!r}") from exc
    return tuple(parsed)


def _normalize_ine_code(code: str) -> str:
    stripped = code.strip()
    if stripped.isdigit():
        return stripped.zfill(5)
    return stripped


__all__ = ["EnterpriseRecord", "IneDirceConnector", "parse_dirce_payload"]
