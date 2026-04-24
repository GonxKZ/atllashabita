"""Fixtures compartidas de los tests del backend."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from atlashabita.config import Settings
from atlashabita.interfaces.api import create_app

# apps/api/tests/conftest.py -> parents[3] = raíz del worktree (donde vive data/).
REPO_SEED_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture()
def tmp_settings(tmp_path: Path) -> Settings:
    """Configuración aislada por test.

    Se fija un directorio de datos temporal para que los tests no toquen el
    directorio ``data/`` real del repositorio.
    """
    return Settings(
        env="test",
        data_root=tmp_path / "data",
        ontology_root=tmp_path / "ontology",
    )


@pytest.fixture()
def client(tmp_settings: Settings) -> Iterator[TestClient]:
    """Cliente HTTP en memoria para pruebas de contrato."""
    app = create_app(tmp_settings)
    with TestClient(app) as client:
        yield client


@pytest.fixture()
def seed_settings() -> Settings:
    """Configuración que apunta al dataset seed real del repositorio.

    Se usa en los tests de la capa HTTP porque los routers dependen del
    ``SeedLoader`` para resolver territorios, indicadores y perfiles.
    """
    return Settings(
        env="test",
        data_root=REPO_SEED_ROOT / "data",
        ontology_root=REPO_SEED_ROOT / "ontology",
        rate_limit_rpm=10_000,
    )


@pytest.fixture()
def api_client(seed_settings: Settings) -> Iterator[TestClient]:
    """Cliente HTTP con contenedor y seed real listos para tests de integración."""
    app = create_app(seed_settings)
    with TestClient(app) as client:
        yield client
