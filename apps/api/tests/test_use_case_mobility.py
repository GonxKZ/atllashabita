"""Pruebas unitarias del caso de uso de movilidad."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application.use_cases.list_mobility import ListMobilityUseCase


@pytest.fixture()
def seed_dir_with_csv(tmp_path: Path) -> Path:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    csv_content = (
        "origin_id,destination_id,period,trips,mode,purpose,source_id\n"
        "municipality:41091,municipality:28079,2025,1500.0,car,work,mitma\n"
        "municipality:41091,municipality:28079,2024,1200.0,car,work,mitma\n"
        "municipality:28079,municipality:41091,2025,800.0,train,leisure,mitma\n"
        "municipality:46250,municipality:41091,2025,300.0,bus,work,mitma\n"
    )
    (seed_dir / "mobility_flows.csv").write_text(csv_content, encoding="utf-8")
    return seed_dir


def test_list_flows_sin_csv_devuelve_vacio(tmp_path: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=tmp_path)
    assert use_case.list_flows() == []
    assert use_case.count_flows() == 0


def test_list_flows_devuelve_todos_los_pares(seed_dir_with_csv: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=seed_dir_with_csv)
    flows = use_case.list_flows()
    assert len(flows) == 4
    assert flows[0]["origin_id"] == "municipality:41091"
    assert flows[0]["trips"] == 1500.0


def test_list_flows_filtra_por_origen(seed_dir_with_csv: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=seed_dir_with_csv)
    flows = use_case.list_flows(origin="municipality:46250")
    assert len(flows) == 1
    assert flows[0]["destination_id"] == "municipality:41091"


def test_list_flows_filtra_por_destino_y_periodo(seed_dir_with_csv: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=seed_dir_with_csv)
    flows = use_case.list_flows(destination="municipality:28079", period="2025")
    assert len(flows) == 1
    assert flows[0]["trips"] == 1500.0


def test_list_flows_pagina_correctamente(seed_dir_with_csv: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=seed_dir_with_csv)
    page = use_case.list_flows(limit=2, offset=1)
    assert len(page) == 2


def test_count_flows_aplica_filtros(seed_dir_with_csv: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=seed_dir_with_csv)
    assert use_case.count_flows(origin="municipality:41091") == 2
    assert use_case.count_flows(period="2025") == 3


def test_summary_devuelve_totales_y_top(seed_dir_with_csv: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=seed_dir_with_csv)
    summary = use_case.summary("municipality:41091")
    assert summary["territory_id"] == "municipality:41091"
    assert summary["total_outgoing_trips"] == 2700.0
    assert summary["total_incoming_trips"] == 1100.0
    assert summary["outgoing_flows"] == 2
    assert summary["incoming_flows"] == 2
    assert summary["top_destinations"][0]["territory_id"] == "municipality:28079"
    assert summary["top_origins"][0]["trips"] == 800.0


def test_summary_sin_datos_devuelve_ceros(tmp_path: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=tmp_path)
    summary = use_case.summary("municipality:99999")
    assert summary["total_outgoing_trips"] == 0
    assert summary["total_incoming_trips"] == 0
    assert summary["top_destinations"] == []


def test_csv_columna_obligatoria_falta(tmp_path: Path) -> None:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "mobility_flows.csv").write_text(
        "origin_id,destination_id,period\nA,B,2025\n", encoding="utf-8"
    )
    use_case = ListMobilityUseCase(seed_dir=seed_dir)
    with pytest.raises(ValueError, match="trips"):
        use_case.list_flows()


def test_csv_trips_no_decimal(tmp_path: Path) -> None:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "mobility_flows.csv").write_text(
        "origin_id,destination_id,period,trips\nA,B,2025,not_a_number\n",
        encoding="utf-8",
    )
    use_case = ListMobilityUseCase(seed_dir=seed_dir)
    with pytest.raises(ValueError, match="trips"):
        use_case.list_flows()


def test_cache_se_reutiliza_entre_llamadas(seed_dir_with_csv: Path) -> None:
    use_case = ListMobilityUseCase(seed_dir=seed_dir_with_csv)
    primero = use_case.list_flows()
    segundo = use_case.list_flows()
    assert primero == segundo
