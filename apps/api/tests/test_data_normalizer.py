"""Tests del normalizador territorial y la búsqueda tolerante a tildes."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.domain.territories import TerritoryKind
from atlashabita.infrastructure.data import TerritoryNormalizer
from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader

SEED_DIR = Path(__file__).resolve().parents[3] / "data" / "seed"


@pytest.fixture(scope="module")
def dataset() -> SeedDataset:
    return SeedLoader(SEED_DIR).load()


@pytest.fixture(scope="module")
def normalizer(dataset: SeedDataset) -> TerritoryNormalizer:
    return TerritoryNormalizer(dataset)


def test_normalize_ine_code_completa_con_ceros_municipio(
    normalizer: TerritoryNormalizer,
) -> None:
    assert normalizer.normalize_ine_code("1091") == "01091"
    assert normalizer.normalize_ine_code("41091") == "41091"


def test_normalize_ine_code_provincia_dos_digitos(
    normalizer: TerritoryNormalizer,
) -> None:
    assert normalizer.normalize_ine_code("1", TerritoryKind.PROVINCE) == "01"
    assert normalizer.normalize_ine_code("41", TerritoryKind.PROVINCE) == "41"


def test_normalize_ine_code_respeta_valores_no_digitos(
    normalizer: TerritoryNormalizer,
) -> None:
    assert normalizer.normalize_ine_code("ES41") == "ES41"


def test_normalize_ine_code_falla_con_cadena_vacia(
    normalizer: TerritoryNormalizer,
) -> None:
    with pytest.raises(ValueError):
        normalizer.normalize_ine_code("")


def test_hierarchy_of_devuelve_provincia_y_ccaa(
    normalizer: TerritoryNormalizer,
) -> None:
    hierarchy = normalizer.hierarchy_of("municipality:41091")
    assert hierarchy["province"] == {"code": "41", "name": "Sevilla"}
    assert hierarchy["autonomous_community"] == {"code": "01", "name": "Andalucía"}
    assert hierarchy["territory"]["name"] == "Sevilla"


def test_hierarchy_of_acepta_codigo_municipal_puro(
    normalizer: TerritoryNormalizer,
) -> None:
    hierarchy = normalizer.hierarchy_of("20069")
    assert hierarchy["autonomous_community"] == {"code": "16", "name": "País Vasco"}


def test_hierarchy_of_falla_si_territorio_no_existe(
    normalizer: TerritoryNormalizer,
) -> None:
    with pytest.raises(KeyError):
        normalizer.hierarchy_of("municipality:99999")


def test_slugify_name_elimina_tildes_y_mayusculas(
    normalizer: TerritoryNormalizer,
) -> None:
    assert normalizer.slugify_name("Alcalá de Guadaíra") == "alcala-de-guadaira"
    assert normalizer.slugify_name("Donostia/San Sebastián") == "donostia-san-sebastian"


def test_slugify_name_falla_cuando_el_nombre_es_vacio(
    normalizer: TerritoryNormalizer,
) -> None:
    with pytest.raises(ValueError):
        normalizer.slugify_name("   ")


def test_search_index_incluye_todos_los_territorios(
    normalizer: TerritoryNormalizer, dataset: SeedDataset
) -> None:
    index = normalizer.search_index()
    assert len(index) == len(dataset.territories)
    # El índice debe ordenarse alfabéticamente por nombre sin tildes.
    ascii_names = [entry["ascii_name"] for entry in index]
    assert ascii_names == sorted(ascii_names)


def test_search_index_permite_buscar_sin_tildes(
    normalizer: TerritoryNormalizer,
) -> None:
    index = normalizer.search_index()
    query = "alcala"
    matches = [entry for entry in index if query in entry["ascii_name"]]
    assert any(match["id"] == "municipality:41004" for match in matches)


def test_search_index_slug_coincide_con_nombre_normalizado(
    normalizer: TerritoryNormalizer,
) -> None:
    index = normalizer.search_index()
    pais_vasco = next(entry for entry in index if entry["id"] == "autonomous_community:16")
    assert pais_vasco["slug"] == "pais-vasco"
    assert pais_vasco["ascii_name"] == "pais vasco"
