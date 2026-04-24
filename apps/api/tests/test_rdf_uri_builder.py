"""Pruebas del constructor de URIs."""

from __future__ import annotations

import pytest

from atlashabita.domain.territories import TerritoryKind
from atlashabita.infrastructure.rdf import URIBuilder

BASE = "https://data.atlashabita.example/"


@pytest.fixture()
def builder() -> URIBuilder:
    return URIBuilder(BASE)


def test_base_uri_vacia_rechazada() -> None:
    with pytest.raises(ValueError, match="base_uri"):
        URIBuilder("")


def test_base_uri_sin_barra_se_normaliza() -> None:
    b = URIBuilder("https://data.atlashabita.example")
    assert b.base_uri.endswith("/")


def test_territory_municipality(builder: URIBuilder) -> None:
    uri = builder.territory("41091", TerritoryKind.MUNICIPALITY)
    assert str(uri) == BASE + "resource/territory/municipality/41091"


def test_territory_province(builder: URIBuilder) -> None:
    uri = builder.territory("41", TerritoryKind.PROVINCE)
    assert str(uri) == BASE + "resource/territory/province/41"


def test_territory_autonomous_community(builder: URIBuilder) -> None:
    uri = builder.territory("01", TerritoryKind.AUTONOMOUS_COMMUNITY)
    assert str(uri) == BASE + "resource/territory/autonomous_community/01"


def test_indicator_conserva_underscores(builder: URIBuilder) -> None:
    uri = builder.indicator("rent_median")
    assert str(uri) == BASE + "resource/indicator/rent_median"


def test_observation_uri_determinista(builder: URIBuilder) -> None:
    uri = builder.observation("rent_median", "municipality:41091", "2025")
    assert str(uri) == BASE + "resource/observation/rent_median/municipality/41091/2025"


def test_source_uri(builder: URIBuilder) -> None:
    uri = builder.source("ine_atlas_renta")
    assert str(uri) == BASE + "resource/source/ine_atlas_renta"


def test_profile_uri(builder: URIBuilder) -> None:
    uri = builder.profile("remote_work")
    assert str(uri) == BASE + "resource/profile/remote_work"


def test_score_uri_incluye_version(builder: URIBuilder) -> None:
    uri = builder.score("2026.04.1", "remote_work", "municipality:41091")
    assert str(uri) == BASE + "resource/score/2026.04.1/remote_work/municipality/41091"


def test_named_graph(builder: URIBuilder) -> None:
    uri = builder.named_graph("territories")
    assert str(uri) == BASE + "graph/territories"


def test_slugify_elimina_tildes(builder: URIBuilder) -> None:
    uri = builder.source("Málaga Analítica")
    # Debe producir una URI ASCII segura sin tildes ni espacios.
    assert str(uri) == BASE + "resource/source/Malaga_Analitica"


def test_segmentos_vacios_rechazados(builder: URIBuilder) -> None:
    with pytest.raises(ValueError, match="code"):
        builder.territory("", TerritoryKind.PROVINCE)
    with pytest.raises(ValueError, match="indicator_code"):
        builder.observation("", "municipality:41091", "2025")


def test_uri_builder_es_hashable() -> None:
    """Al ser ``frozen``, se puede usar como clave de caché de alto nivel."""
    a = URIBuilder(BASE)
    b = URIBuilder(BASE)
    assert hash(a) == hash(b)
