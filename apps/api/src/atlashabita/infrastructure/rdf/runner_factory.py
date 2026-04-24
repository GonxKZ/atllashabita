"""Fábrica del runner SPARQL según la configuración activa.

La elección del backend está centralizada aquí para que ninguna otra capa
dependa de la variable ``ATLASHABITA_SPARQL_BACKEND``. El caso de uso
``RunSparqlQueryUseCase`` se instancia con el ``SparqlRunnerProtocol`` que
devuelve esta función, de modo que cambiar entre memoria y Fuseki no requiere
modificar la API pública.
"""

from __future__ import annotations

from typing import cast

import httpx
from rdflib import Dataset, Graph

from atlashabita.application.use_cases.run_sparql_query import SparqlRunnerProtocol
from atlashabita.config import Settings
from atlashabita.infrastructure.rdf.fuseki import FusekiSparqlRunner
from atlashabita.infrastructure.rdf.sparql_queries import SparqlRunner


def get_sparql_runner(graph: Graph | Dataset, settings: Settings) -> SparqlRunnerProtocol:
    """Devuelve el runner SPARQL apropiado para el backend configurado.

    * ``memory`` (por defecto): utiliza el grafo inyectado y :class:`SparqlRunner`.
    * ``fuseki``: crea un :class:`FusekiSparqlRunner` con un ``httpx.Client``
      efímero. El cliente se abre al construir el runner y debe cerrarse al
      descartar la instancia; se deja al caller elegir la estrategia (se
      aprovecha el lifespan de FastAPI para cerrarlo al apagar la app).
    """
    if settings.sparql_backend == "fuseki":
        client = httpx.Client(timeout=settings.sparql_timeout_seconds)
        return cast(SparqlRunnerProtocol, FusekiSparqlRunner(settings=settings, client=client))
    return cast(SparqlRunnerProtocol, SparqlRunner(graph=graph, settings=settings))


__all__ = ["get_sparql_runner"]
