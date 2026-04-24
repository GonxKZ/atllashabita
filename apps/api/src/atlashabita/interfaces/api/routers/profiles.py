"""Router de perfiles de decisión."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from atlashabita.application.container import Container
from atlashabita.interfaces.api.deps import get_container
from atlashabita.interfaces.api.schemas import ProfileRead

router = APIRouter(prefix="/profiles", tags=["perfiles"])

ContainerDep = Annotated[Container, Depends(get_container)]


@router.get(
    "",
    response_model=list[ProfileRead],
    summary="Listar perfiles de decisión disponibles",
)
def list_profiles(container: ContainerDep) -> list[ProfileRead]:
    profiles = container.list_profiles().execute()
    return [
        ProfileRead(
            id=profile.id,
            label=profile.label,
            description=profile.description,
            weights=dict(profile.weights),
        )
        for profile in profiles
    ]


__all__ = ["router"]
