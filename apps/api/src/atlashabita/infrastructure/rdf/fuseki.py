"""Adaptador SPARQL contra un servidor Apache Jena Fuseki.

El runner expone la misma superficie que :class:`SparqlRunner` (en memoria) para
permitir el intercambio transparente desde el router HTTP. Internamente:

* Usa ``httpx.Client`` con timeout configurable para hablar con el endpoint
  ``/<dataset>/query`` en ``application/sparql-query``. El formato de respuesta
  solicitado es ``application/sparql-results+json`` (el estándar W3C SPARQL
  1.1 Query Results JSON Format) porque es trivial de parsear y no depende de
  librerías adicionales.
* Construye las mismas plantillas SPARQL que el runner en memoria, delegando
  la validación de identificadores al mismo código (``_require_safe_*``) para
  no duplicar reglas de seguridad.
* Convierte los bindings al mismo shape de diccionarios que emite el runner
  local (:class:`SparqlRunner`) para que la capa HTTP no distinga el origen.

El adaptador no intenta ser un driver SPARQL general: cubre únicamente las
consultas del catálogo expuesto por la API.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Final, cast

import httpx

from atlashabita.config import Settings
from atlashabita.infrastructure.rdf.namespaces import AH, AHR, DCT
from atlashabita.infrastructure.rdf.sparql_queries import (
    _require_safe_identifier,
    _require_safe_territory_id,
    _scope_to_class,
)

_SPARQL_RESULTS_JSON: Final[str] = "application/sparql-results+json"
_SPARQL_QUERY_MIME: Final[str] = "application/sparql-query"

#: Conjunto de namespaces canónicos que precede a cada query.
_PREFIXES: Final[str] = (
    f"PREFIX ah: <{AH}>\n"
    f"PREFIX dct: <{DCT}>\n"
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n"
)


class FusekiRequestError(RuntimeError):
    """Error al comunicar con el servidor Fuseki.

    Se levanta ante códigos HTTP 4xx/5xx o respuestas no parseables. El mensaje
    de error sólo incluye el código HTTP y el primer fragmento textual del
    cuerpo para evitar filtrar información sensible.
    """


@dataclass(frozen=True, slots=True)
class FusekiSparqlRunner:
    """Implementación de ``SparqlRunnerProtocol`` para Fuseki.

    Los métodos devuelven ``list[dict[str, Any]]`` con las mismas claves que
    la versión en memoria. El ``settings`` se usa para resolver la URL y el
    timeout, pero la autenticación (si se necesita) queda fuera: Fuseki
    soporta Basic Auth vía ``httpx`` y puede añadirse en el constructor del
    cliente por el caller.
    """

    settings: Settings
    client: httpx.Client

    # ------------------------------------------------------------------
    # Construcción de URL
    # ------------------------------------------------------------------
    def _query_url(self) -> str:
        base = self.settings.fuseki_base_url.rstrip("/")
        dataset = self.settings.fuseki_dataset.strip("/")
        return f"{base}/{dataset}/query"

    # ------------------------------------------------------------------
    # Consultas del catálogo
    # ------------------------------------------------------------------
    def top_scores_by_profile(
        self, profile_id: str, scope: str = "municipality", limit: int = 10
    ) -> list[dict[str, Any]]:
        """Ranking aproximado basado en observaciones del grafo remoto."""
        _require_safe_identifier(profile_id, field="profile_id")
        target_class = _scope_to_class(scope)
        profile_uri = f"{AHR}profile/{profile_id}"
        query = (
            _PREFIXES
            + f"""
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
            LIMIT {int(self.settings.sparql_max_results)}
            """
        )
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

        capped = max(1, min(int(limit), self.settings.sparql_max_results))
        ordered = sorted(aggregates.values(), key=lambda item: float(item["score"]), reverse=True)
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
            for item in ordered[:capped]
        ]

    def municipalities_by_province(self, province_code: str) -> list[dict[str, Any]]:
        _require_safe_identifier(province_code, field="province_code")
        province_uri = f"{AHR}territory/province/{province_code}"
        query = (
            _PREFIXES
            + f"""
            SELECT ?municipality ?label ?code
            WHERE {{
              ?municipality a ah:Municipality ;
                            rdfs:label ?label ;
                            dct:identifier ?code ;
                            ah:belongsTo <{province_uri}> .
            }}
            ORDER BY ?label
            LIMIT {int(self.settings.sparql_max_results)}
            """
        )
        return [
            {
                "municipality": str(row["municipality"]),
                "label": str(row["label"]),
                "code": str(row["code"]),
            }
            for row in self._execute(query)
        ]

    def indicators_for_territory(self, territory_id: str) -> list[dict[str, Any]]:
        territory_uri = self._territory_uri_from_id(territory_id)
        query = (
            _PREFIXES
            + f"""
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
            LIMIT {int(self.settings.sparql_max_results)}
            """
        )
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
        territory_uri = self._territory_uri_from_id(territory_id)
        query = (
            _PREFIXES
            + f"""
            SELECT DISTINCT ?source ?title ?license ?periodicity
            WHERE {{
              <{territory_uri}> ah:hasIndicatorObservation ?obs .
              ?obs ah:providedBy ?source .
              ?source dct:title ?title ;
                      ah:license ?license ;
                      ah:periodicity ?periodicity .
            }}
            ORDER BY ?title
            LIMIT {int(self.settings.sparql_max_results)}
            """
        )
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
        _require_safe_identifier(indicator_code, field="indicator_code")
        indicator_uri = f"{AHR}indicator/{indicator_code}"
        query = (
            _PREFIXES
            + f"""
            SELECT ?label ?description ?unit ?direction
            WHERE {{
              <{indicator_uri}> rdfs:label ?label ;
                                dct:description ?description ;
                                ah:unit ?unit ;
                                ah:direction ?direction .
            }}
            LIMIT 1
            """
        )
        rows = self._execute(query)
        if not rows:
            return {}
        row = rows[0]
        return {
            "indicator": indicator_uri,
            "label": str(row["label"]),
            "description": str(row["description"]),
            "unit": str(row["unit"]),
            "direction": str(row["direction"]),
        }

    def count_triples_by_class(self) -> dict[str, int]:
        query = (
            _PREFIXES
            + f"""
            SELECT ?class (COUNT(?s) AS ?total)
            WHERE {{
              ?s a ?class .
            }}
            GROUP BY ?class
            ORDER BY DESC(?total)
            LIMIT {int(self.settings.sparql_max_results)}
            """
        )
        return {str(row["class"]): int(str(row["total"])) for row in self._execute(query)}

    # ------------------------------------------------------------------
    # Internos
    # ------------------------------------------------------------------
    def _execute(self, query: str) -> list[dict[str, str]]:
        """Envía la consulta al servidor y normaliza la respuesta JSON."""
        try:
            response = self.client.post(
                self._query_url(),
                content=query.encode("utf-8"),
                headers={
                    "Accept": _SPARQL_RESULTS_JSON,
                    "Content-Type": _SPARQL_QUERY_MIME,
                },
                timeout=self.settings.sparql_timeout_seconds,
            )
        except httpx.HTTPError as exc:
            raise FusekiRequestError(f"Error HTTP hablando con Fuseki: {exc!r}") from exc
        if response.status_code >= 400:
            snippet = response.text[:200]
            raise FusekiRequestError(f"Fuseki respondió {response.status_code}: {snippet}")
        try:
            payload = response.json()
        except ValueError as exc:  # pragma: no cover — defensivo
            raise FusekiRequestError("Respuesta de Fuseki no era JSON válido.") from exc
        return _rows_from_sparql_json(payload)

    @staticmethod
    def _territory_uri_from_id(territory_id: str) -> str:
        _require_safe_territory_id(territory_id)
        kind, code = territory_id.split(":", maxsplit=1)
        return f"{AHR}territory/{kind}/{code}"


def _rows_from_sparql_json(payload: Mapping[str, Any]) -> list[dict[str, str]]:
    """Extrae las filas del formato SPARQL Results JSON."""
    results = payload.get("results", {}) if isinstance(payload, Mapping) else {}
    bindings = results.get("bindings", []) if isinstance(results, Mapping) else []
    rows: list[dict[str, str]] = []
    for row in bindings:
        if not isinstance(row, Mapping):
            continue
        clean: dict[str, str] = {}
        for key, binding in row.items():
            if isinstance(binding, Mapping) and "value" in binding:
                clean[str(key)] = str(binding["value"])
        rows.append(clean)
    return rows


def _normalize(value: float, direction: str) -> float:
    """Replica la normalización del runner en memoria (heurística MVP)."""
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
    return max(0.0, min(1.0, value / 50_000.0))


__all__ = ["FusekiRequestError", "FusekiSparqlRunner"]
