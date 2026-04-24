"""Pruebas SHACL sobre las shapes extendidas de la Fase B (M8).

Se valida que, con el grafo enriquecido (geometrías GeoSPARQL + cadena
PROV-O), la validación SHACL sigue conformando y que las nuevas shapes
detectan violaciones cuando se rompen intencionalmente:

* ``ah:MunicipalityShape`` con ``sh:pattern`` sobre el identificador.
* ``ah:IngestionActivityShape`` con ``prov:used`` obligatorio.
* ``ah:GeometryShape`` con ``geo:asWKT`` obligatorio.
"""

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
from atlashabita.infrastructure.rdf.namespaces import GEO, PROV

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


def test_grafo_con_geometria_y_procedencia_conforma(
    validator: ShaclValidator, dataset: object
) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    report = validator.validate(graph)
    assert report.conforms, f"Violaciones: {[v.message for v in report.violations]}"


def test_dataset_con_ontologia_extendida_conforma(
    validator: ShaclValidator, dataset: object
) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    ds = builder.build(dataset, ontology_path=ONTOLOGY)  # type: ignore[arg-type]
    report = validator.validate(ds)
    assert report.conforms, f"Violaciones: {[v.message for v in report.violations]}"


def test_shape_municipio_rechaza_codigo_invalido(
    validator: ShaclValidator, dataset: object
) -> None:
    """Un código de municipio que no sea 5 dígitos debe fallar el sh:pattern."""
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    # Se añade un municipio con identificador inválido (solo 3 dígitos) y
    # geometría para que pase otras shapes.
    bad_municipality = URIRef(BASE + "resource/territory/municipality/XY9")
    bad_geometry = URIRef(BASE + "resource/geometry/municipality/XY9")
    graph.add((bad_municipality, RDF.type, AH.Municipality))
    graph.add((bad_municipality, RDF.type, AH.Territory))
    graph.add(
        (
            bad_municipality,
            URIRef("http://purl.org/dc/terms/identifier"),
            Literal("XY9", datatype=XSD.string),
        )
    )
    graph.add(
        (
            bad_municipality,
            URIRef("http://www.w3.org/2000/01/rdf-schema#label"),
            Literal("Municipio falso", lang="es"),
        )
    )
    # belongsTo (para no romper otra shape).
    graph.add((bad_municipality, AH.belongsTo, URIRef(BASE + "resource/territory/province/41")))
    # geometry para que no falle la shape de geometría.
    graph.add((bad_municipality, AH.hasGeometry, bad_geometry))
    graph.add((bad_geometry, RDF.type, GEO.Geometry))
    graph.add((bad_geometry, RDF.type, GEO.Point))
    graph.add(
        (
            bad_geometry,
            GEO.asWKT,
            Literal(
                "<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT(0 0)",
                datatype=URIRef("http://www.opengis.net/ont/geosparql#wktLiteral"),
            ),
        )
    )

    report = validator.validate(graph)
    assert not report.conforms
    messages = " ".join(v.message for v in report.violations)
    assert "5 dígitos" in messages or "pattern" in messages.lower()


def test_shape_actividad_requiere_prov_used(validator: ShaclValidator, dataset: object) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    # Se añade una actividad sin prov:used.
    bad_activity = URIRef(BASE + "resource/activity/__bad__/2025")
    graph.add((bad_activity, RDF.type, AH.IngestionActivity))
    graph.add((bad_activity, RDF.type, PROV.Activity))

    report = validator.validate(graph)
    assert not report.conforms
    messages = " ".join(v.message for v in report.violations)
    assert "prov:used" in messages or "fuente" in messages.lower()


def test_shape_geometry_requiere_wkt(validator: ShaclValidator, dataset: object) -> None:
    builder = GraphBuilder(URIBuilder(BASE))
    graph = builder.build_graph(dataset)  # type: ignore[arg-type]
    # Se añade una geometría sin geo:asWKT.
    bad_geometry = URIRef(BASE + "resource/geometry/municipality/__bad__")
    graph.add((bad_geometry, RDF.type, GEO.Geometry))
    graph.add((bad_geometry, RDF.type, GEO.Point))

    report = validator.validate(graph)
    assert not report.conforms
    messages = " ".join(v.message for v in report.violations)
    assert "WKT" in messages or "asWKT" in messages
