"""Errores de dominio normalizados que atraviesan capas y se serializan en la API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class DomainError(Exception):
    """Error esperado del dominio.

    A diferencia de ``Exception``, lleva un ``code`` estable (el que aparece en
    el contrato de la API) y un diccionario de detalles opcional que se expone
    al cliente sin filtrar trazas internas.
    """

    code: str
    message: str
    status_code: int = 400
    details: dict[str, Any] | None = None

    def __post_init__(self) -> None:
        Exception.__init__(self, self.message)


class InvalidProfileError(DomainError):
    def __init__(self, profile: str) -> None:
        super().__init__(
            code="INVALID_PROFILE",
            message=f"Perfil desconocido: {profile}",
            status_code=400,
            details={"profile": profile},
        )


class InvalidScopeError(DomainError):
    def __init__(self, scope: str) -> None:
        super().__init__(
            code="INVALID_SCOPE",
            message=f"Ámbito territorial inválido: {scope}",
            status_code=400,
            details={"scope": scope},
        )


class TerritoryNotFoundError(DomainError):
    def __init__(self, territory_id: str) -> None:
        super().__init__(
            code="TERRITORY_NOT_FOUND",
            message=f"Territorio inexistente: {territory_id}",
            status_code=404,
            details={"territory_id": territory_id},
        )


class InsufficientDataError(DomainError):
    def __init__(self, indicator: str) -> None:
        super().__init__(
            code="INSUFFICIENT_DATA",
            message=f"Datos insuficientes para el indicador {indicator}",
            status_code=422,
            details={"indicator": indicator},
        )


class SourceUnavailableError(DomainError):
    def __init__(self, source_id: str) -> None:
        super().__init__(
            code="SOURCE_UNAVAILABLE",
            message=f"Fuente no disponible: {source_id}",
            status_code=503,
            details={"source_id": source_id},
        )


class QualityBlockedError(DomainError):
    def __init__(self, reason: str) -> None:
        super().__init__(
            code="QUALITY_BLOCKED",
            message=f"Resultado bloqueado por validación de calidad: {reason}",
            status_code=409,
            details={"reason": reason},
        )
