"""Fixtures compartidas de los tests del backend."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from atlashabita.config import Settings
from atlashabita.interfaces.api import create_app


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
