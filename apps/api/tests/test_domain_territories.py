"""Pruebas de los objetos valor de territorio."""

from __future__ import annotations

import pytest

from atlashabita.domain.territories import GeoPoint, Territory, TerritoryKind


def test_identifier_combina_tipo_y_codigo() -> None:
    municipio = Territory(
        code="41091",
        name="Sevilla",
        kind=TerritoryKind.MUNICIPALITY,
        province_code="41",
        autonomous_community_code="01",
    )
    assert municipio.identifier == "municipality:41091"


def test_geopoint_rechaza_coordenadas_fuera_de_rango() -> None:
    with pytest.raises(ValueError):
        GeoPoint(lat=120.0, lon=0.0)
    with pytest.raises(ValueError):
        GeoPoint(lat=0.0, lon=-300.0)


def test_territory_es_inmutable_y_hashable() -> None:
    t = Territory(code="41", name="Sevilla", kind=TerritoryKind.PROVINCE)
    with pytest.raises(AttributeError):
        t.name = "otro"  # type: ignore[misc]
    assert hash(t) == hash(Territory(code="41", name="Sevilla", kind=TerritoryKind.PROVINCE))
