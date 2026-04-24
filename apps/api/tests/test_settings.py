"""Pruebas de configuración tipada."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.config import Settings


def test_data_zone_valida_nombre(tmp_path: Path) -> None:
    settings = Settings(data_root=tmp_path)
    assert settings.data_zone("raw") == tmp_path / "raw"
    with pytest.raises(ValueError):
        settings.data_zone("desconocida")


def test_sparql_update_bloqueado_por_defecto(tmp_path: Path) -> None:
    assert Settings(data_root=tmp_path).sparql_allow_update is False
