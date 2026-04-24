"""Router HTTP para datos de movilidad (MITMA y derivados).

Expone dos endpoints de lectura:

- ``GET /mobility/flows``: lista filtrable y paginada de pares O/D.
- ``GET /mobility/summary``: resumen agregado por territorio.

La salida se construye a partir de :class:`ListMobilityUseCase`. El router
se mantiene fino: valida la entrada con FastAPI, delega en el caso de uso
y serializa el resultado con un sobre estable que incluye paginación y
``total`` para que el panel técnico pueda iterar sin sorpresas.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from atlashabita.application.container import Container
from atlashabita.config import Settings
from atlashabita.interfaces.api.deps import get_container, get_settings

router = APIRouter(prefix="/mobility", tags=["movilidad"])

ContainerDep = Annotated[Container, Depends(get_container)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get(
    "/flows",
    summary="Listar flujos de movilidad O/D",
)
def list_flows(
    container: ContainerDep,
    settings: SettingsDep,
    origin: Annotated[str | None, Query(max_length=120)] = None,
    destination: Annotated[str | None, Query(max_length=120)] = None,
    period: Annotated[str | None, Query(max_length=40)] = None,
    limit: Annotated[int, Query(ge=1)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    """Lista pares origen-destino con filtros opcionales y paginación.

    Si el CSV todavía no se ha publicado el caso de uso degrada a una
    lista vacía (``total = 0``) sin reventar la API.
    """
    effective_limit = min(limit, settings.request_max_limit)
    items = container.list_mobility.list_flows(
        origin=origin,
        destination=destination,
        period=period,
        limit=effective_limit,
        offset=offset,
    )
    total = container.list_mobility.count_flows(
        origin=origin,
        destination=destination,
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
            "origin": origin,
            "destination": destination,
            "period": period,
        },
    }


@router.get(
    "/summary",
    summary="Resumen de movilidad por territorio",
)
def get_summary(
    container: ContainerDep,
    territory_id: Annotated[str, Query(min_length=1, max_length=120)],
) -> dict[str, Any]:
    """Resumen agregado: viajes entrantes/salientes y top O/D del territorio."""
    return container.list_mobility.summary(territory_id)


__all__ = ["router"]
