"""Pruebas del caso de uso de ficha territorial."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application import Container
from atlashabita.config import Settings
from atlashabita.observability.errors import TerritoryNotFoundError

REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="module")
def container() -> Container:
    settings = Settings(
        env="test",
        data_root=REPO_ROOT / "data",
        ontology_root=REPO_ROOT / "ontology",
    )
    return Container(settings)


def test_ficha_sevilla_contiene_los_cinco_indicadores(container: Container) -> None:
    detail = container.get_territory_detail.execute("municipality:41091")
    assert detail["name"] == "Sevilla"
    assert detail["type"] == "municipality"
    assert detail["hierarchy"]["province"] == "Sevilla"
    assert detail["hierarchy"]["autonomous_community"] == "Andalucía"
    indicators = {row["id"] for row in detail["indicators"]}
    assert indicators == {
        "rent_median",
        "broadband_coverage",
        "income_per_capita",
        "services_score",
        "climate_comfort",
    }


def test_ficha_sevilla_incluye_scores_por_perfil(container: Container) -> None:
    detail = container.get_territory_detail.execute("municipality:41091")
    perfiles = {row["profile"] for row in detail["scores"]}
    assert perfiles == {"remote_work", "family", "student"}
    for row in detail["scores"]:
        assert 0.0 <= row["score"] <= 100.0
        assert row["version"] == container.settings.scoring_version


def test_ficha_incluye_centroide_para_municipios(container: Container) -> None:
    detail = container.get_territory_detail.execute("municipality:41091")
    assert detail["centroid"] is not None
    assert "lat" in detail["centroid"]
    assert "lon" in detail["centroid"]


def test_ficha_id_inexistente_lanza_territory_not_found(container: Container) -> None:
    with pytest.raises(TerritoryNotFoundError):
        container.get_territory_detail.execute("municipality:99999")


def test_ficha_indicadores_ordenados_alfabeticamente(container: Container) -> None:
    detail = container.get_territory_detail.execute("municipality:41091")
    ids = [row["id"] for row in detail["indicators"]]
    assert ids == sorted(ids)
