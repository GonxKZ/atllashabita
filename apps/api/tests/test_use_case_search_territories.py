"""Pruebas del caso de uso de búsqueda de territorios."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application.use_cases import SearchTerritoriesUseCase
from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader

REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = REPO_ROOT / "data" / "seed"


@pytest.fixture(scope="module")
def dataset() -> SeedDataset:
    return SeedLoader(SEED_DIR).load()


@pytest.fixture(scope="module")
def use_case(dataset: SeedDataset) -> SearchTerritoriesUseCase:
    return SearchTerritoriesUseCase(dataset=dataset)


def test_busqueda_case_insensitive_encuentra_sevilla(
    use_case: SearchTerritoriesUseCase,
) -> None:
    results = use_case.execute("sevilla")
    nombres = [t.name for t in results]
    assert "Sevilla" in nombres


def test_busqueda_sin_tilde_encuentra_malaga(
    use_case: SearchTerritoriesUseCase,
) -> None:
    results = use_case.execute("malaga")
    nombres = [t.name for t in results]
    assert "Málaga" in nombres


def test_busqueda_tolerante_con_donosti(
    use_case: SearchTerritoriesUseCase,
) -> None:
    results = use_case.execute("Donosti")
    assert any("Donostia" in territory.name for territory in results)


def test_busqueda_vacia_devuelve_lista_vacia(
    use_case: SearchTerritoriesUseCase,
) -> None:
    assert use_case.execute("") == []
    assert use_case.execute("   ") == []


def test_busqueda_respeta_limit(use_case: SearchTerritoriesUseCase) -> None:
    # "a" aparece en muchos municipios; verificar que el límite se respeta.
    results = use_case.execute("a", limit=3)
    assert len(results) <= 3


def test_busqueda_prioriza_coincidencia_exacta(
    use_case: SearchTerritoriesUseCase,
) -> None:
    results = use_case.execute("Sevilla")
    assert results[0].name == "Sevilla"


def test_busqueda_no_encuentra_si_no_existe(
    use_case: SearchTerritoriesUseCase,
) -> None:
    assert use_case.execute("ciudad-inventada-xyz") == []
