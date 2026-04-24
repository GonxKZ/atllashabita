"""Pruebas unitarias del caso de uso de accidentes."""

from __future__ import annotations

from pathlib import Path

import pytest

from atlashabita.application.use_cases.list_accidents import ListAccidentsUseCase
from atlashabita.domain.territories import GeoPoint, Territory, TerritoryKind
from atlashabita.infrastructure.ingestion import SeedDataset


@pytest.fixture()
def stub_dataset() -> SeedDataset:
    """Dataset mínimo con un municipio poblado."""
    territory = Territory(
        code="41091",
        name="Sevilla",
        kind=TerritoryKind.MUNICIPALITY,
        parent_code="41",
        province_code="41",
        autonomous_community_code="01",
        centroid=GeoPoint(lat=37.38, lon=-5.99),
        population=684234,
        area_km2=141.31,
    )
    return SeedDataset(
        territories=(territory,),
        sources=(),
        indicators=(),
        observations=(),
        profiles=(),
    )


@pytest.fixture()
def seed_dir_with_csv(tmp_path: Path) -> Path:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    csv_content = (
        "territory_id,period,accidents,fatalities,injuries,severity,source_id\n"
        "municipality:41091,2024,150,2,30,light,dgt\n"
        "municipality:41091,2025,180,3,40,light,dgt\n"
        "municipality:28079,2025,500,8,80,severe,dgt\n"
    )
    (seed_dir / "accidents.csv").write_text(csv_content, encoding="utf-8")
    return seed_dir


def test_list_records_sin_csv_vacio(tmp_path: Path, stub_dataset: SeedDataset) -> None:
    use_case = ListAccidentsUseCase(seed_dir=tmp_path, dataset=stub_dataset)
    assert use_case.list_records() == []
    assert use_case.count_records() == 0


def test_list_records_devuelve_todos(seed_dir_with_csv: Path, stub_dataset: SeedDataset) -> None:
    use_case = ListAccidentsUseCase(seed_dir=seed_dir_with_csv, dataset=stub_dataset)
    rows = use_case.list_records()
    assert len(rows) == 3
    assert rows[0]["accidents"] == 150
    assert rows[0]["severity"] == "light"


def test_list_records_filtra_por_territorio(
    seed_dir_with_csv: Path, stub_dataset: SeedDataset
) -> None:
    use_case = ListAccidentsUseCase(seed_dir=seed_dir_with_csv, dataset=stub_dataset)
    rows = use_case.list_records(territory_id="municipality:41091")
    assert len(rows) == 2
    assert all(row["territory_id"] == "municipality:41091" for row in rows)


def test_list_records_paginado(seed_dir_with_csv: Path, stub_dataset: SeedDataset) -> None:
    use_case = ListAccidentsUseCase(seed_dir=seed_dir_with_csv, dataset=stub_dataset)
    page = use_case.list_records(limit=1, offset=1)
    assert len(page) == 1


def test_count_records_filtra(seed_dir_with_csv: Path, stub_dataset: SeedDataset) -> None:
    use_case = ListAccidentsUseCase(seed_dir=seed_dir_with_csv, dataset=stub_dataset)
    assert use_case.count_records(period="2025") == 2


def test_risk_calcula_indicadores(seed_dir_with_csv: Path, stub_dataset: SeedDataset) -> None:
    use_case = ListAccidentsUseCase(seed_dir=seed_dir_with_csv, dataset=stub_dataset)
    risk = use_case.risk("municipality:41091")
    assert risk["accidents"] == 330
    assert risk["fatalities"] == 5
    assert risk["injuries"] == 70
    assert risk["population"] == 684234
    assert risk["accidents_per_1000"] == round(330 / 684234 * 1000, 4)
    assert risk["fatalities_per_1000"] == round(5 / 684234 * 1000, 4)
    assert risk["records"] == 2


def test_risk_sin_poblacion_devuelve_none(
    seed_dir_with_csv: Path, stub_dataset: SeedDataset
) -> None:
    use_case = ListAccidentsUseCase(seed_dir=seed_dir_with_csv, dataset=stub_dataset)
    risk = use_case.risk("municipality:28079")
    assert risk["population"] is None
    assert risk["accidents_per_1000"] is None
    assert risk["accidents"] == 500


def test_risk_sin_datos_devuelve_ceros(tmp_path: Path, stub_dataset: SeedDataset) -> None:
    use_case = ListAccidentsUseCase(seed_dir=tmp_path, dataset=stub_dataset)
    risk = use_case.risk("municipality:99999")
    assert risk["accidents"] == 0
    assert risk["fatalities"] == 0
    assert risk["records"] == 0


def test_csv_columna_obligatoria_falta(tmp_path: Path, stub_dataset: SeedDataset) -> None:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "accidents.csv").write_text("territory_id,period\nA,2025\n", encoding="utf-8")
    use_case = ListAccidentsUseCase(seed_dir=seed_dir, dataset=stub_dataset)
    with pytest.raises(ValueError, match="accidents"):
        use_case.list_records()


def test_csv_accidents_no_decimal(tmp_path: Path, stub_dataset: SeedDataset) -> None:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "accidents.csv").write_text(
        "territory_id,period,accidents\nA,2025,bogus\n", encoding="utf-8"
    )
    use_case = ListAccidentsUseCase(seed_dir=seed_dir, dataset=stub_dataset)
    with pytest.raises(ValueError, match="accidents"):
        use_case.list_records()


def test_csv_fatalities_no_decimal(tmp_path: Path, stub_dataset: SeedDataset) -> None:
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "accidents.csv").write_text(
        "territory_id,period,accidents,fatalities\nA,2025,1,bogus\n",
        encoding="utf-8",
    )
    use_case = ListAccidentsUseCase(seed_dir=seed_dir, dataset=stub_dataset)
    with pytest.raises(ValueError, match="fatalities"):
        use_case.list_records()
