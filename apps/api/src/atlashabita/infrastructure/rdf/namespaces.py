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

#: WGS84 geo positioning (``geo:lat``, ``geo:long``). No se usa el ``GEO`` de
#: rdflib porque apunta a GeoSPARQL (http://www.opengis.net/ont/geosparql#);
#: nuestra ontología y shapes usan el vocabulario histórico WGS84.
GEO = Namespace("http://www.w3.org/2003/01/geo/wgs84_pos#")

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
    graph.bind("prov", PROV, override=True)
    graph.bind("qb", QB, override=True)


__all__ = ["AH", "AHR", "DCT", "GEO", "PROV", "QB", "SKOS", "bind_all"]
