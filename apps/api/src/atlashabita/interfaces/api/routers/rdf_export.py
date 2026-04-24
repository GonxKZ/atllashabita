"""Router de exportación del grafo RDF en los formatos estándar.

Se expone ``GET /rdf/export?format=...`` que delega en
:class:`ExportRdfUseCase`. La respuesta se emite como ``StreamingResponse``
dividiendo los bytes en chunks para no mantener una única copia enorme en el
buffer de respuesta. rdflib no ofrece serialización incremental real: el
payload se materializa una sola vez en el caso de uso y luego se itera.

Se llamó al fichero ``rdf_export.py`` y no ``rdf.py`` para evitar colisionar
con el import ``atlashabita.infrastructure.rdf`` dentro del mismo package
tree (Python resolvería el primero antes que el submódulo, generando
errores de importación difíciles de detectar).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from atlashabita.application.container import Container
from atlashabita.interfaces.api.deps import get_container
from atlashabita.interfaces.api.schemas import RdfExportFormat

router = APIRouter(prefix="/rdf", tags=["rdf"])

ContainerDep = Annotated[Container, Depends(get_container)]


@router.get(
    "/export",
    summary="Exporta el grafo RDF en el formato indicado",
    responses={
        200: {
            "description": "Grafo serializado. El Content-Type depende del formato.",
            "content": {
                "text/turtle": {},
                "application/ld+json": {},
                "application/n-triples": {},
                "application/trig": {},
            },
        }
    },
)
def export_rdf(
    container: ContainerDep,
    export_format: Annotated[
        RdfExportFormat,
        Query(alias="format", description="Formato de serialización"),
    ] = "turtle",
) -> StreamingResponse:
    """Serializa el grafo y lo devuelve en streaming con el Content-Type correcto."""
    result = container.export_rdf.execute(export_format)
    headers = {
        "Content-Length": str(result.total_bytes),
        "Cache-Control": "public, max-age=60",
        "X-Atlashabita-Format": result.format,
    }
    return StreamingResponse(
        result.iter_chunks(),
        media_type=result.media_type,
        headers=headers,
    )


__all__ = ["router"]
