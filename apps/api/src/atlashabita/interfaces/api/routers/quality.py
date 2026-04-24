"""Router de reportes de calidad agregados."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from atlashabita.application.container import Container
from atlashabita.interfaces.api.deps import get_container
from atlashabita.interfaces.api.schemas import QualityReportResponse, QualityRowRead

router = APIRouter(prefix="/quality", tags=["calidad"])

ContainerDep = Annotated[Container, Depends(get_container)]


@router.get(
    "/reports",
    response_model=QualityReportResponse,
    summary="Resumen de calidad por dataset",
)
def get_reports(container: ContainerDep) -> QualityReportResponse:
    report = container.get_quality_report().execute()
    rows = tuple(
        QualityRowRead(
            dataset=row.dataset,
            total_rows=row.total_rows,
            quality_ok=row.quality_ok,
            quality_warn=row.quality_warn,
            quality_error=row.quality_error,
        )
        for row in report.rows
    )
    return QualityReportResponse(generated_at=report.generated_at, rows=rows)


__all__ = ["router"]
