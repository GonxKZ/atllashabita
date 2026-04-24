"""Pruebas del manifiesto del grafo."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import (
    GraphBuilder,
    URIBuilder,
    build_manifest,
)

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
ONTOLOGY = ROOT / "ontology" / "atlashabita.ttl"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def manifest() -> dict[str, object]:
    dataset = SeedLoader(SEED_DIR).load()
    ds = GraphBuilder(URIBuilder(BASE)).build(dataset, ontology_path=ONTOLOGY)
    return build_manifest(ds)


def test_manifest_tiene_campos_basicos(manifest: dict[str, object]) -> None:
    assert "total_triples" in manifest
    assert "named_graphs" in manifest
    assert "classes_count" in manifest
    assert "territories_count" in manifest
    assert "observations_count" in manifest
    assert "generated_at_iso" in manifest


def test_manifest_cuenta_observaciones(manifest: dict[str, object]) -> None:
    # El dataset nacional cubre todas las combinaciones municipio-indicador.
    assert isinstance(manifest["observations_count"], int)
    assert manifest["observations_count"] >= 100 * 9


def test_manifest_cuenta_territorios(manifest: dict[str, object]) -> None:
    # 101 municipios + 52 provincias + 19 CCAA = 172 territorios.
    assert manifest["territories_count"] == 172


def test_manifest_lista_named_graphs(manifest: dict[str, object]) -> None:
    named_graphs = manifest["named_graphs"]
    assert isinstance(named_graphs, dict)
    assert any("graph/territories" in key for key in named_graphs)
    assert any("graph/observations" in key for key in named_graphs)


def test_manifest_incluye_timestamp_iso8601(manifest: dict[str, object]) -> None:
    timestamp = manifest["generated_at_iso"]
    assert isinstance(timestamp, str)
    assert "T" in timestamp  # formato ISO-8601.


def test_manifest_total_triples_positivo(manifest: dict[str, object]) -> None:
    total = manifest["total_triples"]
    assert isinstance(total, int)
    assert total > 0
