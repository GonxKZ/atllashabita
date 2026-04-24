"""Ejecución controlada de consultas SPARQL sobre el grafo AtlasHabita.

``SparqlRunner`` concentra las consultas que la MVP necesita exponer (ranking
aproximado, buscar municipios por provincia, obtener fuentes usadas, etc.) y
aplica **salvaguardas** antes de delegar en ``rdflib``:

* Bloquea comandos de escritura (``INSERT``, ``DELETE``, ``LOAD``...) cuando
  ``settings.sparql_allow_update`` es ``False``. Esto convierte al runner en
  un adaptador *read-only* seguro para exponer indirectamente vía API.
* Aplica un ``LIMIT`` defensivo usando ``settings.sparql_max_results`` para
  evitar respuestas gigantes que consuman memoria del proceso.
* Mantiene un timeout blando (``sparql_timeout_seconds``) cancelando la
  ejecución con una señal en hilos si la consulta se pasa.

Las consultas se mantienen en esta capa (no en el dominio) porque dependen
del vocabulario RDF y no tienen sentido fuera del grafo.
"""

from __future__ import annotations

import re
import threading
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any, Final, cast

from rdflib import Dataset, Graph, URIRef
from rdflib.query import Result
from rdflib.term import Node

from atlashabita.config import Settings
from atlashabita.infrastructure.rdf.namespaces import AH, AHR, DCT

#: Palabras clave de consultas que modifican el grafo.
_UPDATE_KEYWORDS: Final[tuple[str, ...]] = (
    "INSERT",
    "DELETE",
    "LOAD",
    "CLEAR",
    "CREATE",
    "DROP",
    "ADD",
    "MOVE",
    "COPY",
)

_UPDATE_PATTERN = re.compile(
    r"\b(?:" + "|".join(_UPDATE_KEYWORDS) + r")\b",
    flags=re.IGNORECASE,
)

_COMMENT_LINE_PATTERN = re.compile(r"#[^\n]*")


class SparqlUpdateForbiddenError(RuntimeError):
    """Se lanza cuando se intenta ejecutar una consulta de escritura prohibida."""


class SparqlTimeoutError(TimeoutError):
    """Se lanza cuando una consulta excede el timeout configurado."""


@dataclass(frozen=True, slots=True)
class SparqlRunner:
    """Ejecuta SPARQL sobre el grafo con salvaguardas de producción.

    Aunque la MVP solo usa ``rdflib`` en memoria, el diseño deja espacio para
    conectar en el futuro un triplestore externo: la API pública no expone
    detalles del backend, lo que permite sustituir la implementación sin
    romper a los consumidores.
    """

    graph: Graph | Dataset
    settings: Settings

    def top_scores_by_profile(
        self, profile_id: str, scope: str = "municipality", limit: int = 10
    ) -> list[dict[str, Any]]:
        """Ranking aproximado basado en observaciones (MVP).

        La MVP todavía no persiste ``ah:Score``. Se calcula una aproximación
        SPARQL que combina linealmente las observaciones ``2024``/``2025`` con
        los pesos del perfil, demostrando el modelo sin bloquearse en la
        persistencia de scores. Los valores devueltos están en escala [0, 100].
        """
        profile_uri = URIRef(f"{AHR}profile/{profile_id}")
        target_class = _scope_to_class(scope)
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX dct: <{DCT}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?territory ?label ?indicator ?value ?weight ?direction
        WHERE {{
          ?territory a <{target_class}> ;
                     rdfs:label ?label ;
                     ah:hasIndicatorObservation ?obs .
          ?obs ah:indicator ?indicator ;
               ah:value ?value .
          ?indicator ah:direction ?direction .
          <{profile_uri}> ah:hasContribution ?c .
          ?c ah:indicator ?indicator ;
             ah:weight ?weight .
        }}
        """
        rows = self._execute(query)
        aggregates: dict[str, dict[str, Any]] = {}
        for row in rows:
            territory = str(row["territory"])
            indicator = str(row["indicator"])
            value = float(str(row["value"]))
            weight = float(str(row["weight"]))
            direction = str(row["direction"])
            entry = aggregates.setdefault(
                territory,
                {
                    "territory": territory,
                    "label": str(row["label"]),
                    "score": 0.0,
                    "indicators": {},
                },
            )
            indicators = cast(dict[str, dict[str, Any]], entry["indicators"])
            if indicator in indicators:
                continue
            normalized = _normalize(value, direction)
            indicators[indicator] = {
                "indicator": indicator,
                "value": value,
                "weight": weight,
                "normalized": normalized,
            }
            entry["score"] = float(entry["score"]) + normalized * weight * 100.0

        results = sorted(
            aggregates.values(),
            key=lambda item: float(item["score"]),
            reverse=True,
        )
        capped_limit = max(1, min(limit, self.settings.sparql_max_results))
        return [
            {
                "territory": item["territory"],
                "label": item["label"],
                "score": round(float(item["score"]), 2),
                "contributions": sorted(
                    (dict(v) for v in cast(dict[str, Any], item["indicators"]).values()),
                    key=lambda c: c["indicator"],
                ),
            }
            for item in results[:capped_limit]
        ]

    def municipalities_by_province(self, province_code: str) -> list[dict[str, Any]]:
        """Lista los municipios pertenecientes a una provincia."""
        province_uri = URIRef(f"{AHR}territory/province/{province_code}")
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX dct: <{DCT}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?municipality ?label ?code
        WHERE {{
          ?municipality a ah:Municipality ;
                        rdfs:label ?label ;
                        dct:identifier ?code ;
                        ah:belongsTo <{province_uri}> .
        }}
        ORDER BY ?label
        """
        return [
            {
                "municipality": str(row["municipality"]),
                "label": str(row["label"]),
                "code": str(row["code"]),
            }
            for row in self._execute(query)
        ]

    def indicators_for_territory(self, territory_id: str) -> list[dict[str, Any]]:
        """Observaciones indicadoras asociadas a un territorio concreto."""
        territory_uri = _territory_uri_from_id(territory_id)
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX dct: <{DCT}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?indicator ?label ?value ?unit ?period ?quality
        WHERE {{
          <{territory_uri}> ah:hasIndicatorObservation ?obs .
          ?obs ah:indicator ?indicator ;
               ah:value ?value ;
               ah:period ?period ;
               ah:qualityFlag ?quality .
          ?indicator rdfs:label ?label ;
                     ah:unit ?unit .
        }}
        ORDER BY ?label
        """
        return [
            {
                "indicator": str(row["indicator"]),
                "label": str(row["label"]),
                "value": float(str(row["value"])),
                "unit": str(row["unit"]),
                "period": str(row["period"]),
                "quality": str(row["quality"]),
            }
            for row in self._execute(query)
        ]

    def sources_used_by_territory(self, territory_id: str) -> list[dict[str, Any]]:
        """Fuentes cuyas observaciones tocan un territorio."""
        territory_uri = _territory_uri_from_id(territory_id)
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX dct: <{DCT}>

        SELECT DISTINCT ?source ?title ?license ?periodicity
        WHERE {{
          <{territory_uri}> ah:hasIndicatorObservation ?obs .
          ?obs ah:providedBy ?source .
          ?source dct:title ?title ;
                  ah:license ?license ;
                  ah:periodicity ?periodicity .
        }}
        ORDER BY ?title
        """
        return [
            {
                "source": str(row["source"]),
                "title": str(row["title"]),
                "license": str(row["license"]),
                "periodicity": str(row["periodicity"]),
            }
            for row in self._execute(query)
        ]

    def indicator_definition(self, indicator_code: str) -> dict[str, Any]:
        """Metadatos de la definición de un indicador."""
        indicator_uri = URIRef(f"{AHR}indicator/{indicator_code}")
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX dct: <{DCT}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?label ?description ?unit ?direction
        WHERE {{
          <{indicator_uri}> rdfs:label ?label ;
                            dct:description ?description ;
                            ah:unit ?unit ;
                            ah:direction ?direction .
        }}
        LIMIT 1
        """
        rows = self._execute(query)
        if not rows:
            return {}
        row = rows[0]
        return {
            "indicator": str(indicator_uri),
            "label": str(row["label"]),
            "description": str(row["description"]),
            "unit": str(row["unit"]),
            "direction": str(row["direction"]),
        }

    def count_triples_by_class(self) -> dict[str, int]:
        """Cuenta instancias por clase RDF.

        Consulta de diagnóstico útil para verificar en tests/manifiestos que
        el grafo contiene las cantidades esperadas por clase tras la carga.
        """
        query = """
        SELECT ?class (COUNT(?s) AS ?total)
        WHERE {
          ?s a ?class .
        }
        GROUP BY ?class
        ORDER BY DESC(?total)
        """
        return {str(row["class"]): int(str(row["total"])) for row in self._execute(query)}

    def _execute(self, query: str) -> list[dict[str, Node]]:
        """Ejecuta la consulta con salvaguardas.

        Compila la consulta tras:

        1. Validar que no sea una mutación no autorizada.
        2. Añadir ``LIMIT`` defensivo si falta.
        3. Ejecutar en un hilo con timeout blando para evitar consultas
           patológicas que bloqueen el proceso.
        """
        self._ensure_read_only(query)
        bounded_query = self._apply_default_limit(query)
        result = self._run_with_timeout(bounded_query)
        return _rows_to_dicts(result)

    def _ensure_read_only(self, query: str) -> None:
        if self.settings.sparql_allow_update:
            return
        sanitized = _COMMENT_LINE_PATTERN.sub(" ", query)
        if _UPDATE_PATTERN.search(sanitized):
            raise SparqlUpdateForbiddenError(
                "Las consultas de escritura están desactivadas (sparql_allow_update=False)."
            )

    def _apply_default_limit(self, query: str) -> str:
        """Añade un ``LIMIT`` si la consulta no define uno propio.

        Se inspecciona sólo para ``SELECT``; ``CONSTRUCT``/``ASK`` tienen
        semántica distinta y no necesitan tope numérico.
        """
        upper = query.upper()
        if " SELECT " not in f" {upper}" and not upper.strip().startswith("SELECT"):
            return query
        if re.search(r"\bLIMIT\b", upper):
            return query
        return f"{query.rstrip()}\nLIMIT {self.settings.sparql_max_results}\n"

    def _run_with_timeout(self, query: str) -> Result:
        """Ejecuta la consulta en un hilo dedicado con timeout."""
        container: dict[str, Result | BaseException] = {}

        def worker() -> None:
            try:
                container["result"] = self.graph.query(query)
            except Exception as exc:
                # ``Exception`` captura errores de sintaxis/plan del motor
                # SPARQL sin atrapar ``KeyboardInterrupt`` ni ``SystemExit``.
                container["error"] = exc

        thread = threading.Thread(target=worker, name="sparql-runner", daemon=True)
        thread.start()
        thread.join(timeout=self.settings.sparql_timeout_seconds)
        if thread.is_alive():
            raise SparqlTimeoutError(
                f"La consulta SPARQL superó {self.settings.sparql_timeout_seconds}s."
            )
        if "error" in container:
            error = container["error"]
            if isinstance(error, BaseException):
                raise error
            raise RuntimeError(f"Error SPARQL no esperado: {error!r}")
        return cast(Result, container["result"])


def _rows_to_dicts(result: Result) -> list[dict[str, Node]]:
    """Convierte un ``Result`` de rdflib en filas ``dict`` uniformes.

    Se castea la fila a ``ResultRow`` para poder invocar ``asdict()``. rdflib
    también puede devolver tuplas/booleanos para otros tipos de consulta, pero
    este runner sólo emite ``SELECT`` por lo que la forma está garantizada.
    """
    variables: Iterable[str] = tuple(str(v) for v in (result.vars or ()))
    rows: list[dict[str, Node]] = []
    for row in result:
        row_dict = cast(Mapping[str, Node], cast(Any, row).asdict())
        rows.append(
            {variable: row_dict[variable] for variable in variables if variable in row_dict}
        )
    return rows


def _scope_to_class(scope: str) -> URIRef:
    mapping = {
        "municipality": AH.Municipality,
        "province": AH.Province,
        "autonomous_community": AH.AutonomousCommunity,
    }
    if scope not in mapping:
        raise ValueError(f"Scope SPARQL desconocido: {scope!r}")
    return cast(URIRef, mapping[scope])


def _territory_uri_from_id(territory_id: str) -> URIRef:
    """Convierte ``municipality:41091`` al URIRef canónico."""
    try:
        kind, code = territory_id.split(":", maxsplit=1)
    except ValueError as exc:
        raise ValueError(f"territory_id inválido: {territory_id!r}") from exc
    return URIRef(f"{AHR}territory/{kind}/{code}")


def _normalize(value: float, direction: str) -> float:
    """Normaliza a [0, 1] usando heurísticas simples por dirección.

    Para la MVP basta con una función monotónica conservadora: ``min(value, 1)``
    si es porcentaje o índice; si el indicador es "lower is better" se invierte
    con ``max(0, 1 - value / 100)``. El motor real de scoring sustituirá estas
    heurísticas, pero para el ejemplo SPARQL son suficientes.
    """
    if direction == "lower_is_better":
        if value <= 0:
            return 1.0
        return max(0.0, min(1.0, 1.0 - value / 25.0))
    if value <= 0:
        return 0.0
    if value <= 1:
        return value
    if value <= 100:
        return value / 100.0
    # Ej: renta per cápita en EUR. Se comprime contra 50k como techo razonable.
    return max(0.0, min(1.0, value / 50_000.0))


__all__ = [
    "SparqlRunner",
    "SparqlTimeoutError",
    "SparqlUpdateForbiddenError",
]
