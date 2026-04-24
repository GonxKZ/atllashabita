"""Contrato del router ``/mobility``."""

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
    (seed_dir / "mobility_flows.csv").write_text(
        "origin_id,destination_id,period,trips,mode,purpose,source_id\n"
        "municipality:41091,municipality:28079,2025,1500.0,car,work,mitma\n"
        "municipality:41091,municipality:28079,2024,1200.0,car,work,mitma\n"
        "municipality:28079,municipality:41091,2025,800.0,train,leisure,mitma\n",
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


def test_listar_flows_devuelve_paginacion(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/mobility/flows")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "pagination" in body
    assert body["pagination"]["total"] == 3
    assert len(body["items"]) == 3


def test_listar_flows_filtra_por_origen(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/mobility/flows", params={"origin": "municipality:41091"})
    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total"] == 2
    assert all(item["origin_id"] == "municipality:41091" for item in body["items"])


def test_listar_flows_filtra_por_destino_y_periodo(client_with_seed: TestClient) -> None:
    response = client_with_seed.get(
        "/mobility/flows",
        params={"destination": "municipality:28079", "period": "2025"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total"] == 1
    assert body["items"][0]["trips"] == 1500.0


def test_listar_flows_pagina(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/mobility/flows", params={"limit": 1, "offset": 1})
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["pagination"]["limit"] == 1
    assert body["pagination"]["offset"] == 1


def test_listar_flows_limit_invalido_devuelve_422(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/mobility/flows", params={"limit": 0})
    assert response.status_code == 422


def test_summary_devuelve_totales(client_with_seed: TestClient) -> None:
    response = client_with_seed.get(
        "/mobility/summary", params={"territory_id": "municipality:41091"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["territory_id"] == "municipality:41091"
    assert body["total_outgoing_trips"] == 2700.0
    assert body["total_incoming_trips"] == 800.0
    assert len(body["top_destinations"]) >= 1


def test_summary_requiere_territory_id(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/mobility/summary")
    assert response.status_code == 422


def test_endpoint_funciona_sin_csv(client_without_csv: TestClient) -> None:
    response = client_without_csv.get("/mobility/flows")
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["pagination"]["total"] == 0


def test_summary_funciona_sin_csv(client_without_csv: TestClient) -> None:
    response = client_without_csv.get(
        "/mobility/summary", params={"territory_id": "municipality:41091"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_outgoing_trips"] == 0
    assert body["top_destinations"] == []
