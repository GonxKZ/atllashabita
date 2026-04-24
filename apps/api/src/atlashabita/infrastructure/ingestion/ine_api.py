"""Conector del INE - Datos abiertos (población, hogares, tamaño medio).

Se alinea con el portal oficial https://www.ine.es/datosabiertos/. El
conector sigue el contrato `fetch -> parse -> dataframe` y normaliza los
códigos INE a cinco dígitos.

Diseño:

- ``fetch()`` usa el :class:`Downloader` compartido, respeta el modo offline
  con fixtures versionados y devuelve una ruta al JSON bruto cacheado.
- ``parse()`` es puro: toma bytes/JSON y produce una secuencia de
  :class:`PopulationRecord`.
- ``to_csv_rows()`` y ``to_dataframe()`` proporcionan proyecciones listas para
  fusionar con otras fuentes en ``dataset_builder``.
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
class PopulationRecord:
    """Fila normalizada del conector INE población/hogares."""

    municipality_code: str
    name: str
    population: int
    households: int
    household_size: float
    period: str

    def as_row(self) -> dict[str, str]:
        return {
            "municipality_code": self.municipality_code,
            "name": self.name,
            "population": str(self.population),
            "households": str(self.households),
            "household_size": f"{self.household_size:.2f}",
            "period": self.period,
        }


class IneApiConnector:
    """Conector del portal INE datos abiertos."""

    source_id = "ine_datosabiertos"

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
        """Descarga o sirve el payload cacheado del INE datos abiertos."""
        return self._downloader.fetch(
            self._metadata.landing_url,
            filename=self._metadata.processed_filename.replace(".csv", ".json"),
            fixture_path=self._fixture_path,
        )

    def parse(self, payload: DownloadedPayload) -> tuple[PopulationRecord, ...]:
        """Parsea el JSON crudo a objetos :class:`PopulationRecord`."""
        data = json.loads(payload.read_text())
        return parse_population_payload(data.get("rows", []))

    def to_csv_rows(self, records: Sequence[PopulationRecord]) -> list[dict[str, str]]:
        """Serializa los registros a filas listas para CSV normalizado."""
        return [record.as_row() for record in records]


def parse_population_payload(rows: Iterable[dict[str, Any]]) -> tuple[PopulationRecord, ...]:
    """Transforma filas JSON heterogéneas en registros tipados.

    Está separado del conector para facilitar los tests unitarios sobre
    payloads sintéticos.
    """
    parsed: list[PopulationRecord] = []
    for index, row in enumerate(rows, start=1):
        try:
            code = _normalize_ine_code(str(row["municipality_code"]))
            parsed.append(
                PopulationRecord(
                    municipality_code=code,
                    name=str(row["name"]).strip(),
                    population=int(row["population"]),
                    households=int(row.get("households", 0) or 0),
                    household_size=float(row.get("household_size", 0.0) or 0.0),
                    period=str(row.get("period", "")).strip(),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"ine_api: fila {index} inválida ({exc!s}): {row!r}") from exc
    return tuple(parsed)


def _normalize_ine_code(code: str) -> str:
    stripped = code.strip()
    if stripped.isdigit():
        return stripped.zfill(5)
    return stripped


__all__ = ["IneApiConnector", "PopulationRecord", "parse_population_payload"]
