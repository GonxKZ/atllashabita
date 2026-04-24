"""Pruebas del orquestador `DatasetBuilder` con las fuentes ampliadas (M11)."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.ingestion.dataset_builder import DatasetBuilder
from atlashabita.infrastructure.ingestion.downloader import Downloader

REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = REPO_ROOT / "data" / "seed"
FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"

EXTENDED_SOURCES = {
    "ine_datosabiertos",
    "ine_atlas_renta",
    "ine_dirce",
    "miteco_reto_demografico_demografia",
    "miteco_reto_demografico_servicios",
    "mitma_movilidad",
    "dgt_accidentes",
    "crtm_gtfs",
}


def test_dataset_builder_genera_todas_las_fuentes(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "raw")
    builder = DatasetBuilder(
        downloader=downloader,
        processed_dir=tmp_path / "processed",
        reports_dir=tmp_path / "reports",
        fixture_dir=FIXTURE_DIR,
    )
    manifest = builder.build()
    content = json.loads(manifest.manifest_path.read_text(encoding="utf-8"))
    source_ids = {entry["id"] for entry in content["sources"]}
    assert source_ids == EXTENDED_SOURCES
    for entry in content["sources"]:
        assert entry["row_count"] > 0
        assert len(entry["checksum_sha256"]) == 64
        assert Path(entry["processed_path"]).exists()


def test_seed_incluye_indicadores_movilidad_accidentes_transporte() -> None:
    dataset = SeedLoader(SEED_DIR).load()
    codes = {indicator.code for indicator in dataset.indicators}
    assert {"mobility_flow", "accident_rate", "transit_score"} <= codes


def test_seed_incluye_fuentes_oficiales_extendidas() -> None:
    dataset = SeedLoader(SEED_DIR).load()
    ids = {source.id for source in dataset.sources}
    assert {"mitma_movilidad", "dgt_accidentes", "crtm_gtfs"} <= ids


def test_seed_observaciones_cubren_todos_los_indicadores_nuevos() -> None:
    dataset = SeedLoader(SEED_DIR).load()
    municipalities = {t.identifier for t in dataset.municipalities}
    for indicator_code in ("mobility_flow", "accident_rate", "transit_score"):
        territories_with_obs = {
            obs.territory_id for obs in dataset.observations if obs.indicator_code == indicator_code
        }
        assert territories_with_obs == municipalities, indicator_code


def test_mobility_flows_csv_existente_y_consistente() -> None:
    flows_path = SEED_DIR / "mobility_flows.csv"
    assert flows_path.exists()
    with flows_path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert rows
    required = {
        "source_id",
        "origin_code",
        "destination_code",
        "period",
        "daily_trips",
        "average_distance_km",
        "average_duration_min",
    }
    assert required <= set(rows[0].keys())
    assert all(row["source_id"] == "mitma_movilidad" for row in rows)
    assert all(float(row["daily_trips"]) >= 0 for row in rows)


def test_accidents_csv_cubre_municipios_seed() -> None:
    accidents_path = SEED_DIR / "accidents.csv"
    assert accidents_path.exists()
    with accidents_path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    seed = SeedLoader(SEED_DIR).load()
    municipalities = {m.code for m in seed.municipalities}
    covered = {row["municipality_code"] for row in rows}
    assert covered == municipalities
    assert all(int(row["accidents_total"]) >= 0 for row in rows)


def test_transit_stops_csv_existente_para_madrid_metropolitano() -> None:
    stops_path = SEED_DIR / "transit_stops.csv"
    assert stops_path.exists()
    with stops_path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert rows
    municipios = {row["municipality_code"] for row in rows}
    assert {"28079", "28092", "28005"} <= municipios
    assert all(row["source_id"] == "crtm_gtfs" for row in rows)
    assert all(-90.0 <= float(row["lat"]) <= 90.0 for row in rows)
