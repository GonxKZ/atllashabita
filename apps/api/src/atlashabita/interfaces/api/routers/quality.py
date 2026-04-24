"""Router de reportes de calidad agregados."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from atlashabita.application.container import Container
from atlashabita.interfaces.api.deps import get_container

router = APIRouter(prefix="/quality", tags=["calidad"])

ContainerDep = Annotated[Container, Depends(get_container)]


@router.get(
    "/reports",
    summary="Resumen de calidad por dataset",
)
def get_reports(container: ContainerDep) -> dict[str, Any]:
    """Informe con conteos por tabla, calidad de observaciones, cobertura y avisos."""
    return container.get_quality_report.execute()


__all__ = ["router"]
