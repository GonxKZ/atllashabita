"""Pruebas de la serialización de grafos y datasets."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import (
    GraphBuilder,
    URIBuilder,
    serialize,
    write,
)

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def builder() -> GraphBuilder:
    return GraphBuilder(URIBuilder(BASE))


@pytest.fixture(scope="module")
def dataset() -> object:
    return SeedLoader(SEED_DIR).load()


@pytest.mark.parametrize("fmt", ["turtle", "json-ld", "nt"])
def test_serialize_graph_genera_bytes(builder: GraphBuilder, dataset: object, fmt: str) -> None:
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    payload = serialize(graph, fmt)  # type: ignore[arg-type]
    assert isinstance(payload, bytes)
    assert len(payload) > 0


def test_serialize_turtle_incluye_prefijos(builder: GraphBuilder, dataset: object) -> None:
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    payload = serialize(graph, "turtle").decode("utf-8")
    assert "@prefix ah:" in payload
    assert "@prefix dct:" in payload


def test_serialize_trig_dataset(builder: GraphBuilder, dataset: object) -> None:
    ds = builder.build(dataset)  # type: ignore[arg-type]
    payload = serialize(ds, "trig").decode("utf-8")
    assert "graph/territories" in payload


def test_write_crea_directorio(tmp_path: Path, builder: GraphBuilder, dataset: object) -> None:
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    target = tmp_path / "nested" / "graph.ttl"
    result = write(graph, target, "turtle")
    assert result == target
    assert target.exists()
    contents = target.read_bytes()
    assert b"ah:" in contents


def test_serialize_es_consistente(builder: GraphBuilder, dataset: object) -> None:
    """Dos corridas idénticas deben producir bytes válidos del mismo tamaño."""
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    a = serialize(graph, "nt")
    b = serialize(graph, "nt")
    assert a == b
