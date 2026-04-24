"""Pruebas del caso de uso de listado de fuentes."""

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


def test_lista_fuentes_contiene_las_fuentes_oficiales(container: Container) -> None:
    sources = container.list_sources.execute()
    ids = {source.id for source in sources}
    assert {
        "mivau_serpavi",
        "seteleco_broadband_maps",
        "ine_atlas_renta",
        "miteco_reto_demografico_servicios",
        "miteco_reto_demografico_demografia",
        "ine_datosabiertos",
        "ine_dirce",
        "aemet_opendata",
    } <= ids


def test_fuentes_ordenadas_alfabeticamente_por_titulo(container: Container) -> None:
    sources = container.list_sources.execute()
    titulos = [source.title.lower() for source in sources]
    assert titulos == sorted(titulos)


def test_cada_fuente_tiene_licencia_declarada(container: Container) -> None:
    for source in container.list_sources.execute():
        assert source.license
        assert source.url.startswith("https://")
