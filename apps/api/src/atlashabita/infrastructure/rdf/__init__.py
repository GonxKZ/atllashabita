"""Infraestructura RDF de AtlasHabita.

Este paquete expone los componentes necesarios para construir, validar,
consultar y serializar el grafo de conocimiento que sostiene el dominio:

* :class:`URIBuilder` concentra la política de URIs.
* :class:`GraphBuilder` traduce el dataset seed a RDF.
* :class:`ShaclValidator` aplica las shapes del repositorio al grafo.
* :class:`SparqlRunner` ejecuta consultas con salvaguardas.
* ``serialize`` / ``write`` estandarizan la exportación del grafo.
* ``build_manifest`` describe el grafo para diagnósticos y auditoría.

Importar desde este módulo en lugar de los submódulos reduce el acoplamiento
entre capas y permite evolucionar los ficheros internos sin afectar a los
consumidores.
"""

from atlashabita.infrastructure.rdf.graph_builder import GraphBuilder
from atlashabita.infrastructure.rdf.manifest import build_manifest
from atlashabita.infrastructure.rdf.namespaces import (
    AH,
    AHR,
    DCT,
    GEO,
    GEO_WGS84,
    GEOF,
    GEOSF,
    PROV,
    QB,
    SF,
    SKOS,
    SOSA,
    SSN,
    bind_all,
)
from atlashabita.infrastructure.rdf.serializer import SerializationFormat, serialize, write
from atlashabita.infrastructure.rdf.shacl_validator import (
    ShaclValidator,
    ShaclViolation,
    ValidationReport,
)
from atlashabita.infrastructure.rdf.sparql_queries import (
    SparqlRunner,
    SparqlTimeoutError,
    SparqlUpdateForbiddenError,
)
from atlashabita.infrastructure.rdf.uri_builder import URIBuilder

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
    "SOSA",
    "SSN",
    "GraphBuilder",
    "SerializationFormat",
    "ShaclValidator",
    "ShaclViolation",
    "SparqlRunner",
    "SparqlTimeoutError",
    "SparqlUpdateForbiddenError",
    "URIBuilder",
    "ValidationReport",
    "bind_all",
    "build_manifest",
    "serialize",
    "write",
]
