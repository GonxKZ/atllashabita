"""Router de fuentes de datos."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from atlashabita.application.container import Container
from atlashabita.domain.sources import DataSource
from atlashabita.interfaces.api.deps import get_container
from atlashabita.observability.errors import SourceUnavailableError

router = APIRouter(prefix="/sources", tags=["fuentes"])

ContainerDep = Annotated[Container, Depends(get_container)]


def _source_to_dict(source: DataSource) -> dict[str, Any]:
    return {
        "id": source.id,
        "title": source.title,
        "publisher": source.publisher,
        "url": source.url,
        "license": source.license,
        "periodicity": source.periodicity,
        "description": source.description,
        "coverage": source.coverage,
        "indicators": list(source.indicators),
        "quality": source.quality,
    }


@router.get(
    "",
    summary="Listar fuentes disponibles",
)
def list_sources(container: ContainerDep) -> list[dict[str, Any]]:
    """Devuelve todas las fuentes registradas ordenadas por título."""
    return [_source_to_dict(source) for source in container.list_sources.execute()]


@router.get(
    "/{source_id}",
    summary="Detalle de una fuente",
)
def get_source(
    source_id: str,
    container: ContainerDep,
) -> dict[str, Any]:
    """Detalle de la fuente identificada por ``source_id`` (503 si no existe)."""
    for source in container.list_sources.execute():
        if source.id == source_id:
            return _source_to_dict(source)
    raise SourceUnavailableError(source_id)


__all__ = ["router"]
