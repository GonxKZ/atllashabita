"""Pruebas puras del caso de uso :class:`RunSparqlQueryUseCase`.

No levantan FastAPI ni rdflib: se usa un *fake runner* que replica el
``SparqlRunnerProtocol`` para aislar la validación de whitelist, bindings y
aplicación de límites.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pytest

from atlashabita.application.use_cases.run_sparql_query import (
    RunSparqlQueryUseCase,
    SparqlQueryResult,
)
from atlashabita.config import Settings
from atlashabita.observability.errors import DomainError


@dataclass
class FakeRunner:
    """Runner que devuelve colecciones prefabricadas para cada método."""

    top_scores_calls: list[tuple[str, str, int]] = field(default_factory=list)
    top_scores_result: list[dict[str, Any]] = field(
        default_factory=lambda: [{"territory": "urn:t", "score": 1.0}]
    )
    municipalities_result: list[dict[str, Any]] = field(default_factory=list)
    indicators_result: list[dict[str, Any]] = field(default_factory=list)
    sources_result: list[dict[str, Any]] = field(default_factory=list)
    counts_result: dict[str, int] = field(default_factory=dict)
    definition_result: dict[str, Any] = field(default_factory=dict)

    def top_scores_by_profile(
        self, profile_id: str, scope: str = "municipality", limit: int = 10
    ) -> list[dict[str, Any]]:
        self.top_scores_calls.append((profile_id, scope, limit))
        return list(self.top_scores_result)[:limit]

    def municipalities_by_province(self, province_code: str) -> list[dict[str, Any]]:
        return list(self.municipalities_result)

    def indicators_for_territory(self, territory_id: str) -> list[dict[str, Any]]:
        return list(self.indicators_result)

    def sources_used_by_territory(self, territory_id: str) -> list[dict[str, Any]]:
        return list(self.sources_result)

    def indicator_definition(self, indicator_code: str) -> dict[str, Any]:
        return dict(self.definition_result)

    def count_triples_by_class(self) -> dict[str, int]:
        return dict(self.counts_result)


@pytest.fixture()
def settings() -> Settings:
    return Settings(sparql_max_results=5)


def test_catalog_expone_todas_las_consultas() -> None:
    signatures = RunSparqlQueryUseCase.catalog()
    ids = {s.query_id for s in signatures}
    assert ids == {
        "top_scores_by_profile",
        "municipalities_by_province",
        "indicators_for_territory",
        "sources_used_by_territory",
        "count_triples_by_class",
        "indicator_definition",
    }
    for signature in signatures:
        assert signature.description.strip() != ""


def test_top_scores_cappea_el_limit_al_max_results(settings: Settings) -> None:
    runner = FakeRunner(top_scores_result=[{"i": i} for i in range(20)])
    use_case = RunSparqlQueryUseCase(runner, settings)
    result = use_case.execute("top_scores_by_profile", {"profile_id": "p", "limit": 50})
    assert isinstance(result, SparqlQueryResult)
    # El fake aplica el ``limit`` que recibe → comprueba que se trunca a 5.
    assert runner.top_scores_calls == [("p", "municipality", 5)]
    assert len(result.rows) <= 5


def test_query_id_desconocido_devuelve_invalid_query(settings: Settings) -> None:
    use_case = RunSparqlQueryUseCase(FakeRunner(), settings)
    with pytest.raises(DomainError) as excinfo:
        use_case.execute("drop_graph")
    assert excinfo.value.code == "INVALID_QUERY"
    assert excinfo.value.status_code == 400
    assert "allowed" in (excinfo.value.details or {})


def test_binding_obligatorio_faltante_devuelve_invalid_bindings(settings: Settings) -> None:
    use_case = RunSparqlQueryUseCase(FakeRunner(), settings)
    with pytest.raises(DomainError) as excinfo:
        use_case.execute("municipalities_by_province", {})
    assert excinfo.value.code == "INVALID_BINDINGS"
    assert (excinfo.value.details or {}).get("binding") == "province_code"


def test_binding_tipo_incorrecto(settings: Settings) -> None:
    use_case = RunSparqlQueryUseCase(FakeRunner(), settings)
    with pytest.raises(DomainError) as excinfo:
        use_case.execute("top_scores_by_profile", {"profile_id": "p", "limit": "mucho"})
    assert excinfo.value.code == "INVALID_BINDINGS"
    assert (excinfo.value.details or {}).get("binding") == "limit"


def test_count_triples_devuelve_filas_ordenadas_desc(settings: Settings) -> None:
    runner = FakeRunner(counts_result={"urn:a": 1, "urn:b": 3, "urn:c": 2})
    use_case = RunSparqlQueryUseCase(runner, settings)
    result = use_case.execute("count_triples_by_class")
    totals = [row["total"] for row in result.rows]
    assert totals == sorted(totals, reverse=True)


def test_indicator_definition_vacia_no_devuelve_filas(settings: Settings) -> None:
    runner = FakeRunner(definition_result={})
    use_case = RunSparqlQueryUseCase(runner, settings)
    result = use_case.execute("indicator_definition", {"indicator_code": "x"})
    assert result.rows == []


def test_elapsed_ms_no_negativo(settings: Settings) -> None:
    use_case = RunSparqlQueryUseCase(FakeRunner(), settings)
    result = use_case.execute("count_triples_by_class")
    assert result.elapsed_ms >= 0
