"""Router de territorios: búsqueda, ficha e indicadores."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from atlashabita.application.container import Container
from atlashabita.config import Settings
from atlashabita.domain.territories import Territory
from atlashabita.interfaces.api.deps import get_container, get_settings

router = APIRouter(prefix="/territories", tags=["territorios"])

ContainerDep = Annotated[Container, Depends(get_container)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _territory_to_dict(territory: Territory) -> dict[str, Any]:
    """Serializa un ``Territory`` al contrato público de la API."""
    return {
        "id": territory.identifier,
        "code": territory.code,
        "name": territory.name,
        "kind": territory.kind.value,
        "parent_code": territory.parent_code,
        "province_code": territory.province_code,
        "autonomous_community_code": territory.autonomous_community_code,
        "population": territory.population,
        "area_km2": territory.area_km2,
        "lat": territory.centroid.lat if territory.centroid else None,
        "lon": territory.centroid.lon if territory.centroid else None,
    }


@router.get(
    "/search",
    summary="Buscar territorios por texto",
)
def search_territories(
    container: ContainerDep,
    settings: SettingsDep,
    q: Annotated[str, Query(min_length=1, max_length=120)],
    limit: Annotated[int, Query(ge=1)] = 20,
) -> list[dict[str, Any]]:
    """Devuelve territorios ordenados por relevancia (exacta → prefijo → contiene)."""
    effective_limit = min(limit, settings.request_max_limit)
    territories = container.search_territories.execute(query=q, limit=effective_limit)
    return [_territory_to_dict(t) for t in territories]


@router.get(
    "/{territory_id:path}/indicators",
    summary="Indicadores publicados para un territorio",
)
def list_indicators(
    territory_id: str,
    container: ContainerDep,
) -> list[dict[str, Any]]:
    """Indicadores observados del territorio, ordenados por código."""
    detail = container.get_territory_detail.execute(territory_id)
    return list(detail["indicators"])


@router.get(
    "/{territory_id:path}",
    summary="Ficha territorial con indicadores y scores por perfil",
)
def get_territory_detail(
    territory_id: str,
    container: ContainerDep,
) -> dict[str, Any]:
    """Detalle completo: jerarquía, centroide, indicadores y scores por perfil."""
    return container.get_territory_detail.execute(territory_id)


__all__ = ["router"]
