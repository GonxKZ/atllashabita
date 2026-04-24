"""Router de territorios: búsqueda, ficha e indicadores."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from atlashabita.application.container import Container
from atlashabita.config import Settings
from atlashabita.domain.territories import Territory
from atlashabita.interfaces.api.deps import get_container, get_settings
from atlashabita.interfaces.api.schemas import (
    IndicatorObservationRead,
    ScoreContributionRead,
    TerritoryDetailResponse,
    TerritoryHierarchyRead,
    TerritoryRead,
    TerritoryScoreRead,
)

router = APIRouter(prefix="/territories", tags=["territorios"])

ContainerDep = Annotated[Container, Depends(get_container)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _territory_read(territory: Territory) -> TerritoryRead:
    return TerritoryRead(
        id=territory.identifier,
        code=territory.code,
        name=territory.name,
        kind=territory.kind.value,
        parent_code=territory.parent_code,
        province_code=territory.province_code,
        autonomous_community_code=territory.autonomous_community_code,
        population=territory.population,
        area_km2=territory.area_km2,
        lat=territory.centroid.lat if territory.centroid else None,
        lon=territory.centroid.lon if territory.centroid else None,
    )


@router.get(
    "/search",
    response_model=list[TerritoryRead],
    summary="Buscar territorios por texto",
)
def search_territories(
    container: ContainerDep,
    settings: SettingsDep,
    q: Annotated[str | None, Query(max_length=120)] = None,
    kind: Annotated[
        str | None,
        Query(pattern=r"^(autonomous_community|province|municipality)$"),
    ] = None,
    limit: Annotated[int, Query(ge=1)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[TerritoryRead]:
    effective_limit = min(limit, settings.request_max_limit)
    territories = container.search_territories().execute(
        query=q, kind=kind, limit=effective_limit, offset=offset
    )
    return [_territory_read(t) for t in territories]


@router.get(
    "/{territory_id:path}/indicators",
    response_model=list[IndicatorObservationRead],
    summary="Indicadores publicados para un territorio",
)
def list_indicators(
    territory_id: str,
    container: ContainerDep,
) -> list[IndicatorObservationRead]:
    detail = container.get_territory_detail().execute(territory_id)
    return [
        IndicatorObservationRead(
            indicator_code=indicator.code,
            label=indicator.label,
            unit=indicator.unit,
            value=observation.value,
            period=observation.period,
            source_id=observation.source_id,
            quality=observation.quality,
        )
        for indicator, observation in detail.indicators
    ]


@router.get(
    "/{territory_id:path}",
    response_model=TerritoryDetailResponse,
    summary="Ficha territorial con indicadores y scores",
)
def get_territory_detail(
    territory_id: str,
    container: ContainerDep,
) -> TerritoryDetailResponse:
    detail = container.get_territory_detail().execute(territory_id)
    territory = detail.territory
    indicators = tuple(
        IndicatorObservationRead(
            indicator_code=indicator.code,
            label=indicator.label,
            unit=indicator.unit,
            value=observation.value,
            period=observation.period,
            source_id=observation.source_id,
            quality=observation.quality,
        )
        for indicator, observation in detail.indicators
    )
    scores = tuple(
        TerritoryScoreRead(
            territory_id=score.territory_id,
            territory_name=score.territory_name,
            profile_id=score.profile_id,
            score=score.score,
            confidence=score.confidence,
            version=score.version,
            highlights=score.highlights,
            warnings=score.warnings,
            contributions=tuple(
                ScoreContributionRead(
                    indicator_code=c.indicator_code,
                    label=c.label,
                    weight=c.weight,
                    normalized_value=c.normalized_value,
                    raw_value=c.raw_value,
                    unit=c.unit,
                    impact=c.impact,
                    direction=c.direction,
                )
                for c in score.contributions
            ),
        )
        for score in detail.scores
    )
    return TerritoryDetailResponse(
        id=territory.identifier,
        name=territory.name,
        type=territory.kind.value,
        hierarchy=TerritoryHierarchyRead(
            province=detail.province.name if detail.province else None,
            autonomous_community=(
                detail.autonomous_community.name if detail.autonomous_community else None
            ),
        ),
        population=territory.population,
        area_km2=territory.area_km2,
        lat=territory.centroid.lat if territory.centroid else None,
        lon=territory.centroid.lon if territory.centroid else None,
        indicators=indicators,
        scores=scores,
    )


__all__ = ["router"]
