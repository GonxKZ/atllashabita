"""Pruebas de emisión GeoSPARQL en el grafo construido desde el seed.

Verifica que cada municipio con centroide emite:

* ``geo:Feature`` como clase (en addition a ``ah:Municipality``).
* ``ah:hasGeometry`` / ``geo:hasGeometry`` hacia una geometría dedicada.
* ``geo:Point`` con ``geo:asWKT`` formato CRS84 bien formado.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from rdflib import Graph, URIRef
from rdflib.namespace import RDF

from atlashabita.domain.territories import TerritoryKind
from atlashabita.infrastructure.ingestion import SeedLoader
from atlashabita.infrastructure.rdf import AH, GraphBuilder, URIBuilder
from atlashabita.infrastructure.rdf.namespaces import GEO

ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = ROOT / "data" / "seed"
BASE = "https://data.atlashabita.example/"

_WKT_LITERAL_DATATYPE = URIRef("http://www.opengis.net/ont/geosparql#wktLiteral")
_WKT_PATTERN = re.compile(
    r"^<http://www\.opengis\.net/def/crs/OGC/1\.3/CRS84>\s+"
    r"POINT\((-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\)$"
)


@pytest.fixture(scope="module")
def graph() -> Graph:
    dataset = SeedLoader(SEED_DIR).load()
    return GraphBuilder(URIBuilder(BASE)).build_graph(dataset)


def test_cada_municipio_es_feature(graph: Graph) -> None:
    municipalities = set(graph.subjects(RDF.type, AH.Municipality))
    assert municipalities, "Se esperaba al menos un municipio"
    for municipality in municipalities:
        assert (municipality, RDF.type, GEO.Feature) in graph, (
            f"{municipality} no declara geo:Feature"
        )


def test_cada_municipio_tiene_geometry_enlazada(graph: Graph) -> None:
    municipalities = set(graph.subjects(RDF.type, AH.Municipality))
    for municipality in municipalities:
        geometries = list(graph.objects(municipality, AH.hasGeometry))
        assert len(geometries) == 1, f"{municipality} debería tener 1 geometría"
        # También el alias estándar GeoSPARQL.
        geo_geometries = list(graph.objects(municipality, GEO.hasGeometry))
        assert geo_geometries == geometries


def test_geometria_tiene_wkt_bien_formado(graph: Graph) -> None:
    geometries = set(graph.subjects(RDF.type, GEO.Point))
    assert geometries, "Se esperaban geometrías geo:Point"
    for geometry in geometries:
        wkt_values = list(graph.objects(geometry, GEO.asWKT))
        assert wkt_values, f"{geometry} no tiene geo:asWKT"
        literal = wkt_values[0]
        assert getattr(literal, "datatype", None) == _WKT_LITERAL_DATATYPE
        match = _WKT_PATTERN.match(str(literal))
        assert match is not None, f"WKT malformado: {literal}"
        lon, lat = float(match.group(1)), float(match.group(2))
        assert -180.0 <= lon <= 180.0
        assert -90.0 <= lat <= 90.0


def test_geometry_uri_coincide_con_uri_builder(graph: Graph) -> None:
    builder = URIBuilder(BASE)
    sevilla = URIRef(BASE + "resource/territory/municipality/41091")
    expected_geometry = builder.geometry("41091", TerritoryKind.MUNICIPALITY)
    assert (sevilla, AH.hasGeometry, expected_geometry) in graph


def test_provincias_y_ccaa_tambien_con_geometry(graph: Graph) -> None:
    """Además de municipios, las provincias y CCAA con centroide emiten geometry."""
    provinces = set(graph.subjects(RDF.type, AH.Province))
    for province in provinces:
        # Todas las provincias del seed tienen lat/lon.
        geometries = list(graph.objects(province, GEO.hasGeometry))
        assert len(geometries) == 1, f"{province} debería tener geometría"
