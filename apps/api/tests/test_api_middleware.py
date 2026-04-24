"""Tests de middleware de seguridad y rate limiting."""

from __future__ import annotations

import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from atlashabita.config import Settings
from atlashabita.interfaces.api import create_app


def test_security_headers_se_envian_en_cada_respuesta(api_client: TestClient) -> None:
    response = api_client.get("/health")
    headers = response.headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "permissions-policy" in headers
    assert headers["strict-transport-security"].startswith("max-age=")
    assert headers["x-frame-options"] == "DENY"


@pytest.fixture()
def rate_limited_app() -> Iterator[FastAPI]:
    """Aplicación con un rate limit extremadamente bajo para forzar 429."""
    # Usamos un dataroot temporal; el test sólo toca /health, que no requiere seed.
    with tempfile.TemporaryDirectory() as tmp:
        settings = Settings(
            env="test",
            data_root=Path(tmp) / "data",
            ontology_root=Path(tmp) / "ontology",
            rate_limit_rpm=2,
        )
        yield create_app(settings)


def test_rate_limit_rechaza_cuando_se_supera_el_umbral(
    rate_limited_app: FastAPI,
) -> None:
    with TestClient(rate_limited_app) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/health").status_code == 200
        blocked = client.get("/health")

    assert blocked.status_code == 429
    body = blocked.json()
    assert body["error"] == "RATE_LIMITED"
    assert "retry_after_seconds" in body["details"]
    assert blocked.headers["retry-after"]


def test_rate_limit_expone_cabeceras_de_estado(rate_limited_app: FastAPI) -> None:
    with TestClient(rate_limited_app) as client:
        response = client.get("/health")

    assert response.headers["x-ratelimit-limit"] == "2"
    assert int(response.headers["x-ratelimit-remaining"]) >= 0


def test_rate_limit_usa_xforwardedfor_para_distinguir_clientes(
    rate_limited_app: FastAPI,
) -> None:
    with TestClient(rate_limited_app) as client:
        for ip in ("10.0.0.1", "10.0.0.2", "10.0.0.3"):
            response = client.get("/health", headers={"x-forwarded-for": ip})
            assert response.status_code == 200
