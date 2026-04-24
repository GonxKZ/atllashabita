"""Pruebas de los casos de uso de capas cartográficas."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application import Container
from atlashabita.config import Settings
from atlashabita.observability.errors import InvalidScopeError

REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="module")
def container() -> Container:
    settings = Settings(
        env="test",
        data_root=REPO_ROOT / "data",
        ontology_root=REPO_ROOT / "ontology",
    )
    return Container(settings)


def test_list_map_layers_incluye_score_por_perfil_y_indicadores(
    container: Container,
) -> None:
    layers = container.list_map_layers.execute()
    score_layers = [layer for layer in layers if layer["kind"] == "score"]
    indicator_layers = [layer for layer in layers if layer["kind"] == "indicator"]
    profiles = len(container.dataset.profiles)
    indicators = len(container.dataset.indicators)
    assert len(score_layers) == profiles
    assert len(indicator_layers) == indicators
    assert len(layers) == profiles + indicators


def test_list_map_layers_formato_correcto(container: Container) -> None:
    layers = container.list_map_layers.execute()
    for layer in layers:
        assert layer["type"] == "choropleth"
        assert isinstance(layer["domain"], list)
        assert isinstance(layer["range"], list)
        assert layer["legend"]


def test_get_map_layer_indicator_broadband_devuelve_features(
    container: Container,
) -> None:
    collection = container.get_map_layer.execute("broadband_coverage")
    assert collection["type"] == "FeatureCollection"
    assert collection["layer_id"] == "broadband_coverage"
    assert len(collection["features"]) >= 100
    for feature in collection["features"]:
        assert feature["geometry"]["type"] == "Point"
        coords = feature["geometry"]["coordinates"]
        assert len(coords) == 2
        assert "value" in feature["properties"]
        assert "territory_id" in feature["properties"]


def test_get_map_layer_score_remote_work_devuelve_features(
    container: Container,
) -> None:
    collection = container.get_map_layer.execute("score_remote_work")
    assert collection["kind"] == "score"
    assert len(collection["features"]) >= 100
    for feature in collection["features"]:
        value = feature["properties"]["value"]
        assert 0.0 <= value <= 100.0


def test_get_map_layer_id_invalido_lanza_error(container: Container) -> None:
    with pytest.raises(InvalidScopeError):
        container.get_map_layer.execute("capa-inexistente")


def test_get_map_layer_vacio_lanza_error(container: Container) -> None:
    with pytest.raises(InvalidScopeError):
        container.get_map_layer.execute("")
