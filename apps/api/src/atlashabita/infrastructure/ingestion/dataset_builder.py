"""Orquestador de fuentes oficiales → dataset seed unificado.

El ``DatasetBuilder`` encapsula el paso "integración" del pipeline:

1. Resuelve cada conector (INE API, Atlas de Renta, DIRCE, MITECO
   demografía, MITECO servicios) y les pide su payload normalizado.
2. Escribe las salidas individuales como CSV en ``data/processed/`` para
   trazabilidad y consumo externo.
3. Publica un manifiesto JSON con los conteos de filas, los checksums de
   las descargas y las rutas generadas.

El dataset seed principal (``data/seed/*.csv``) se mantiene versionado en
el repositorio; este builder no lo sobreescribe: su rol es materializar
los CSV auxiliares por fuente para que el ``SeedLoader`` y los quality
gates dispongan de los datos completos sin depender de red.
"""

from __future__ import annotations

import csv
import hashlib
import json
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from atlashabita.infrastructure.ingestion.downloader import Downloader
from atlashabita.infrastructure.ingestion.ine_api import IneApiConnector
from atlashabita.infrastructure.ingestion.ine_atlas_renta import (
    IneAtlasRentaConnector,
)
from atlashabita.infrastructure.ingestion.ine_dirce import IneDirceConnector
from atlashabita.infrastructure.ingestion.miteco_demographic import (
    MitecoDemographicConnector,
)
from atlashabita.infrastructure.ingestion.miteco_services import (
    MitecoServicesConnector,
)
from atlashabita.infrastructure.ingestion.sources import (
    SOURCE_REGISTRY,
    default_fixture_dir,
)


@dataclass(frozen=True, slots=True)
class SourceArtifact:
    """Describe un CSV normalizado generado por un conector."""

    source_id: str
    processed_path: Path
    row_count: int
    checksum_sha256: str
    from_cache: bool


@dataclass(frozen=True, slots=True)
class DatasetManifest:
    """Manifiesto global del build con metadatos reproducibles."""

    generated_at: str
    processed_dir: Path
    manifest_path: Path
    artifacts: tuple[SourceArtifact, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {
            "generated_at": self.generated_at,
            "processed_dir": str(self.processed_dir).replace("\\", "/"),
            "manifest_path": str(self.manifest_path).replace("\\", "/"),
            "sources": [
                {
                    "id": artifact.source_id,
                    "processed_path": str(artifact.processed_path).replace("\\", "/"),
                    "row_count": artifact.row_count,
                    "checksum_sha256": artifact.checksum_sha256,
                    "from_cache": artifact.from_cache,
                }
                for artifact in self.artifacts
            ],
        }


class DatasetBuilder:
    """Compone los CSV auxiliares de cada fuente bajo ``data/processed``."""

    def __init__(
        self,
        *,
        downloader: Downloader,
        processed_dir: Path,
        reports_dir: Path,
        fixture_dir: Path | None = None,
    ) -> None:
        self._downloader = downloader
        self._processed_dir = processed_dir
        self._reports_dir = reports_dir
        fixtures = fixture_dir or default_fixture_dir()
        self._ine_api = IneApiConnector(downloader, fixture_dir=fixtures)
        self._ine_atlas = IneAtlasRentaConnector(downloader, fixture_dir=fixtures)
        self._ine_dirce = IneDirceConnector(downloader, fixture_dir=fixtures)
        self._miteco_demo = MitecoDemographicConnector(downloader, fixture_dir=fixtures)
        self._miteco_svc = MitecoServicesConnector(downloader, fixture_dir=fixtures)

    def build(self) -> DatasetManifest:
        """Ejecuta cada conector y escribe los CSV + manifiesto."""
        self._processed_dir.mkdir(parents=True, exist_ok=True)
        self._reports_dir.mkdir(parents=True, exist_ok=True)

        artifacts: list[SourceArtifact] = []

        ine_population = self._ine_api.fetch()
        pop_records = self._ine_api.parse(ine_population)
        artifacts.append(
            self._write_csv(
                source_id=self._ine_api.source_id,
                rows=self._ine_api.to_csv_rows(pop_records),
                fieldnames=(
                    "municipality_code",
                    "name",
                    "population",
                    "households",
                    "household_size",
                    "period",
                ),
                from_cache=ine_population.from_cache,
            )
        )

        ine_income = self._ine_atlas.fetch()
        income_records = self._ine_atlas.parse(ine_income)
        artifacts.append(
            self._write_csv(
                source_id=self._ine_atlas.source_id,
                rows=self._ine_atlas.to_csv_rows(income_records),
                fieldnames=(
                    "municipality_code",
                    "name",
                    "net_income_per_capita",
                    "gini",
                    "period",
                ),
                from_cache=ine_income.from_cache,
            )
        )

        dirce_payload = self._ine_dirce.fetch()
        dirce_records = self._ine_dirce.parse(dirce_payload)
        artifacts.append(
            self._write_csv(
                source_id=self._ine_dirce.source_id,
                rows=self._ine_dirce.to_csv_rows(dirce_records),
                fieldnames=(
                    "municipality_code",
                    "name",
                    "active_enterprises",
                    "enterprises_per_1k",
                    "period",
                ),
                from_cache=dirce_payload.from_cache,
            )
        )

        demo_payload = self._miteco_demo.fetch()
        demo_records = self._miteco_demo.parse(demo_payload)
        artifacts.append(
            self._write_csv(
                source_id=self._miteco_demo.source_id,
                rows=self._miteco_demo.to_csv_rows(demo_records),
                fieldnames=(
                    "municipality_code",
                    "name",
                    "age_median",
                    "aging_index",
                    "demographic_growth",
                    "period",
                ),
                from_cache=demo_payload.from_cache,
            )
        )

        svc_payload = self._miteco_svc.fetch()
        svc_records = self._miteco_svc.parse(svc_payload)
        artifacts.append(
            self._write_csv(
                source_id=self._miteco_svc.source_id,
                rows=self._miteco_svc.to_csv_rows(svc_records),
                fieldnames=(
                    "municipality_code",
                    "name",
                    "services_score",
                    "health_coverage",
                    "education_coverage",
                    "retail_coverage",
                    "period",
                ),
                from_cache=svc_payload.from_cache,
            )
        )

        manifest = DatasetManifest(
            generated_at=datetime.now(tz=UTC).isoformat(timespec="seconds"),
            processed_dir=self._processed_dir,
            manifest_path=self._reports_dir / "dataset_builder_manifest.json",
            artifacts=tuple(artifacts),
        )
        manifest.manifest_path.write_text(
            json.dumps(manifest.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return manifest

    # ------------------------------------------------------------------
    # Internos
    # ------------------------------------------------------------------

    def _write_csv(
        self,
        *,
        source_id: str,
        rows: Sequence[dict[str, str]],
        fieldnames: Sequence[str],
        from_cache: bool,
    ) -> SourceArtifact:
        metadata = SOURCE_REGISTRY[source_id]
        target = self._processed_dir / metadata.processed_filename
        with target.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(fieldnames))
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
        checksum = hashlib.sha256(target.read_bytes()).hexdigest()
        return SourceArtifact(
            source_id=source_id,
            processed_path=target,
            row_count=len(rows),
            checksum_sha256=checksum,
            from_cache=from_cache,
        )


__all__ = [
    "DatasetBuilder",
    "DatasetManifest",
    "SourceArtifact",
]
