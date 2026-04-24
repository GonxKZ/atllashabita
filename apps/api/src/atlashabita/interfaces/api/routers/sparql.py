"""Router HTTP para el catálogo controlado de consultas SPARQL.

El endpoint ``POST /sparql`` acepta sólo consultas del catálogo (``query_id``)
para evitar que un cliente ejecute SPARQL arbitrario sobre el grafo. El
endpoint ``GET /sparql/catalog`` expone las firmas disponibles y sus
descripciones en español para facilitar el descubrimiento desde el cliente.

Las implementaciones concretas (validación de bindings, whitelist, límites)
viven en :mod:`atlashabita.application.use_cases.run_sparql_query`; este
módulo se limita a conectar FastAPI con el caso de uso.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from atlashabita.application.container import Container
from atlashabita.interfaces.api.deps import get_container
from atlashabita.interfaces.api.schemas import (
    SparqlCatalogEntry,
    SparqlCatalogResponse,
    SparqlQueryRequest,
    SparqlQueryResponse,
)

router = APIRouter(prefix="/sparql", tags=["sparql"])

ContainerDep = Annotated[Container, Depends(get_container)]


@router.get(
    "/catalog",
    response_model=SparqlCatalogResponse,
    summary="Catálogo de consultas SPARQL expuestas",
)
def get_catalog(container: ContainerDep) -> SparqlCatalogResponse:
    """Devuelve las firmas disponibles para ``POST /sparql``."""
    signatures = container.run_sparql_query.catalog()
    entries = tuple(
        SparqlCatalogEntry(
            query_id=sig.query_id,
            description=sig.description,
            required=sig.required,
            optional=sig.optional,
        )
        for sig in signatures
    )
    return SparqlCatalogResponse(queries=entries)


@router.post(
    "",
    response_model=SparqlQueryResponse,
    summary="Ejecutar una consulta SPARQL del catálogo",
)
def run_query(
    payload: SparqlQueryRequest,
    container: ContainerDep,
) -> SparqlQueryResponse:
    """Ejecuta ``payload.query_id`` con los bindings indicados."""
    result = container.run_sparql_query.execute(
        query_id=payload.query_id,
        bindings=payload.bindings,
    )
    return SparqlQueryResponse(
        query_id=result.query_id,
        rows=tuple(result.rows),
        elapsed_ms=result.elapsed_ms,
    )


__all__ = ["router"]
