"""Pruebas unitarias del caso de uso de transporte público."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application.use_cases.list_transit import ListTransitUseCase


@pytest.fixture()
def seed_dir_with_csv(tmp_path: Path) -> Path:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    csv_content = (
        "stop_id,territory_id,name,lat,lon,modes,operator,lines,source_id\n"
        "stop:1,municipality:41091,Plaza Nueva,37.388,-5.992,bus|tram,Tussam,C1|C2,crtm\n"
        "stop:2,municipality:41091,Triana,37.382,-5.998,bus,Tussam,5,crtm\n"
        "stop:3,municipality:28079,Sol,40.416,-3.703,metro,EMT,1|2|3,crtm\n"
    )
    (seed_dir / "transit_stops.csv").write_text(csv_content, encoding="utf-8")
    return seed_dir


def test_list_stops_sin_csv_vacio(tmp_path: Path) -> None:
    use_case = ListTransitUseCase(seed_dir=tmp_path)
    assert use_case.list_stops() == []
    assert use_case.count_stops() == 0


def test_list_stops_devuelve_todas(seed_dir_with_csv: Path) -> None:
    use_case = ListTransitUseCase(seed_dir=seed_dir_with_csv)
    stops = use_case.list_stops()
    assert len(stops) == 3
    assert stops[0]["stop_id"] == "stop:1"
    assert stops[0]["modes"] == ["bus", "tram"]
    assert stops[0]["lines"] == ["C1", "C2"]


def test_list_stops_filtra_por_territorio(seed_dir_with_csv: Path) -> None:
    use_case = ListTransitUseCase(seed_dir=seed_dir_with_csv)
    stops = use_case.list_stops(territory_id="municipality:41091")
    assert len(stops) == 2
    assert all(stop["territory_id"] == "municipality:41091" for stop in stops)


def test_list_stops_paginado(seed_dir_with_csv: Path) -> None:
    use_case = ListTransitUseCase(seed_dir=seed_dir_with_csv)
    page = use_case.list_stops(limit=1, offset=2)
    assert len(page) == 1


def test_count_stops_filtra(seed_dir_with_csv: Path) -> None:
    use_case = ListTransitUseCase(seed_dir=seed_dir_with_csv)
    assert use_case.count_stops() == 3
    assert use_case.count_stops(territory_id="municipality:28079") == 1


def test_csv_columna_obligatoria_falta(tmp_path: Path) -> None:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "transit_stops.csv").write_text(
        "stop_id,territory_id,name\nA,B,Centro\n", encoding="utf-8"
    )
    use_case = ListTransitUseCase(seed_dir=seed_dir)
    with pytest.raises(ValueError, match="transit_stops"):
        use_case.list_stops()


def test_csv_lat_lon_no_decimal(tmp_path: Path) -> None:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "transit_stops.csv").write_text(
        "stop_id,territory_id,name,lat,lon\nA,B,Centro,bogus,bogus\n",
        encoding="utf-8",
    )
    use_case = ListTransitUseCase(seed_dir=seed_dir)
    with pytest.raises(ValueError, match="lat"):
        use_case.list_stops()


def test_modes_lines_separados_por_coma(tmp_path: Path) -> None:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "transit_stops.csv").write_text(
        "stop_id,territory_id,name,lat,lon,modes,lines\nA,B,Centro,1.0,2.0,bus,1,2\n",
        encoding="utf-8",
    )
    use_case = ListTransitUseCase(seed_dir=seed_dir)
    rows = use_case.list_stops()
    assert rows[0]["modes"] == ["bus"]


def test_cache_se_reutiliza(seed_dir_with_csv: Path) -> None:
    use_case = ListTransitUseCase(seed_dir=seed_dir_with_csv)
    primero = use_case.list_stops()
    segundo = use_case.list_stops()
    assert primero == segundo
