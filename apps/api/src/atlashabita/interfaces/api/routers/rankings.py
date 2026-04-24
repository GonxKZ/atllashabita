"""Router de rankings territoriales (GET y POST personalizado)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from atlashabita.application.container import Container
from atlashabita.config import Settings
from atlashabita.interfaces.api.deps import get_container, get_settings
from atlashabita.interfaces.api.schemas import RankingRequest

router = APIRouter(prefix="/rankings", tags=["rankings"])

ContainerDep = Annotated[Container, Depends(get_container)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get(
    "",
    summary="Ranking parametrizado por perfil y ámbito",
)
def get_rankings(
    container: ContainerDep,
    settings: SettingsDep,
    profile: Annotated[str, Query(min_length=1, max_length=80)],
    scope: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1)] = 20,
) -> dict[str, Any]:
    """Devuelve un ranking ordenado con ``profile``, ``scope``, versión de scoring y resultados."""
    effective_limit = min(limit, settings.request_max_limit)
    return container.compute_rankings.execute(
        profile_id=profile,
        scope=scope,
        limit=effective_limit,
    )


@router.post(
    "/custom",
    summary="Ranking con pesos personalizados",
)
def post_custom_ranking(
    payload: RankingRequest,
    container: ContainerDep,
    settings: SettingsDep,
) -> dict[str, Any]:
    """Permite recalcular el ranking con pesos explícitos del cliente."""
    effective_limit = min(payload.limit, settings.request_max_limit)
    return container.compute_rankings.execute(
        profile_id=payload.profile,
        scope=payload.scope,
        limit=effective_limit,
        weights=payload.weights or None,
    )


__all__ = ["router"]
