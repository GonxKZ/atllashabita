"""Router de rankings territoriales (GET y POST personalizado)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from atlashabita.application._stub import RankingResult
from atlashabita.application.container import Container
from atlashabita.config import Settings
from atlashabita.interfaces.api.deps import get_container, get_settings
from atlashabita.interfaces.api.schemas import (
    RankingEntryRead,
    RankingRequest,
    RankingResponse,
    ScoreContributionRead,
)

router = APIRouter(prefix="/rankings", tags=["rankings"])

ContainerDep = Annotated[Container, Depends(get_container)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _to_response(result: RankingResult) -> RankingResponse:
    entries = tuple(
        RankingEntryRead(
            rank=entry.rank,
            territory_id=entry.score.territory_id,
            name=entry.score.territory_name,
            province=entry.province.name if entry.province else None,
            autonomous_community=None,
            score=entry.score.score,
            confidence=entry.score.confidence,
            highlights=entry.score.highlights,
            warnings=entry.score.warnings,
            top_contributions=tuple(
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
                for c in sorted(entry.score.contributions, key=lambda x: x.impact, reverse=True)[:3]
            ),
        )
        for entry in result.entries
    )
    return RankingResponse(
        profile=result.profile_id,
        scope=result.scope,
        scoring_version=result.scoring_version,
        data_version=result.data_version,
        results=entries,
    )


@router.get(
    "",
    response_model=RankingResponse,
    summary="Ranking parametrizado por perfil y ámbito",
)
def get_rankings(
    container: ContainerDep,
    settings: SettingsDep,
    profile: Annotated[str, Query(min_length=1, max_length=80)],
    scope: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1)] = 20,
) -> RankingResponse:
    effective_limit = min(limit, settings.request_max_limit)
    result = container.compute_rankings().execute(
        profile_id=profile, scope=scope, limit=effective_limit
    )
    return _to_response(result)


@router.post(
    "/custom",
    response_model=RankingResponse,
    summary="Ranking con pesos personalizados",
)
def post_custom_ranking(
    payload: RankingRequest,
    container: ContainerDep,
    settings: SettingsDep,
) -> RankingResponse:
    effective_limit = min(payload.limit, settings.request_max_limit)
    result = container.compute_rankings().execute(
        profile_id=payload.profile,
        scope=payload.scope,
        limit=effective_limit,
        weight_overrides=payload.weights or None,
    )
    return _to_response(result)


__all__ = ["router"]
