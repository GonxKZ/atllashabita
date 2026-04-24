"""Contrato del router ``/accidents``."""

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
        "municipality,41091,Sevilla,41,41,01,37.38,-5.99,684234,141.31\n"
        "municipality,28079,Madrid,28,28,13,40.41,-3.70,3345894,605.77\n",
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
    (seed_dir / "accidents.csv").write_text(
        "territory_id,period,accidents,fatalities,injuries,severity,source_id\n"
        "municipality:41091,2024,150,2,30,light,dgt\n"
        "municipality:41091,2025,180,3,40,light,dgt\n"
        "municipality:28079,2025,500,8,80,severe,dgt\n",
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


def test_listar_accidentes_devuelve_paginacion(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/accidents")
    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total"] == 3
    assert len(body["items"]) == 3


def test_filtrar_por_territorio(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/accidents", params={"territory_id": "municipality:41091"})
    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total"] == 2
    assert all(item["territory_id"] == "municipality:41091" for item in body["items"])


def test_filtrar_por_periodo(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/accidents", params={"period": "2025"})
    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total"] == 2


def test_paginacion_offset_limit(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/accidents", params={"limit": 1, "offset": 2})
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1


def test_offset_negativo_devuelve_422(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/accidents", params={"offset": -1})
    assert response.status_code == 422


def test_risk_calcula_por_1000(client_with_seed: TestClient) -> None:
    response = client_with_seed.get(
        "/accidents/risk", params={"territory_id": "municipality:41091"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["accidents"] == 330
    assert body["fatalities"] == 5
    assert body["population"] == 684234
    assert body["accidents_per_1000"] is not None


def test_risk_requiere_territory_id(client_with_seed: TestClient) -> None:
    response = client_with_seed.get("/accidents/risk")
    assert response.status_code == 422


def test_risk_territorio_sin_accidentes(client_with_seed: TestClient) -> None:
    response = client_with_seed.get(
        "/accidents/risk", params={"territory_id": "municipality:99999"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["accidents"] == 0
    assert body["fatalities_per_1000"] is None


def test_listado_funciona_sin_csv(client_without_csv: TestClient) -> None:
    response = client_without_csv.get("/accidents")
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["pagination"]["total"] == 0


def test_risk_funciona_sin_csv(client_without_csv: TestClient) -> None:
    response = client_without_csv.get(
        "/accidents/risk", params={"territory_id": "municipality:41091"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["accidents"] == 0
