"""Pruebas del lector del dataset seed con cobertura nacional."""

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


def test_seed_incluye_al_menos_cien_municipios(dataset: object) -> None:
    assert len(dataset.municipalities) >= 100  # type: ignore[attr-defined]


def test_seed_incluye_las_cincuenta_provincias_mas_ceuta_melilla(dataset: object) -> None:
    assert len(dataset.provinces) == 52  # type: ignore[attr-defined]


def test_seed_incluye_las_diecisiete_comunidades_mas_ciudades_autonomas(
    dataset: object,
) -> None:
    assert len(dataset.autonomous_communities) == 19  # type: ignore[attr-defined]


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


def test_observaciones_cubren_todas_las_combinaciones(dataset: object) -> None:
    expected = (
        len(dataset.municipalities)  # type: ignore[attr-defined]
        * len(dataset.indicators)  # type: ignore[attr-defined]
    )
    assert len(dataset.observations) == expected  # type: ignore[attr-defined]


def test_perfiles_tienen_pesos_sumando_aprox_uno(dataset: object) -> None:
    for profile in dataset.profiles:  # type: ignore[attr-defined]
        assert abs(sum(profile.weights.values()) - 1.0) < 1e-9


def test_perfil_retire_esta_disponible(dataset: object) -> None:
    ids = {profile.id for profile in dataset.profiles}  # type: ignore[attr-defined]
    assert "retire" in ids


def test_lector_falla_si_seed_no_existe(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        SeedLoader(tmp_path / "no-existe").load()
