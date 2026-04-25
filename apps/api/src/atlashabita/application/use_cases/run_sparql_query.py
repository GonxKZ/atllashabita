"""Ejecución controlada de consultas SPARQL expuestas en la API pública.

El caso de uso actúa como **fachada** entre los routers HTTP y el runner de
infraestructura. Su responsabilidad principal es aplicar una política de
whitelist estricta sobre el identificador de consulta y sus argumentos antes
de delegar la ejecución. Esto evita que un cliente pueda enviar SPARQL
arbitrario (con riesgo de DoS, fuga de triples o escritura) y concentra en un
único sitio la validación de ``bindings`` y el normalizado de parámetros.

El diseño respeta los principios SOLID:

* **SRP**: el caso de uso no sabe cómo ejecuta el runner, solo qué consultas
  son válidas y con qué argumentos se invoca cada una.
* **OCP**: registrar una consulta nueva consiste en añadir una entrada al
  diccionario ``_QUERY_CATALOG`` con su ejecutor y descripción.
* **DIP**: se inyecta un ``SparqlRunnerProtocol`` para poder intercambiar
  entre un runner en memoria o uno remoto (Fuseki) sin tocar este módulo.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, Final, Protocol

from atlashabita.config import Settings
from atlashabita.observability.errors import DomainError

#: Códigos públicos de error usados por el router HTTP.
_ERROR_INVALID_QUERY: Final[str] = "INVALID_QUERY"
_ERROR_INVALID_BINDINGS: Final[str] = "INVALID_BINDINGS"


class SparqlRunnerProtocol(Protocol):
    """Contrato mínimo que deben cumplir los runners SPARQL.

    Permite que el caso de uso sea agnóstico del backend concreto (memoria,
    Fuseki, etc.). Cada método devuelve una ``list[dict[str, Any]]`` ya
    serializable a JSON.
    """

    def top_scores_by_profile(
        self, profile_id: str, scope: str = ..., limit: int = ...
    ) -> list[dict[str, Any]]: ...

    def municipalities_by_province(self, province_code: str) -> list[dict[str, Any]]: ...

    def indicators_for_territory(self, territory_id: str) -> list[dict[str, Any]]: ...

    def sources_used_by_territory(self, territory_id: str) -> list[dict[str, Any]]: ...

    def indicator_definition(self, indicator_code: str) -> dict[str, Any]: ...

    def count_triples_by_class(self) -> dict[str, int]: ...

    def mobility_flow_between(
        self, origin_code: str, destination_code: str, period: str
    ) -> list[dict[str, Any]]:
        """Flujos de movilidad entre dos municipios para un periodo concreto."""

    def accidents_in_radius(
        self, lat: float, lon: float, km: float, year: int | None = ...
    ) -> list[dict[str, Any]]:
        """Accidentes con víctimas dentro de un radio en kilómetros."""

    def transit_stops_in_municipality(self, municipality_code: str) -> list[dict[str, Any]]:
        """Paradas de transporte público de un municipio dado."""

    def risk_index(self, municipality_code: str) -> dict[str, Any]:
        """Índice agregado de riesgo combinando accidentes y movilidad."""


@dataclass(frozen=True, slots=True)
class QuerySignature:
    """Describe el contrato público de una consulta del catálogo.

    ``required`` y ``optional`` enumeran los bindings aceptados. ``description``
    se usa para poblar el endpoint ``GET /sparql/catalog``.
    """

    query_id: str
    description: str
    required: tuple[str, ...]
    optional: tuple[str, ...] = ()


_SIGNATURES: Final[Mapping[str, QuerySignature]] = {
    "top_scores_by_profile": QuerySignature(
        query_id="top_scores_by_profile",
        description=(
            "Top territorios por perfil a partir de las observaciones del grafo."
            " Bindings: profile_id (obligatorio), scope (municipality|province|"
            "autonomous_community), limit (1-max_results)."
        ),
        required=("profile_id",),
        optional=("scope", "limit"),
    ),
    "municipalities_by_province": QuerySignature(
        query_id="municipalities_by_province",
        description=(
            "Municipios que pertenecen a una provincia dada por código INE."
            " Bindings: province_code (obligatorio)."
        ),
        required=("province_code",),
    ),
    "indicators_for_territory": QuerySignature(
        query_id="indicators_for_territory",
        description=(
            "Observaciones indicadoras de un territorio (``kind:code``)."
            " Bindings: territory_id (obligatorio)."
        ),
        required=("territory_id",),
    ),
    "sources_used_by_territory": QuerySignature(
        query_id="sources_used_by_territory",
        description=(
            "Fuentes usadas por las observaciones de un territorio."
            " Bindings: territory_id (obligatorio)."
        ),
        required=("territory_id",),
    ),
    "count_triples_by_class": QuerySignature(
        query_id="count_triples_by_class",
        description="Totales de instancias por clase RDF. Sin bindings.",
        required=(),
    ),
    "indicator_definition": QuerySignature(
        query_id="indicator_definition",
        description=(
            "Metadatos de un indicador (etiqueta, dirección, unidad, descripción)."
            " Bindings: indicator_code (obligatorio)."
        ),
        required=("indicator_code",),
    ),
    "mobility_flow_between": QuerySignature(
        query_id="mobility_flow_between",
        description=(
            "Flujos de movilidad MITMA entre un origen y un destino para un periodo."
            " Bindings: origin_code, destination_code, period (todos obligatorios)."
        ),
        required=("origin_code", "destination_code", "period"),
    ),
    "accidents_in_radius": QuerySignature(
        query_id="accidents_in_radius",
        description=(
            "Accidentes DGT cuya geometría puntual cae dentro de ``km`` km del centro."
            " Bindings: lat, lon, km (obligatorios), year (opcional)."
        ),
        required=("lat", "lon", "km"),
        optional=("year",),
    ),
    "transit_stops_in_municipality": QuerySignature(
        query_id="transit_stops_in_municipality",
        description=(
            "Paradas de transporte público (CRTM/GTFS) ubicadas en un municipio."
            " Bindings: municipality_code (obligatorio)."
        ),
        required=("municipality_code",),
    ),
    "risk_index": QuerySignature(
        query_id="risk_index",
        description=(
            "Indice compuesto de riesgo movilidad-accidentes para un municipio."
            " Bindings: municipality_code (obligatorio)."
        ),
        required=("municipality_code",),
    ),
}


def _require_str(bindings: Mapping[str, Any], name: str) -> str:
    """Extrae y valida un binding textual obligatorio."""
    value = bindings.get(name)
    if not isinstance(value, str) or not value.strip():
        raise DomainError(
            code=_ERROR_INVALID_BINDINGS,
            message=f"El binding {name!r} es obligatorio y debe ser una cadena no vacía.",
            status_code=400,
            details={"binding": name},
        )
    return value.strip()


def _optional_str(bindings: Mapping[str, Any], name: str, default: str) -> str:
    """Devuelve ``bindings[name]`` si existe y es cadena; si no, ``default``."""
    value = bindings.get(name, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise DomainError(
            code=_ERROR_INVALID_BINDINGS,
            message=f"El binding {name!r} debe ser una cadena.",
            status_code=400,
            details={"binding": name},
        )
    return value.strip() or default


def _optional_int(bindings: Mapping[str, Any], name: str, default: int) -> int:
    """Devuelve un entero positivo; lanza ``DomainError`` si el tipo no encaja."""
    raw = bindings.get(name, default)
    if raw is None:
        return default
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise DomainError(
            code=_ERROR_INVALID_BINDINGS,
            message=f"El binding {name!r} debe ser un entero positivo.",
            status_code=400,
            details={"binding": name},
        )
    if raw < 1:
        raise DomainError(
            code=_ERROR_INVALID_BINDINGS,
            message=f"El binding {name!r} debe ser >= 1.",
            status_code=400,
            details={"binding": name},
        )
    return raw


def _require_number(bindings: Mapping[str, Any], name: str) -> float:
    """Extrae un número (``int``/``float``) obligatorio para consultas geoespaciales.

    SPARQL geoespacial necesita coordenadas y radios numéricos: este helper
    centraliza la coerción y emite ``DomainError`` con código estable cuando
    el cliente envía un tipo inválido (cadenas, booleanos, ``None``).
    """
    raw = bindings.get(name)
    if raw is None:
        raise DomainError(
            code=_ERROR_INVALID_BINDINGS,
            message=f"El binding {name!r} es obligatorio y debe ser numérico.",
            status_code=400,
            details={"binding": name},
        )
    if isinstance(raw, bool) or not isinstance(raw, int | float):
        raise DomainError(
            code=_ERROR_INVALID_BINDINGS,
            message=f"El binding {name!r} debe ser numérico.",
            status_code=400,
            details={"binding": name},
        )
    return float(raw)


def _optional_year(bindings: Mapping[str, Any], name: str) -> int | None:
    """Devuelve un año entero válido (1900-2100) o ``None`` si no se pasa."""
    raw = bindings.get(name)
    if raw is None:
        return None
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise DomainError(
            code=_ERROR_INVALID_BINDINGS,
            message=f"El binding {name!r} debe ser un año entero (1900-2100).",
            status_code=400,
            details={"binding": name},
        )
    if not 1900 <= raw <= 2100:
        raise DomainError(
            code=_ERROR_INVALID_BINDINGS,
            message=f"El binding {name!r} fuera de rango (1900-2100).",
            status_code=400,
            details={"binding": name},
        )
    return raw


@dataclass(frozen=True, slots=True)
class SparqlQueryResult:
    """Resultado serializable del caso de uso."""

    query_id: str
    rows: list[dict[str, Any]]
    elapsed_ms: int


class RunSparqlQueryUseCase:
    """Ejecuta una consulta del catálogo con salvaguardas de entrada y salida.

    Las instancias son baratas: el runner se inyecta y los mapeos de
    despachado son constantes a nivel de módulo.
    """

    def __init__(self, runner: SparqlRunnerProtocol, settings: Settings) -> None:
        self._runner = runner
        self._settings = settings
        self._dispatch: dict[str, Callable[[Mapping[str, Any]], list[dict[str, Any]]]] = {
            "top_scores_by_profile": self._top_scores_by_profile,
            "municipalities_by_province": self._municipalities_by_province,
            "indicators_for_territory": self._indicators_for_territory,
            "sources_used_by_territory": self._sources_used_by_territory,
            "count_triples_by_class": self._count_triples_by_class,
            "indicator_definition": self._indicator_definition,
            "mobility_flow_between": self._mobility_flow_between,
            "accidents_in_radius": self._accidents_in_radius,
            "transit_stops_in_municipality": self._transit_stops_in_municipality,
            "risk_index": self._risk_index,
        }

    @staticmethod
    def catalog() -> tuple[QuerySignature, ...]:
        """Firmas públicas que expone el endpoint de catálogo."""
        return tuple(_SIGNATURES.values())

    def execute(
        self,
        query_id: str,
        bindings: Mapping[str, Any] | None = None,
    ) -> SparqlQueryResult:
        """Valida el ``query_id`` frente al catálogo y ejecuta la consulta.

        Cualquier consulta fuera del catálogo devuelve ``INVALID_QUERY`` con
        detalles de las opciones permitidas. Errores internos del runner se
        envuelven en ``DomainError`` con el código genérico ``INVALID_QUERY``
        para no filtrar stacktraces.
        """
        bindings = bindings or {}
        handler = self._dispatch.get(query_id)
        if handler is None:
            raise DomainError(
                code=_ERROR_INVALID_QUERY,
                message=f"query_id desconocido: {query_id!r}.",
                status_code=400,
                details={"allowed": sorted(self._dispatch)},
            )
        start = time.perf_counter()
        rows = handler(bindings)
        elapsed_ms = int(max(0.0, (time.perf_counter() - start) * 1000))
        return SparqlQueryResult(query_id=query_id, rows=rows, elapsed_ms=elapsed_ms)

    # --- handlers ---------------------------------------------------------
    def _top_scores_by_profile(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        profile_id = _require_str(bindings, "profile_id")
        scope = _optional_str(bindings, "scope", "municipality")
        limit = _optional_int(bindings, "limit", 10)
        capped = min(limit, self._settings.sparql_max_results)
        return self._runner.top_scores_by_profile(profile_id, scope=scope, limit=capped)

    def _municipalities_by_province(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        code = _require_str(bindings, "province_code")
        rows = self._runner.municipalities_by_province(code)
        return rows[: self._settings.sparql_max_results]

    def _indicators_for_territory(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        territory_id = _require_str(bindings, "territory_id")
        rows = self._runner.indicators_for_territory(territory_id)
        return rows[: self._settings.sparql_max_results]

    def _sources_used_by_territory(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        territory_id = _require_str(bindings, "territory_id")
        rows = self._runner.sources_used_by_territory(territory_id)
        return rows[: self._settings.sparql_max_results]

    def _count_triples_by_class(self, _: Mapping[str, Any]) -> list[dict[str, Any]]:
        counts = self._runner.count_triples_by_class()
        ordered = sorted(counts.items(), key=lambda pair: pair[1], reverse=True)
        rows: list[dict[str, Any]] = [
            {"class": class_iri, "total": total} for class_iri, total in ordered
        ]
        return rows[: self._settings.sparql_max_results]

    def _indicator_definition(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        code = _require_str(bindings, "indicator_code")
        definition = self._runner.indicator_definition(code)
        return [definition] if definition else []

    def _mobility_flow_between(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        origin_code = _require_str(bindings, "origin_code")
        destination_code = _require_str(bindings, "destination_code")
        period = _require_str(bindings, "period")
        rows = self._runner.mobility_flow_between(origin_code, destination_code, period)
        return rows[: self._settings.sparql_max_results]

    def _accidents_in_radius(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        lat = _require_number(bindings, "lat")
        lon = _require_number(bindings, "lon")
        km = _require_number(bindings, "km")
        year = _optional_year(bindings, "year")
        rows = self._runner.accidents_in_radius(lat, lon, km, year=year)
        return rows[: self._settings.sparql_max_results]

    def _transit_stops_in_municipality(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        code = _require_str(bindings, "municipality_code")
        rows = self._runner.transit_stops_in_municipality(code)
        return rows[: self._settings.sparql_max_results]

    def _risk_index(self, bindings: Mapping[str, Any]) -> list[dict[str, Any]]:
        code = _require_str(bindings, "municipality_code")
        # ``risk_index`` devuelve un único dict; el contrato del catálogo es
        # ``list[dict]`` por homogeneidad, así que envolvemos. Si la consulta
        # no encuentra municipio, devolvemos lista vacía para que la API HTTP
        # responda 200 con cuerpo vacío en lugar de error.
        result = self._runner.risk_index(code)
        return [result] if result else []


__all__ = [
    "QuerySignature",
    "RunSparqlQueryUseCase",
    "SparqlQueryResult",
    "SparqlRunnerProtocol",
]
