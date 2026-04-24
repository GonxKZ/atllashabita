"""Router HTTP para datos de transporte público (CRTM y derivados).

Expone ``GET /transit/stops``: lista paginable de paradas filtrable por
territorio. Delega en :class:`ListTransitUseCase`.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from atlashabita.application.container import Container
from atlashabita.config import Settings
from atlashabita.interfaces.api.deps import get_container, get_settings

router = APIRouter(prefix="/transit", tags=["transporte"])

ContainerDep = Annotated[Container, Depends(get_container)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get(
    "/stops",
    summary="Listar paradas de transporte público",
)
def list_stops(
    container: ContainerDep,
    settings: SettingsDep,
    territory_id: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    """Listado paginado de paradas filtrable por territorio."""
    effective_limit = min(limit, settings.request_max_limit)
    items = container.list_transit.list_stops(
        territory_id=territory_id,
        limit=effective_limit,
        offset=offset,
    )
    total = container.list_transit.count_stops(territory_id=territory_id)
    return {
        "items": items,
        "pagination": {
            "limit": effective_limit,
            "offset": offset,
            "total": total,
        },
        "filters": {
            "territory_id": territory_id,
        },
    }


__all__ = ["router"]
