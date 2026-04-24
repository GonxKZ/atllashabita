"""Namespaces RDF utilizados por AtlasHabita.

Este módulo centraliza los prefijos y namespaces empleados por toda la capa
RDF. Exponerlos como constantes tiene dos ventajas fundamentales:

* **Coherencia:** todo el proyecto usa la misma URI para la ontología y los
  recursos, evitando inconsistencias sutiles cuando distintas capas escriben
  tripletas.
* **Trazabilidad:** si en el futuro cambia el dominio canónico (por ejemplo,
  al mover ``data.atlashabita.example`` a un dominio real), basta con
  actualizar este fichero.

También se ofrece ``bind_all`` para inyectar los prefijos en un ``Graph`` o
``Dataset`` y producir serializaciones Turtle/JSON-LD legibles por humanos.

La Fase B del milestone M8 amplía el espacio semántico incorporando los
vocabularios necesarios para representar **geometrías GeoSPARQL** y
**procedencia PROV-O enriquecida** (actividades de ingesta, fuentes usadas,
observaciones generadas). La separación entre WGS84 (``GEO_WGS84``) y
GeoSPARQL (``GEO``) es intencional: mantenemos las propiedades ``geo:lat`` /
``geo:long`` históricas y añadimos ``geo:hasGeometry`` / ``geo:asWKT`` de
GeoSPARQL para que consultas espaciales (distancia, buffer, within) sean
posibles con herramientas compatibles con OGC.
"""

from __future__ import annotations

from rdflib import Dataset, Graph, Namespace
from rdflib.namespace import DCTERMS
from rdflib.namespace import PROV as RDFLIB_PROV
from rdflib.namespace import SKOS as RDFLIB_SKOS

#: Ontología propia de AtlasHabita (clases, propiedades).
AH = Namespace("https://data.atlashabita.example/ontology/")

#: Recursos (territorios, indicadores, fuentes, perfiles, scores, observaciones).
AHR = Namespace("https://data.atlashabita.example/resource/")

#: Dublin Core Terms para metadatos (título, identificador, licencia...).
DCT = DCTERMS

#: SKOS para taxonomías ligeras y etiquetas alternativas.
SKOS = RDFLIB_SKOS

#: GeoSPARQL (OGC). Provee clases ``geo:Feature``, ``geo:Geometry`` y
#: propiedades ``geo:hasGeometry`` / ``geo:asWKT``. Es el vocabulario
#: recomendado por la OGC para datos geográficos en RDF.
GEO = Namespace("http://www.opengis.net/ont/geosparql#")

#: Simple Features (SF) para tipos geométricos concretos (``sf:Point``,
#: ``sf:Polygon``...). Se alinea con GeoSPARQL a través de subclases.
SF = Namespace("http://www.opengis.net/ont/sf#")

#: Funciones GeoSPARQL (``geof:distance``, ``geof:within``...). Algunas
#: implementaciones de rdflib no las cargan por defecto; se conservan
#: como constante para ser usadas en consultas que se ejecuten en
#: backends compatibles (Jena/Fuseki/Virtuoso).
GEOF = Namespace("http://www.opengis.net/def/function/geosparql/")

#: Vocabulario de Simple Features del OGC (CRS 84, WKT serialization).
GEOSF = Namespace("http://www.opengis.net/ont/geosparql/simple_features#")

#: WGS84 geo positioning (``geo:lat``, ``geo:long``). Se mantiene bajo el
#: prefijo ``wgs84`` porque ``geo`` se reserva para GeoSPARQL. Preservar las
#: propiedades históricas evita romper consultas y shapes que las usan.
GEO_WGS84 = Namespace("http://www.w3.org/2003/01/geo/wgs84_pos#")

#: PROV-O para procedencia (fuente, ingesta, atribuciones).
PROV = RDFLIB_PROV

#: Data Cube Vocabulary (reservado por si se modelan observaciones multidim).
QB = Namespace("http://purl.org/linked-data/cube#")


def bind_all(graph: Graph | Dataset) -> None:
    """Registra los prefijos canónicos en el grafo o dataset indicado.

    Se utiliza antes de serializar para que los ficheros Turtle y JSON-LD
    muestren prefijos cortos (``ah:``, ``ahr:``...) en lugar de URIs
    completos, mejorando la legibilidad para humanos y para herramientas de
    revisión (pull requests, diffs de ontología, etc.).
    """
    graph.bind("ah", AH, override=True)
    graph.bind("ahr", AHR, override=True)
    graph.bind("dct", DCT, override=True)
    graph.bind("skos", SKOS, override=True)
    graph.bind("geo", GEO, override=True)
    graph.bind("sf", SF, override=True)
    graph.bind("geof", GEOF, override=True)
    graph.bind("geosf", GEOSF, override=True)
    graph.bind("wgs84", GEO_WGS84, override=True)
    graph.bind("prov", PROV, override=True)
    graph.bind("qb", QB, override=True)


__all__ = [
    "AH",
    "AHR",
    "DCT",
    "GEO",
    "GEOF",
    "GEOSF",
    "GEO_WGS84",
    "PROV",
    "QB",
    "SF",
    "SKOS",
    "bind_all",
]
