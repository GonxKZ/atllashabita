"""Pruebas del caso de uso de cálculo de rankings."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application import Container
from atlashabita.config import Settings
from atlashabita.domain.territories import TerritoryKind
from atlashabita.observability.errors import InvalidProfileError, InvalidScopeError

REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="module")
def container() -> Container:
    settings = Settings(
        env="test",
        data_root=REPO_ROOT / "data",
        ontology_root=REPO_ROOT / "ontology",
    )
    return Container(settings)


def test_scope_es_devuelve_muestra_nacional(container: Container) -> None:
    payload = container.compute_rankings.execute("remote_work", scope="es", limit=200)
    assert payload["profile"] == "remote_work"
    assert payload["scope"] == "es"
    assert len(payload["results"]) >= 100
    assert payload["scoring_version"]
    assert payload["data_version"].startswith("seed:")


def test_scope_por_defecto_es_equivalente_a_es(container: Container) -> None:
    con_default = container.compute_rankings.execute("remote_work", scope=None, limit=200)
    con_es = container.compute_rankings.execute("remote_work", scope="es", limit=200)
    assert [r["territory_id"] for r in con_default["results"]] == [
        r["territory_id"] for r in con_es["results"]
    ]


def test_scope_province_20_incluye_municipios_guipuzcoanos(
    container: Container,
) -> None:
    payload = container.compute_rankings.execute("remote_work", scope="province:20", limit=20)
    ids = {result["territory_id"] for result in payload["results"]}
    expected = {
        "municipality:20069",
        "municipality:20036",
        "municipality:20038",
        "municipality:20071",
    }
    assert expected <= ids
    assert all(tid.startswith("municipality:20") for tid in ids)


def test_scope_autonomous_community_01_solo_andalucia(container: Container) -> None:
    payload = container.compute_rankings.execute(
        "remote_work", scope="autonomous_community:01", limit=50
    )
    andalusian_provinces = ("04", "11", "14", "18", "21", "23", "29", "41")
    for result in payload["results"]:
        territory_id = result["territory_id"]
        province_code = territory_id.split(":")[-1][:2]
        assert province_code in andalusian_provinces


def test_perfil_inexistente_lanza_invalid_profile_error(container: Container) -> None:
    with pytest.raises(InvalidProfileError):
        container.compute_rankings.execute("inexistente", scope="es")


def test_scope_invalido_lanza_invalid_scope_error(container: Container) -> None:
    with pytest.raises(InvalidScopeError):
        container.compute_rankings.execute("remote_work", scope="region:001")


def test_scope_con_codigo_inexistente_lanza_invalid_scope_error(
    container: Container,
) -> None:
    with pytest.raises(InvalidScopeError):
        container.compute_rankings.execute("remote_work", scope="province:99")


def test_ranking_cachea_resultados(container: Container) -> None:
    primero = container.compute_rankings.execute("remote_work", scope="es", limit=3)
    segundo = container.compute_rankings.execute("remote_work", scope="es", limit=3)
    assert [r["score"] for r in primero["results"]] == [r["score"] for r in segundo["results"]]


def test_ranking_incluye_rank_ascendente(container: Container) -> None:
    payload = container.compute_rankings.execute("student", scope="es", limit=5)
    ranks = [result["rank"] for result in payload["results"]]
    assert ranks == [1, 2, 3, 4, 5]


def test_ranking_con_pesos_personalizados(container: Container) -> None:
    payload = container.compute_rankings.execute(
        "remote_work",
        scope="es",
        weights={"broadband_coverage": 1.0},
        limit=3,
    )
    for result in payload["results"]:
        assert len(result["top_contributions"]) == 1
        assert result["top_contributions"][0]["factor"] == "broadband_coverage"


def test_indices_o1_resuelven_provincia_y_comunidad(container: Container) -> None:
    """Los índices O(1) precomputados deben coincidir con un cálculo manual."""
    use_case = container.compute_rankings
    municipios_p20 = use_case._municipalities_by_province["20"]
    assert all(t.kind.value == "municipality" for t in municipios_p20)
    assert all(t.province_code == "20" for t in municipios_p20)

    municipios_c01 = use_case._municipalities_by_community["01"]
    assert all(t.autonomous_community_code == "01" for t in municipios_c01)


def test_lookup_name_devuelve_nombre_correcto(container: Container) -> None:
    """``_lookup_name`` debe resolver provincia/comunidad por código en O(1)."""
    use_case = container.compute_rankings
    nombre = use_case._lookup_name("20", TerritoryKind.PROVINCE)
    assert nombre == "Gipuzkoa"
    assert use_case._lookup_name(None, TerritoryKind.PROVINCE) is None
    assert use_case._lookup_name("ZZ", TerritoryKind.PROVINCE) is None
