"""Pruebas del caso de uso de cálculo de rankings."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application import Container
from atlashabita.config import Settings
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


def test_scope_es_devuelve_10_municipios(container: Container) -> None:
    payload = container.compute_rankings.execute("remote_work", scope="es", limit=50)
    assert payload["profile"] == "remote_work"
    assert payload["scope"] == "es"
    assert len(payload["results"]) == 10
    assert payload["scoring_version"]
    assert payload["data_version"].startswith("seed:")


def test_scope_por_defecto_es_equivalente_a_es(container: Container) -> None:
    con_default = container.compute_rankings.execute("remote_work", scope=None, limit=50)
    con_es = container.compute_rankings.execute("remote_work", scope="es", limit=50)
    assert [r["territory_id"] for r in con_default["results"]] == [
        r["territory_id"] for r in con_es["results"]
    ]


def test_scope_province_20_devuelve_4_municipios_guipuzcoanos(
    container: Container,
) -> None:
    payload = container.compute_rankings.execute("remote_work", scope="province:20", limit=20)
    ids = {result["territory_id"] for result in payload["results"]}
    assert ids == {
        "municipality:20069",
        "municipality:20036",
        "municipality:20038",
        "municipality:20071",
    }


def test_scope_autonomous_community_01_solo_andalucia(container: Container) -> None:
    payload = container.compute_rankings.execute(
        "remote_work", scope="autonomous_community:01", limit=50
    )
    for result in payload["results"]:
        territory_id = result["territory_id"]
        # Andalucía agrupa provincias 41 y 29
        assert territory_id.startswith("municipality:41") or territory_id.startswith(
            "municipality:29"
        )


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
