"""Contrato del router ``/transit``."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from atlashabita.config import Settings
from atlashabita.interfaces.api import create_app


def _write_seed(seed_dir: Path) -> None:
    seed_dir.mkdir(parents=True, exist_ok=True)
    (seed_dir / "territories.csv").write_text(
        "kind,code,name,parent_code,province_code,autonomous_community_code,lat,lon,population,area_km2\n"
        "municipality,41091,Sevilla,41,41,01,37.38,-5.99,684234,141.31\n",
        encoding="utf-8",
    )
    (seed_dir / "sources.csv").write_text(
        "id,title,publisher,url,license,periodicity,description,indicators\n"
        "src,Test,Pub,https://example.org,CC BY 4.0,anual,d,rent_median\n",
        encoding="utf-8",
    )
    (seed_dir / "indicators.csv").write_text(
        "code,label,unit,direction,description,source_id,min_value,max_value\n"
        "rent_median,Alquiler,EUR,lower_is_better,d,src,0,1\n",
        encoding="utf-8",
    )
    (seed_dir / "observations.csv").write_text(
        "indicator_code,territory_id,period,value,source_id,quality\n",
        encoding="utf-8",
    )
    (seed_dir / "profiles.csv").write_text(
        'id,label,description,weights\nremote,Teletrabajo,d,"{""rent_median"":1.0}"\n',
        encoding="utf-8",
    )


@pytest.fixture()
def settings_with_seed(tmp_path: Path) -> Settings:
    seed_dir = tmp_path / "data" / "seed"
    _write_seed(seed_dir)
    (seed_dir / "transit_stops.csv").write_text(
        "stop_id,territory_id,name,lat,lon,modes,operator,lines,source_id\n"
        "stop:1,municipality:41091,Plaza Nueva,37.388,-5.992,bus|tram,Tussam,C1|C2,crtm\n"
        "stop:2,municipality:41091,Triana,37.382,-5.998,bus,Tussam,5,crtm\n"
        "stop:3,municipality:28079,Sol,40.416,-3.703,metro,EMT,1|2|3,crtm\n",
        encoding="utf-8",
    )
    return Settings(
        env="test",
        data_root=tmp_path / "data",
        ontology_root=tmp_path / "ontology",
        rate_limit_rpm=10_000,
    )


@pytest.fixture()
def settings_without_csv(tmp_path: Path) -> Settings:
    seed_dir = tmp_path / "data" / "seed"
    _write_seed(seed_dir)
    return Settings(
        env="test",
        data_root=tmp_path / "data",
        ontology_root=tmp_path / "ontology",
        rate_limit_rpm=10_000,
    )


@pytest.fixture()
def client_with_seed(settings_with_seed: Settings) -> Iterator[TestClient]:
    app = create_app(settings_with_seed)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def client_without_csv(settings_without_csv: Settings) -> Iterator[TestClient]:
    app = create_app(settings_without_csv)
    with TestClient(app) as test_client:
        yield test_client


def test_listar_paradas_devuelve_paginacion(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/transit/stops")
    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total"] == 3
    assert len(body["items"]) == 3
    assert body["items"][0]["modes"] == ["bus", "tram"]


def test_filtrar_por_territorio(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/transit/stops", params={"territory_id": "municipality:41091"})
    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total"] == 2
    assert all(item["territory_id"] == "municipality:41091" for item in body["items"])


def test_pagina_correctamente(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/transit/stops", params={"limit": 1, "offset": 1})
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["pagination"]["limit"] == 1


def test_limit_negativo_devuelve_422(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/transit/stops", params={"limit": -1})
    assert response.status_code == 422


def test_funciona_sin_csv(client_without_csv: TestClient) -> None:
    response = client_without_csv.get("/transit/stops")
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["pagination"]["total"] == 0
