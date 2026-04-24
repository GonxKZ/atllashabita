"""Conector del anuario de accidentes de la DGT.

Landing: https://www.dgt.es/menusecundario/dgt-en-cifras/

El anuario estadístico publica conteos de accidentes con víctimas por
municipio y mes, distinguiendo víctimas mortales, heridos graves y
heridos leves. La DGT distribuye los microdatos en CSV (coma o punto y
coma); este conector parsea el formato canónico ``CSV con cabecera``.

Diseño:

- ``fetch`` reutiliza el :class:`Downloader` con fallback a fixture local.
- ``parse`` admite ``;`` o ``,`` como separadores y normaliza el código INE.
- Quality gate: rechaza filas con conteos negativos o periodo vacío.
"""

from __future__ import annotations

import csv
import io
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

from atlashabita.domain.accidents import RoadAccident
from atlashabita.infrastructure.ingestion.downloader import (
    DownloadedPayload,
    Downloader,
)
from atlashabita.infrastructure.ingestion.sources import SOURCE_REGISTRY, SourceMetadata

REQUIRED_COLUMNS = (
    "municipality_code",
    "name",
    "period",
    "accidents_total",
    "fatalities",
    "serious_injuries",
    "slight_injuries",
)


@dataclass(frozen=True, slots=True)
class AccidentRecord:
    """Fila normalizada del conector DGT."""

    municipality_code: str
    name: str
    period: str
    accidents_total: int
    fatalities: int
    serious_injuries: int
    slight_injuries: int

    def as_row(self) -> dict[str, str]:
        return {
            "municipality_code": self.municipality_code,
            "name": self.name,
            "period": self.period,
            "accidents_total": str(self.accidents_total),
            "fatalities": str(self.fatalities),
            "serious_injuries": str(self.serious_injuries),
            "slight_injuries": str(self.slight_injuries),
        }

    def to_domain(self, source_id: str) -> RoadAccident:
        return RoadAccident(
            territory_code=self.municipality_code,
            period=self.period,
            accidents_total=self.accidents_total,
            fatalities=self.fatalities,
            serious_injuries=self.serious_injuries,
            slight_injuries=self.slight_injuries,
            source_id=source_id,
        )


class DgtAccidentesConnector:
    """Conector del anuario de accidentes de la DGT."""

    source_id = "dgt_accidentes"

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
            filename=self._metadata.processed_filename,
            fixture_path=self._fixture_path,
        )

    def parse(self, payload: DownloadedPayload) -> tuple[AccidentRecord, ...]:
        return parse_accidents_payload(payload.read_text())

    def to_csv_rows(self, records: Sequence[AccidentRecord]) -> list[dict[str, str]]:
        return [record.as_row() for record in records]


def parse_accidents_payload(text: str) -> tuple[AccidentRecord, ...]:
    """Parsea un CSV de accidentes DGT (separador coma o punto y coma)."""
    text = text.lstrip("﻿")  # BOM defensivo.
    delimiter = _detect_delimiter(text)
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    columns = set(reader.fieldnames or [])
    missing = [c for c in REQUIRED_COLUMNS if c not in columns]
    if missing:
        raise ValueError(f"dgt_accidentes: columnas obligatorias ausentes: {missing}")
    return _build_records(reader)


def _build_records(rows: Iterable[dict[str, str]]) -> tuple[AccidentRecord, ...]:
    parsed: list[AccidentRecord] = []
    for index, row in enumerate(rows, start=2):
        try:
            code = _normalize_ine_code(row["municipality_code"])
            period = (row["period"] or "").strip()
            if not period:
                raise ValueError("periodo vacío")
            counts = {
                key: _parse_non_negative_int(row.get(key, "0"), key)
                for key in (
                    "accidents_total",
                    "fatalities",
                    "serious_injuries",
                    "slight_injuries",
                )
            }
            parsed.append(
                AccidentRecord(
                    municipality_code=code,
                    name=(row.get("name") or "").strip(),
                    period=period,
                    accidents_total=counts["accidents_total"],
                    fatalities=counts["fatalities"],
                    serious_injuries=counts["serious_injuries"],
                    slight_injuries=counts["slight_injuries"],
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"dgt_accidentes: fila {index} inválida ({exc!s}): {row!r}") from exc
    return tuple(parsed)


def _detect_delimiter(text: str) -> str:
    header = text.splitlines()[0] if text else ""
    return ";" if header.count(";") > header.count(",") else ","


def _parse_non_negative_int(raw: str, column: str) -> int:
    raw = (raw or "").strip()
    if not raw:
        return 0
    try:
        value = int(float(raw.replace(",", ".")))
    except ValueError as exc:
        raise ValueError(f"columna {column!r} no es entero: {raw!r}") from exc
    if value < 0:
        raise ValueError(f"columna {column!r} negativa: {value}")
    return value


def _normalize_ine_code(code: str) -> str:
    stripped = (code or "").strip()
    if not stripped:
        raise ValueError("municipality_code vacío")
    if stripped.isdigit():
        return stripped.zfill(5)
    return stripped


__all__ = [
    "AccidentRecord",
    "DgtAccidentesConnector",
    "parse_accidents_payload",
]
