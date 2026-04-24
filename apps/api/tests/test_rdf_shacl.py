"""Pruebas de validación SHACL contra el grafo construido desde el seed."""

from __future__ import annotations

from pathlib import Path

import pytest
from rdflib import Literal, URIRef
from rdflib.namespace import RDF, XSD

from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import (
    AH,
    GraphBuilder,
    ShaclValidator,
    URIBuilder,
)
from atlashabita.infrastructure.rdf.graph_builder import _decimal_literal

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
ONTOLOGY = ROOT / "ontology" / "atlashabita.ttl"
SHAPES = ROOT / "ontology" / "shapes.ttl"
BASE = "https://data.atlashabita.example/"


@pytest.fixture(scope="module")
def validator() -> ShaclValidator:
    return ShaclValidator(SHAPES)


@pytest.fixture(scope="module")
def dataset() -> object:
    return SeedLoader(SEED_DIR).load()


def test_validator_carga_shapes(validator: ShaclValidator) -> None:
    assert len(validator.shapes_graph) > 0


def test_shapes_path_inexistente_lanza_error(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        ShaclValidator(tmp_path / "no-existe.ttl")


def test_graph_seed_conforma(validator: ShaclValidator, dataset: object) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    report = validator.validate(graph)
    assert report.conforms, f"Violaciones: {[v.message for v in report.violations]}"
    assert not report.violations


def test_shacl_detecta_violacion_intencional(validator: ShaclValidator, dataset: object) -> None:
    """Si se rompe una restricción (ej. dirección inválida), debe reportarse."""
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    # Se añade un indicador con dirección fuera del enum permitido.
    bad_uri = URIRef(BASE + "resource/indicator/__bad__")
    graph.add((bad_uri, RDF.type, AH.Indicator))
    graph.add((bad_uri, AH.direction, Literal("neutral")))
    graph.add(
        (
            bad_uri,
            URIRef("http://www.w3.org/2000/01/rdf-schema#label"),
            Literal("Indicador inválido", lang="es"),
        )
    )
    report = validator.validate(graph)
    assert not report.conforms
    messages = " ".join(v.message for v in report.violations)
    assert "direction" in messages or "lower_is_better" in messages


def test_shacl_valida_dataset_completo(validator: ShaclValidator, dataset: object) -> None:
    """La validación debe funcionar también sobre Datasets con named graphs."""
    builder = GraphBuilder(URIBuilder(BASE))
    ds = builder.build(dataset, ontology_path=ONTOLOGY)  # type: ignore[arg-type]
    report = validator.validate(ds)
    assert report.conforms, f"Violaciones: {[v.message for v in report.violations]}"


def test_xsd_decimal_literal_formatea_sin_ruido() -> None:
    """Verifica que los flotantes se convierten a decimal sin artefactos."""
    literal = _decimal_literal(13.6)
    assert literal.datatype == XSD.decimal
    assert str(literal) == "13.6"
