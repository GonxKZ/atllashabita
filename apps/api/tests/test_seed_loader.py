"""Pruebas del lector del dataset demo."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.domain.indicators import IndicatorDirection
from atlashabita.domain.territories import TerritoryKind
from atlashabita.infrastructure.ingestion import SeedLoader

SEED_DIR = Path(__file__).resolve().parents[3] / "data" / "seed"


@pytest.fixture(scope="module")
def dataset() -> object:
    return SeedLoader(SEED_DIR).load()


def test_seed_tiene_10_municipios(dataset: object) -> None:
    assert len(dataset.municipalities) == 10  # type: ignore[attr-defined]


def test_seed_tiene_3_provincias(dataset: object) -> None:
    assert len(dataset.provinces) == 3  # type: ignore[attr-defined]


def test_seed_tiene_2_comunidades_autonomas(dataset: object) -> None:
    assert len(dataset.autonomous_communities) == 2  # type: ignore[attr-defined]


def test_sevilla_localizable_por_identificador(dataset: object) -> None:
    sevilla = dataset.get_territory("municipality:41091")  # type: ignore[attr-defined]
    assert sevilla is not None
    assert sevilla.kind is TerritoryKind.MUNICIPALITY
    assert sevilla.province_code == "41"
    assert sevilla.autonomous_community_code == "01"
    assert sevilla.centroid is not None


def test_indicadores_tienen_direccion_valida(dataset: object) -> None:
    directions = {i.direction for i in dataset.indicators}  # type: ignore[attr-defined]
    assert directions <= {IndicatorDirection.HIGHER_IS_BETTER, IndicatorDirection.LOWER_IS_BETTER}


def test_observaciones_son_50(dataset: object) -> None:
    assert len(dataset.observations) == 50  # type: ignore[attr-defined]


def test_perfiles_tienen_pesos_sumando_aprox_uno(dataset: object) -> None:
    for profile in dataset.profiles:  # type: ignore[attr-defined]
        assert abs(sum(profile.weights.values()) - 1.0) < 1e-9


def test_lector_falla_si_seed_no_existe(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        SeedLoader(tmp_path / "no-existe").load()
