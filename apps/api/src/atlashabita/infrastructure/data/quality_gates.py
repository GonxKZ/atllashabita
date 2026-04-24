"""Validaciones tabulares y orquestadores por tipo de dataset.

Las funciones puras (``check_*``) son bloques reutilizables: dado un iterable de
filas (``Mapping`` de columna a valor) comprueban una única invariante y
producen una tupla de :class:`ValidationIssue`. Los orquestadores
(``validate_*``) combinan esos bloques para construir un
:class:`QualityReport` global por dataset.

Cada issue lleva su ``severity`` (``critical`` detiene el pipeline,
``warning`` lo degrada, ``info`` aporta contexto) y un diccionario de detalles
con evidencia (fila afectada, valor, umbral).

Las invariantes cubren la sección 6 de ``docs/12_INGESTA_ETL_ELT_Y_CALIDAD``:
columnas obligatorias, no nulos en claves, rangos, unicidad y cobertura
mínima. El módulo no depende de ``pandas``: el dataset seed es pequeño y
queremos cero coste de arranque.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

from atlashabita.infrastructure.ingestion import SeedDataset

Severity = Literal["critical", "warning", "info"]
Status = Literal["ok", "warning", "error"]
Row = Mapping[str, Any]

_INE_MUNICIPALITY_LENGTH = 5
_INE_PROVINCE_LENGTH = 2
_MIN_INDICATORS_PER_MUNICIPALITY = 4
_DEFAULT_COVERAGE_THRESHOLD = 0.95


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    """Hallazgo individual detectado por una regla de calidad."""

    severity: Severity
    rule: str
    message: str
    details: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Representación serializable (JSON friendly) del hallazgo."""
        payload = asdict(self)
        payload["details"] = dict(self.details)
        return payload


@dataclass(frozen=True, slots=True)
class QualityReport:
    """Informe agregado para un dataset concreto."""

    source: str
    generated_at_iso: str
    status: Status
    issues: tuple[ValidationIssue, ...]
    counters: Mapping[str, int]

    def to_dict(self) -> dict[str, Any]:
        """Representación serializable usada por :mod:`reporting`."""
        return {
            "source": self.source,
            "generated_at_iso": self.generated_at_iso,
            "status": self.status,
            "issues": [issue.to_dict() for issue in self.issues],
            "counters": dict(self.counters),
        }

    @property
    def critical_count(self) -> int:
        """Número de hallazgos críticos."""
        return sum(1 for issue in self.issues if issue.severity == "critical")

    @property
    def warning_count(self) -> int:
        """Número de advertencias."""
        return sum(1 for issue in self.issues if issue.severity == "warning")


# ---------------------------------------------------------------------------
# Reglas puras
# ---------------------------------------------------------------------------


def check_required_columns(
    rows: Sequence[Row], required: Iterable[str]
) -> tuple[ValidationIssue, ...]:
    """Verifica que todas las columnas obligatorias aparezcan en la primera fila.

    El contrato es estricto: si el dataset está vacío no hay columnas que
    comprobar y devolvemos un issue ``warning`` para advertir al operador.
    """
    required_tuple = tuple(required)
    if not rows:
        return (
            ValidationIssue(
                severity="warning",
                rule="required_columns",
                message="El dataset está vacío; no hay columnas que validar.",
                details={"required": list(required_tuple)},
            ),
        )
    first = rows[0]
    missing = [column for column in required_tuple if column not in first]
    if not missing:
        return ()
    return (
        ValidationIssue(
            severity="critical",
            rule="required_columns",
            message=f"Faltan columnas obligatorias: {missing}",
            details={"missing": missing, "required": list(required_tuple)},
        ),
    )


def check_no_nulls_in_keys(rows: Sequence[Row], keys: Iterable[str]) -> tuple[ValidationIssue, ...]:
    """Detecta valores nulos o cadenas vacías en columnas clave."""
    keys_tuple = tuple(keys)
    issues: list[ValidationIssue] = []
    for index, row in enumerate(rows, start=1):
        for key in keys_tuple:
            value = row.get(key)
            if value is None or (isinstance(value, str) and not value.strip()):
                issues.append(
                    ValidationIssue(
                        severity="critical",
                        rule="no_nulls_in_keys",
                        message=f"Valor nulo en columna clave {key!r} (fila {index}).",
                        details={"row": index, "column": key},
                    )
                )
    return tuple(issues)


def check_values_in_range(
    rows: Sequence[Row],
    column: str,
    min_v: float | None,
    max_v: float | None,
) -> tuple[ValidationIssue, ...]:
    """Comprueba que ``column`` se mantenga dentro de ``[min_v, max_v]``.

    Los extremos son opcionales: ``None`` desactiva la cota correspondiente.
    Valores no numéricos se reportan como críticos.
    """
    issues: list[ValidationIssue] = []
    for index, row in enumerate(rows, start=1):
        raw = row.get(column)
        if raw is None:
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            issues.append(
                ValidationIssue(
                    severity="critical",
                    rule="values_in_range",
                    message=(f"Valor no numérico en {column!r} fila {index}: {raw!r}"),
                    details={"row": index, "column": column, "value": raw},
                )
            )
            continue
        if min_v is not None and value < min_v:
            issues.append(
                ValidationIssue(
                    severity="warning",
                    rule="values_in_range",
                    message=(
                        f"Valor {value} por debajo del mínimo {min_v} en {column!r} fila {index}."
                    ),
                    details={
                        "row": index,
                        "column": column,
                        "value": value,
                        "min": min_v,
                    },
                )
            )
        if max_v is not None and value > max_v:
            issues.append(
                ValidationIssue(
                    severity="warning",
                    rule="values_in_range",
                    message=(
                        f"Valor {value} por encima del máximo {max_v} en {column!r} fila {index}."
                    ),
                    details={
                        "row": index,
                        "column": column,
                        "value": value,
                        "max": max_v,
                    },
                )
            )
    return tuple(issues)


def check_unique_key(rows: Sequence[Row], keys: Iterable[str]) -> tuple[ValidationIssue, ...]:
    """Garantiza que la tupla ``keys`` sea única en el conjunto de filas."""
    keys_tuple = tuple(keys)
    counter: Counter[tuple[Any, ...]] = Counter(
        tuple(row.get(key) for key in keys_tuple) for row in rows
    )
    duplicates = [key for key, count in counter.items() if count > 1]
    if not duplicates:
        return ()
    return tuple(
        ValidationIssue(
            severity="critical",
            rule="unique_key",
            message=(f"Clave duplicada {dict(zip(keys_tuple, duplicate, strict=True))}"),
            details={
                "keys": list(keys_tuple),
                "values": list(duplicate),
                "count": counter[duplicate],
            },
        )
        for duplicate in duplicates
    )


def check_coverage(
    actual: Iterable[str],
    expected: Iterable[str],
    threshold: float = _DEFAULT_COVERAGE_THRESHOLD,
) -> tuple[ValidationIssue, ...]:
    """Evalúa la ratio ``|actual ∩ expected| / |expected|``.

    - Si ``expected`` está vacío la cobertura se considera ``1.0``.
    - Si la ratio cae por debajo de ``threshold`` emite ``critical``.
    """
    expected_set = {value for value in expected if value}
    actual_set = {value for value in actual if value}
    if not expected_set:
        return ()
    ratio = len(expected_set & actual_set) / len(expected_set)
    if ratio >= threshold:
        return ()
    missing = sorted(expected_set - actual_set)
    return (
        ValidationIssue(
            severity="critical",
            rule="coverage",
            message=(f"Cobertura {ratio:.2%} por debajo del umbral {threshold:.2%}."),
            details={
                "ratio": ratio,
                "threshold": threshold,
                "missing": missing,
                "expected_total": len(expected_set),
                "actual_total": len(actual_set),
            },
        ),
    )


# ---------------------------------------------------------------------------
# Orquestadores por dataset
# ---------------------------------------------------------------------------


def _timestamp_iso() -> str:
    """ISO 8601 en UTC con precisión de segundos."""
    return datetime.now(tz=UTC).replace(microsecond=0).isoformat()


def _status_from_issues(issues: Iterable[ValidationIssue]) -> Status:
    """Derivación del estado global a partir de las severidades."""
    severities = {issue.severity for issue in issues}
    if "critical" in severities:
        return "error"
    if "warning" in severities:
        return "warning"
    return "ok"


def _observations_as_rows(dataset: SeedDataset) -> list[dict[str, Any]]:
    """Proyecta las observaciones del dataset como filas homogéneas."""
    return [
        {
            "indicator_code": obs.indicator_code,
            "territory_id": obs.territory_id,
            "period": obs.period,
            "value": obs.value,
            "source_id": obs.source_id,
            "quality": obs.quality,
        }
        for obs in dataset.observations
    ]


def _territories_as_rows(dataset: SeedDataset) -> list[dict[str, Any]]:
    """Proyecta los territorios del dataset como filas homogéneas."""
    return [
        {
            "kind": territory.kind.value,
            "code": territory.code,
            "name": territory.name,
            "parent_code": territory.parent_code,
            "province_code": territory.province_code,
            "autonomous_community_code": territory.autonomous_community_code,
        }
        for territory in dataset.territories
    ]


def _sources_as_rows(dataset: SeedDataset) -> list[dict[str, Any]]:
    """Proyecta las fuentes del dataset como filas homogéneas."""
    return [
        {
            "id": source.id,
            "title": source.title,
            "publisher": source.publisher,
            "url": source.url,
            "license": source.license,
            "periodicity": source.periodicity,
            "description": source.description,
        }
        for source in dataset.sources
    ]


def validate_observations(dataset: SeedDataset) -> QualityReport:
    """Ejecuta el paquete completo de reglas sobre las observaciones.

    Reglas aplicadas:

    - columnas obligatorias
    - nulos en claves (``indicator_code``, ``territory_id``, ``period``,
      ``source_id``)
    - rangos por indicador usando ``min_value``/``max_value``
    - unicidad ``(indicator_code, territory_id, period)``
    - cobertura mínima: cada municipio debe aparecer en al menos 4 indicadores.
    """
    rows = _observations_as_rows(dataset)
    issues: list[ValidationIssue] = []
    issues.extend(
        check_required_columns(
            rows,
            ("indicator_code", "territory_id", "period", "value", "source_id"),
        )
    )
    issues.extend(
        check_no_nulls_in_keys(rows, ("indicator_code", "territory_id", "period", "source_id"))
    )
    issues.extend(check_unique_key(rows, ("indicator_code", "territory_id", "period")))

    indicator_index = {indicator.code: indicator for indicator in dataset.indicators}
    for indicator_code, indicator in indicator_index.items():
        indicator_rows = [row for row in rows if row["indicator_code"] == indicator_code]
        issues.extend(
            check_values_in_range(indicator_rows, "value", indicator.min_value, indicator.max_value)
        )

    indicators_by_territory: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        indicators_by_territory[row["territory_id"]].add(row["indicator_code"])

    for municipality in dataset.municipalities:
        indicator_count = len(indicators_by_territory.get(municipality.identifier, set()))
        if indicator_count < _MIN_INDICATORS_PER_MUNICIPALITY:
            issues.append(
                ValidationIssue(
                    severity="critical",
                    rule="minimum_indicator_coverage",
                    message=(
                        f"{municipality.identifier} tiene observaciones sólo de "
                        f"{indicator_count} indicadores (mínimo "
                        f"{_MIN_INDICATORS_PER_MUNICIPALITY})."
                    ),
                    details={
                        "territory_id": municipality.identifier,
                        "indicators": indicator_count,
                        "minimum": _MIN_INDICATORS_PER_MUNICIPALITY,
                    },
                )
            )

    counters = {
        "rows": len(rows),
        "indicators": len(indicator_index),
        "municipalities": len(dataset.municipalities),
        "issues": len(issues),
    }
    return QualityReport(
        source="observations",
        generated_at_iso=_timestamp_iso(),
        status=_status_from_issues(issues),
        issues=tuple(issues),
        counters=counters,
    )


def validate_territories(dataset: SeedDataset) -> QualityReport:
    """Comprueba integridad territorial: jerarquías y códigos INE."""
    rows = _territories_as_rows(dataset)
    issues: list[ValidationIssue] = []
    issues.extend(
        check_required_columns(
            rows,
            (
                "kind",
                "code",
                "name",
                "province_code",
                "autonomous_community_code",
            ),
        )
    )
    issues.extend(check_no_nulls_in_keys(rows, ("kind", "code", "name")))
    issues.extend(check_unique_key(rows, ("kind", "code")))

    for territory in dataset.municipalities:
        if not territory.province_code:
            issues.append(
                ValidationIssue(
                    severity="critical",
                    rule="territory_hierarchy",
                    message=(f"Municipio {territory.identifier} sin province_code."),
                    details={"territory_id": territory.identifier},
                )
            )
        if not territory.autonomous_community_code:
            issues.append(
                ValidationIssue(
                    severity="critical",
                    rule="territory_hierarchy",
                    message=(f"Municipio {territory.identifier} sin autonomous_community_code."),
                    details={"territory_id": territory.identifier},
                )
            )
        if not _is_valid_ine_code(territory.code, _INE_MUNICIPALITY_LENGTH):
            issues.append(
                ValidationIssue(
                    severity="critical",
                    rule="ine_code_format",
                    message=(
                        f"Código INE de municipio inválido: {territory.code!r} "
                        f"(se esperan {_INE_MUNICIPALITY_LENGTH} dígitos)."
                    ),
                    details={
                        "territory_id": territory.identifier,
                        "code": territory.code,
                        "expected_length": _INE_MUNICIPALITY_LENGTH,
                    },
                )
            )

    for province in dataset.provinces:
        if not _is_valid_ine_code(province.code, _INE_PROVINCE_LENGTH):
            issues.append(
                ValidationIssue(
                    severity="critical",
                    rule="ine_code_format",
                    message=(f"Código INE de provincia inválido: {province.code!r}."),
                    details={
                        "territory_id": province.identifier,
                        "code": province.code,
                        "expected_length": _INE_PROVINCE_LENGTH,
                    },
                )
            )

    counters = {
        "territories": len(rows),
        "municipalities": len(dataset.municipalities),
        "provinces": len(dataset.provinces),
        "autonomous_communities": len(dataset.autonomous_communities),
        "issues": len(issues),
    }
    return QualityReport(
        source="territories",
        generated_at_iso=_timestamp_iso(),
        status=_status_from_issues(issues),
        issues=tuple(issues),
        counters=counters,
    )


def validate_sources(dataset: SeedDataset) -> QualityReport:
    """Valida metadatos mínimos exigidos a cada fuente oficial."""
    rows = _sources_as_rows(dataset)
    issues: list[ValidationIssue] = []
    issues.extend(
        check_required_columns(
            rows,
            ("id", "title", "publisher", "url", "license", "periodicity"),
        )
    )
    issues.extend(
        check_no_nulls_in_keys(rows, ("id", "title", "publisher", "url", "license", "periodicity"))
    )
    issues.extend(check_unique_key(rows, ("id",)))

    for source in dataset.sources:
        if not source.url.startswith(("http://", "https://")):
            issues.append(
                ValidationIssue(
                    severity="critical",
                    rule="source_url_scheme",
                    message=(f"URL de fuente {source.id!r} sin esquema http/https: {source.url!r}"),
                    details={"source_id": source.id, "url": source.url},
                )
            )
        if not source.indicators:
            issues.append(
                ValidationIssue(
                    severity="warning",
                    rule="source_indicators",
                    message=f"Fuente {source.id!r} no declara indicadores.",
                    details={"source_id": source.id},
                )
            )

    counters = {
        "sources": len(rows),
        "issues": len(issues),
    }
    return QualityReport(
        source="sources",
        generated_at_iso=_timestamp_iso(),
        status=_status_from_issues(issues),
        issues=tuple(issues),
        counters=counters,
    )


# ---------------------------------------------------------------------------
# Utilidades privadas
# ---------------------------------------------------------------------------


def _is_valid_ine_code(code: str | None, expected_length: int) -> bool:
    """Un código INE válido tiene dígitos puros y la longitud esperada."""
    if not code:
        return False
    return len(code) == expected_length and code.isdigit()
