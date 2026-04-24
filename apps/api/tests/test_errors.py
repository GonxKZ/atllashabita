"""Pruebas de los errores de dominio normalizados."""

from __future__ import annotations

import pytest

from atlashabita.observability.errors import (
    DomainError,
    InsufficientDataError,
    InvalidProfileError,
    InvalidScopeError,
    QualityBlockedError,
    SourceUnavailableError,
    TerritoryNotFoundError,
)


@pytest.mark.parametrize(
    ("error", "expected_code", "expected_status"),
    [
        (InvalidProfileError("foo"), "INVALID_PROFILE", 400),
        (InvalidScopeError("bar"), "INVALID_SCOPE", 400),
        (TerritoryNotFoundError("municipality:99999"), "TERRITORY_NOT_FOUND", 404),
        (InsufficientDataError("rent_median"), "INSUFFICIENT_DATA", 422),
        (SourceUnavailableError("ine_atlas_renta"), "SOURCE_UNAVAILABLE", 503),
        (QualityBlockedError("SHACL"), "QUALITY_BLOCKED", 409),
    ],
)
def test_errores_normalizados_exponen_codigo_y_estado(
    error: DomainError, expected_code: str, expected_status: int
) -> None:
    assert error.code == expected_code
    assert error.status_code == expected_status
    assert isinstance(error.details, dict)
    assert error.message
