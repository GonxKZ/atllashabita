"""Endpoint de salud básico.

El endpoint ``/health`` sirve como sonda para orquestadores, pruebas E2E y
como primer contrato estable del backend. Devuelve metadatos útiles para
depurar el entorno sin exponer información sensible.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(tags=["salud"])


class HealthResponse(BaseModel):
    """Respuesta del endpoint de salud."""

    status: str
    name: str
    version: str
    environment: str
    timestamp: str


@router.get("/health", response_model=HealthResponse, summary="Estado del backend")
def health(request: Request) -> HealthResponse:
    """Devuelve el estado básico del backend."""
    settings = request.app.state.settings
    return HealthResponse(
        status="ok",
        name=settings.app_name,
        version=settings.app_version,
        environment=settings.env,
        timestamp=datetime.now(tz=UTC).isoformat(),
    )
