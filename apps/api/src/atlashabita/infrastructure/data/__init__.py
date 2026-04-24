"""Módulo de calidad y normalización de datos tabulares.

Agrupa los validadores puros que auditan el dataset seed (issue #9) y la
normalización territorial que unifica códigos INE, jerarquías y búsqueda
tolerante a tildes (issue #10). El módulo es deliberadamente delgado:

- ``quality_gates`` contiene funciones puras y un orquestador por dataset.
- ``normalizer`` ofrece una fachada reutilizable para CCAA, provincias y
  municipios.
- ``reporting`` serializa los informes de calidad como JSON en la zona
  ``reports``.
"""

from atlashabita.infrastructure.data.normalizer import TerritoryNormalizer
from atlashabita.infrastructure.data.quality_gates import (
    QualityReport,
    ValidationIssue,
    check_coverage,
    check_no_nulls_in_keys,
    check_required_columns,
    check_unique_key,
    check_values_in_range,
    validate_observations,
    validate_sources,
    validate_territories,
)
from atlashabita.infrastructure.data.reporting import write_quality_report

__all__ = [
    "QualityReport",
    "TerritoryNormalizer",
    "ValidationIssue",
    "check_coverage",
    "check_no_nulls_in_keys",
    "check_required_columns",
    "check_unique_key",
    "check_values_in_range",
    "validate_observations",
    "validate_sources",
    "validate_territories",
    "write_quality_report",
]
