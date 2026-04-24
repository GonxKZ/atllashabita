"""Router de fuentes de datos."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from atlashabita.application.container import Container
from atlashabita.domain.sources import DataSource
from atlashabita.interfaces.api.deps import get_container
from atlashabita.interfaces.api.schemas import SourceRead
from atlashabita.observability.errors import SourceUnavailableError

router = APIRouter(prefix="/sources", tags=["fuentes"])

ContainerDep = Annotated[Container, Depends(get_container)]


def _source_read(source: DataSource) -> SourceRead:
    return SourceRead(
        id=source.id,
        title=source.title,
        publisher=source.publisher,
        url=source.url,
        license=source.license,
        periodicity=source.periodicity,
        description=source.description,
        coverage=source.coverage,
        indicators=source.indicators,
        quality=source.quality,
    )


@router.get(
    "",
    response_model=list[SourceRead],
    summary="Listar fuentes disponibles",
)
def list_sources(container: ContainerDep) -> list[SourceRead]:
    sources = container.list_sources().execute()
    return [_source_read(source) for source in sources]


@router.get(
    "/{source_id}",
    response_model=SourceRead,
    summary="Detalle de una fuente",
)
def get_source(
    source_id: str,
    container: ContainerDep,
) -> SourceRead:
    source = container.list_sources().get(source_id)
    if source is None:
        raise SourceUnavailableError(source_id)
    return _source_read(source)


__all__ = ["router"]
