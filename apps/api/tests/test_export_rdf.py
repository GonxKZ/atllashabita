"""Pruebas puras del caso de uso :class:`ExportRdfUseCase`."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from rdflib import Graph, Literal, URIRef
from rdflib.namespace import RDF, RDFS

from atlashabita.application.use_cases.export_rdf import (
    CONTENT_TYPES,
    ExportRdfUseCase,
)
from atlashabita.config import Settings
from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import GraphBuilder, URIBuilder
from atlashabita.observability.errors import DomainError

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def seed_graph() -> Graph:
    dataset = SeedLoader(SEED_DIR).load()
    return GraphBuilder(URIBuilder(BASE)).build_graph(dataset)


@pytest.fixture()
def settings() -> Settings:
    return Settings()


@pytest.mark.parametrize("export_format", list(CONTENT_TYPES))
def test_exporta_en_todos_los_formatos(
    seed_graph: Graph, settings: Settings, export_format: str
) -> None:
    use_case = ExportRdfUseCase(seed_graph, settings)
    result = use_case.execute(export_format)
    assert result.format == export_format
    assert result.media_type == CONTENT_TYPES[export_format]
    assert result.total_bytes > 0
    assert len(result.payload) == result.total_bytes


def test_iter_chunks_recorre_todo_el_payload(seed_graph: Graph, settings: Settings) -> None:
    use_case = ExportRdfUseCase(seed_graph, settings)
    result = use_case.execute("turtle")
    reconstructed = b"".join(result.iter_chunks(chunk_size=128))
    assert reconstructed == result.payload


def test_iter_chunks_valida_chunk_size(seed_graph: Graph, settings: Settings) -> None:
    use_case = ExportRdfUseCase(seed_graph, settings)
    result = use_case.execute("turtle")
    with pytest.raises(ValueError, match="chunk_size"):
        list(result.iter_chunks(chunk_size=0))


def test_formato_invalido_lanza_domain_error(seed_graph: Graph, settings: Settings) -> None:
    use_case = ExportRdfUseCase(seed_graph, settings)
    with pytest.raises(DomainError) as excinfo:
        use_case.execute("rdfxml")  # type: ignore[arg-type]
    assert excinfo.value.code == "INVALID_FORMAT"


def test_jsonld_es_json_parseable(seed_graph: Graph, settings: Settings) -> None:
    use_case = ExportRdfUseCase(seed_graph, settings)
    result = use_case.execute("json-ld")
    parsed = json.loads(result.payload.decode("utf-8"))
    assert isinstance(parsed, list | dict)


def test_payload_grande_dispara_error_413(settings: Settings) -> None:
    graph = Graph()
    subject = URIRef("urn:ah:test/subject")
    graph.add((subject, RDF.type, URIRef("urn:ah:Thing")))
    # Insertamos un literal gigantesco para superar el tope de 16 MB.
    graph.add((subject, RDFS.label, Literal("x" * (17 * 1024 * 1024))))
    with pytest.raises(DomainError) as excinfo:
        ExportRdfUseCase(graph, settings).execute("nt")
    assert excinfo.value.code == "PAYLOAD_TOO_LARGE"
    assert excinfo.value.status_code == 413
