"""Router HTTP para datos de accidentes (DGT y derivados).

Expone:

- ``GET /accidents``: lista paginada filtrable por territorio y periodo.
- ``GET /accidents/risk``: indicador de riesgo por territorio (accidentes
  por 1.000 habitantes y agregados de víctimas).

El router delega en :class:`ListAccidentsUseCase` y mantiene el sobre de
respuesta consistente con el resto de la API (``items`` + ``pagination``).
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from atlashabita.application.container import Container
from atlashabita.config import Settings
from atlashabita.interfaces.api.deps import get_container, get_settings

router = APIRouter(prefix="/accidents", tags=["accidentes"])

ContainerDep = Annotated[Container, Depends(get_container)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get(
    "",
    summary="Listar accidentes por territorio",
)
def list_accidents(
    container: ContainerDep,
    settings: SettingsDep,
    territory_id: Annotated[str | None, Query(max_length=120)] = None,
    period: Annotated[str | None, Query(max_length=40)] = None,
    limit: Annotated[int, Query(ge=1)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    """Lista de accidentes filtrable por territorio y periodo, con paginación."""
    effective_limit = min(limit, settings.request_max_limit)
    items = container.list_accidents.list_records(
        territory_id=territory_id,
        period=period,
        limit=effective_limit,
        offset=offset,
    )
    total = container.list_accidents.count_records(
        territory_id=territory_id,
        period=period,
    )
    return {
        "items": items,
        "pagination": {
            "limit": effective_limit,
            "offset": offset,
            "total": total,
        },
        "filters": {
            "territory_id": territory_id,
            "period": period,
        },
    }


@router.get(
    "/risk",
    summary="Indicador de riesgo de accidentes por territorio",
)
def get_risk(
    container: ContainerDep,
    territory_id: Annotated[str, Query(min_length=1, max_length=120)],
) -> dict[str, Any]:
    """Calcula accidentes por 1.000 habitantes y víctimas agregadas."""
    return container.list_accidents.risk(territory_id)


__all__ = ["router"]
