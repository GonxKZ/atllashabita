"""Pruebas del orquestador `DatasetBuilder` y del dataset seed nacional."""

from __future__ import annotations

import json
from pathlib import Path

from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.ingestion.dataset_builder import DatasetBuilder
from atlashabita.infrastructure.ingestion.downloader import Downloader

REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = REPO_ROOT / "data" / "seed"
FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ingestion"


def test_seed_tiene_al_menos_cien_municipios() -> None:
    dataset = SeedLoader(SEED_DIR).load()
    assert len(dataset.municipalities) >= 100


def test_seed_observaciones_cuadran_con_cobertura_total() -> None:
    dataset = SeedLoader(SEED_DIR).load()
    expected = len(dataset.municipalities) * len(dataset.indicators)
    assert len(dataset.observations) == expected


def test_seed_incluye_indicadores_nuevos() -> None:
    dataset = SeedLoader(SEED_DIR).load()
    codes = {indicator.code for indicator in dataset.indicators}
    for required in (
        "population_total",
        "age_median",
        "household_size",
        "enterprise_density",
    ):
        assert required in codes


def test_seed_incluye_perfil_retire_con_pesos_normalizados() -> None:
    dataset = SeedLoader(SEED_DIR).load()
    retire = next(profile for profile in dataset.profiles if profile.id == "retire")
    assert abs(sum(retire.weights.values()) - 1.0) < 1e-9


def test_seed_sources_contienen_fuentes_oficiales_nuevas() -> None:
    dataset = SeedLoader(SEED_DIR).load()
    ids = {source.id for source in dataset.sources}
    for required in (
        "ine_datosabiertos",
        "ine_atlas_renta",
        "ine_dirce",
        "miteco_reto_demografico_demografia",
        "miteco_reto_demografico_servicios",
    ):
        assert required in ids


def test_dataset_builder_genera_csv_y_manifiesto(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "raw")
    builder = DatasetBuilder(
        downloader=downloader,
        processed_dir=tmp_path / "processed",
        reports_dir=tmp_path / "reports",
        fixture_dir=FIXTURE_DIR,
    )
    manifest = builder.build()
    assert manifest.manifest_path.exists()
    content = json.loads(manifest.manifest_path.read_text(encoding="utf-8"))
    assert content["sources"]
    source_ids = {entry["id"] for entry in content["sources"]}
    assert {
        "ine_datosabiertos",
        "ine_atlas_renta",
        "ine_dirce",
        "miteco_reto_demografico_demografia",
        "miteco_reto_demografico_servicios",
    } <= source_ids
    for entry in content["sources"]:
        assert entry["row_count"] > 0
        assert len(entry["checksum_sha256"]) == 64
        assert Path(entry["processed_path"]).exists()


def test_dataset_builder_es_idempotente(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "raw")
    builder = DatasetBuilder(
        downloader=downloader,
        processed_dir=tmp_path / "processed",
        reports_dir=tmp_path / "reports",
        fixture_dir=FIXTURE_DIR,
    )
    first = builder.build()
    second = builder.build()
    first_checksums = {entry.source_id: entry.checksum_sha256 for entry in first.artifacts}
    second_checksums = {entry.source_id: entry.checksum_sha256 for entry in second.artifacts}
    assert first_checksums == second_checksums
