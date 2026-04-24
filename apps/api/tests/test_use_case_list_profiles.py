"""Pruebas del caso de uso de listado de perfiles."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application import Container
from atlashabita.config import Settings

REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="module")
def container() -> Container:
    settings = Settings(
        env="test",
        data_root=REPO_ROOT / "data",
        ontology_root=REPO_ROOT / "ontology",
    )
    return Container(settings)


def test_lista_contiene_los_perfiles_seed(container: Container) -> None:
    profiles = container.list_profiles.execute()
    ids = {profile.id for profile in profiles}
    assert {"remote_work", "family", "student", "retire"} <= ids


def test_lista_devuelve_perfiles_ordenados_por_id(container: Container) -> None:
    profiles = container.list_profiles.execute()
    ids = [profile.id for profile in profiles]
    assert ids == sorted(ids)


def test_cada_perfil_tiene_pesos_positivos(container: Container) -> None:
    for profile in container.list_profiles.execute():
        assert sum(profile.weights.values()) > 0
