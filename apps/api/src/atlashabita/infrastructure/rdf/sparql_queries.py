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

import math
import re
import threading
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any, Final, cast

from rdflib import Dataset, Graph, URIRef
from rdflib.query import Result
from rdflib.term import Node

from atlashabita.config import Settings
from atlashabita.infrastructure.rdf.namespaces import AH, AHR, DCT, GEO_WGS84, PROV

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

#: Patrón estricto para identificadores que se concatenan dentro de IRIs.
#:
#: Permitimos letras, dígitos, guiones, guiones bajos y puntos. No aceptamos
#: espacios, ``<``, ``>``, comillas ni corchetes que permitirían a un cliente
#: romper la IRI e inyectar tripletas adicionales en la consulta.
_SAFE_IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$")

#: Patrón para ``territory_id`` con el formato ``kind:code`` (5 dígitos INE).
_SAFE_TERRITORY_ID = re.compile(
    r"^(autonomous_community|province|municipality):[A-Za-z0-9_-]{1,16}$"
)

#: Patrón permisivo para periodos aceptados: anio (``2025``), anio+trimestre
#: (``2025Q2``), anio+mes (``2025-07``). Se usa para validar inputs antes de
#: interpolarlos en SPARQL y evitar inyección vía el segmento del periodo.
_SAFE_PERIOD = re.compile(r"^[0-9]{4}(?:Q[1-4]|-[0-1][0-9])?$")

#: Lat/lon/km se limitan a decimales razonables para blindar contra overflow
#: numérico y valores absurdamente grandes.
_MAX_RADIUS_KM: Final[float] = 1_000.0


def _require_safe_identifier(value: str, *, field: str) -> str:
    """Asegura que ``value`` sea un identificador seguro para interpolar en una IRI.

    Sin esta validación, un cliente podría enviar algo como
    ``"x> . DELETE WHERE { ?s ?p ?o . } #"`` y romper la consulta generada.
    Se lanza ``ValueError`` para que la capa HTTP lo convierta en un 400.
    """
    if not isinstance(value, str) or not _SAFE_IDENTIFIER.match(value):
        raise ValueError(f"{field} inválido: {value!r}")
    return value


def _require_safe_territory_id(value: str) -> str:
    """Valida ``kind:code`` antes de construir la URI del territorio."""
    if not isinstance(value, str) or not _SAFE_TERRITORY_ID.match(value):
        raise ValueError(f"territory_id inválido: {value!r}")
    return value


def _require_safe_period(value: str) -> str:
    """Valida un periodo (``2024``, ``2025Q2``, ``2025-07``) antes de usarlo."""
    if not isinstance(value, str) or not _SAFE_PERIOD.match(value):
        raise ValueError(f"period inválido: {value!r}")
    return value


def _require_coordinate(value: float, *, minimum: float, maximum: float, field: str) -> float:
    """Valida una coordenada numérica finita dentro del rango WGS84."""
    if not isinstance(value, int | float) or isinstance(value, bool):
        raise ValueError(f"{field} debe ser numérico: {value!r}")
    numeric = float(value)
    if not math.isfinite(numeric):
        raise ValueError(f"{field} no finito: {value!r}")
    if not minimum <= numeric <= maximum:
        raise ValueError(f"{field} fuera de rango [{minimum}, {maximum}]: {numeric}")
    return numeric


def _require_radius_km(value: float) -> float:
    """Valida un radio en km (> 0 y ≤ 1000)."""
    if not isinstance(value, int | float) or isinstance(value, bool):
        raise ValueError(f"radius_km debe ser numérico: {value!r}")
    numeric = float(value)
    if not math.isfinite(numeric) or numeric <= 0 or numeric > _MAX_RADIUS_KM:
        raise ValueError(f"radius_km fuera de rango (0, {_MAX_RADIUS_KM}]: {numeric}")
    return numeric


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
        _require_safe_identifier(profile_id, field="profile_id")
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
        _require_safe_identifier(province_code, field="province_code")
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
        _require_safe_identifier(indicator_code, field="indicator_code")
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

    def territories_within_radius(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        scope: str = "municipality",
    ) -> list[dict[str, Any]]:
        """Territorios cuyo centroide está dentro de ``radius_km`` del punto.

        Se recuperan los centroides WGS84 con SPARQL y la distancia se calcula
        en Python usando la fórmula de Haversine. Esto es un fallback portátil
        cuando el backend no implementa ``geof:distance``. En un despliegue
        Fuseki/Jena con GeoSPARQL la misma lista de URIs se puede obtener con
        ``FILTER(geof:distance(?g1, ?g2, units:metre) <= ?r)`` — pero la MVP
        prioriza ejecutar contra ``rdflib.Graph`` sin extensiones.

        Los resultados se ordenan por distancia ascendente y se recortan al
        ``sparql_max_results`` configurado para respetar los límites del runner.
        """
        _require_coordinate(lat, minimum=-90.0, maximum=90.0, field="lat")
        _require_coordinate(lon, minimum=-180.0, maximum=180.0, field="lon")
        _require_radius_km(radius_km)
        target_class = _scope_to_class(scope)
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX wgs84: <{GEO_WGS84}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dct: <{DCT}>

        SELECT ?territory ?label ?code ?lat ?lon
        WHERE {{
          ?territory a <{target_class}> ;
                     rdfs:label ?label ;
                     dct:identifier ?code ;
                     wgs84:lat ?lat ;
                     wgs84:long ?lon .
        }}
        """
        rows = self._execute(query)
        results: list[dict[str, Any]] = []
        for row in rows:
            try:
                row_lat = float(str(row["lat"]))
                row_lon = float(str(row["lon"]))
            except (TypeError, ValueError):
                continue
            distance_km = _haversine_km(lat, lon, row_lat, row_lon)
            if distance_km <= radius_km:
                results.append(
                    {
                        "territory": str(row["territory"]),
                        "label": str(row["label"]),
                        "code": str(row["code"]),
                        "lat": row_lat,
                        "lon": row_lon,
                        "distance_km": round(distance_km, 3),
                    }
                )
        results.sort(key=lambda item: float(item["distance_km"]))
        return results[: self.settings.sparql_max_results]

    def top_by_composite_score(
        self,
        profile_id: str,
        limit: int = 10,
        scope: str = "municipality",
    ) -> list[dict[str, Any]]:
        """Ranking con agregación y normalización aproximada en SPARQL.

        A diferencia de :meth:`top_scores_by_profile`, esta variante usa
        ``GROUP BY`` y ``SUM`` con una normalización lineal cerrada en SPARQL
        para acercarse a lo que haría un triplestore con funciones nativas.
        Devuelve el score total en escala [0, 100] y el número de indicadores
        agregados por territorio, útil para detectar territorios con cobertura
        incompleta.
        """
        _require_safe_identifier(profile_id, field="profile_id")
        profile_uri = URIRef(f"{AHR}profile/{profile_id}")
        target_class = _scope_to_class(scope)
        capped_limit = max(1, min(int(limit), self.settings.sparql_max_results))
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?territory ?label
               (SUM(?contribution) AS ?score)
               (COUNT(?indicator) AS ?indicators)
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
          BIND(
            IF(?direction = "lower_is_better",
               IF(?value <= 0, 1.0,
                  IF(?value >= 25, 0.0, 1.0 - (?value / 25.0))),
               IF(?value <= 0, 0.0,
                  IF(?value <= 1, xsd:decimal(?value),
                     IF(?value <= 100, ?value / 100.0,
                        IF(?value >= 50000, 1.0, ?value / 50000.0)))))
            AS ?normalized
          )
          BIND((?normalized * ?weight * 100.0) AS ?contribution)
        }}
        GROUP BY ?territory ?label
        ORDER BY DESC(?score)
        LIMIT {capped_limit}
        """
        rows = self._execute(query)
        return [
            {
                "territory": str(row["territory"]),
                "label": str(row["label"]),
                "score": round(float(str(row["score"])), 2),
                "indicators": int(str(row["indicators"])),
            }
            for row in rows
        ]

    def indicators_timeseries(self, territory_id: str, indicator_code: str) -> list[dict[str, Any]]:
        """Serie temporal de un indicador para un territorio.

        Devuelve periodos ordenados ascendentemente con valor, unidad y calidad.
        Si la observación tiene ``ah:periodYear`` disponible se usa para
        ordenar; si no, se cae al ordenamiento lexicográfico de ``ah:period``.
        """
        territory_uri = _territory_uri_from_id(territory_id)
        _require_safe_identifier(indicator_code, field="indicator_code")
        indicator_uri = URIRef(f"{AHR}indicator/{indicator_code}")
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?obs ?period ?value ?quality ?unit
        WHERE {{
          <{territory_uri}> ah:hasIndicatorObservation ?obs .
          ?obs ah:indicator <{indicator_uri}> ;
               ah:period ?period ;
               ah:value ?value ;
               ah:qualityFlag ?quality .
          <{indicator_uri}> ah:unit ?unit .
        }}
        ORDER BY ASC(?period)
        """
        return [
            {
                "observation": str(row["obs"]),
                "period": str(row["period"]),
                "value": float(str(row["value"])),
                "quality": str(row["quality"]),
                "unit": str(row["unit"]),
            }
            for row in self._execute(query)
        ]

    def provenance_chain(self, observation_uri: str) -> dict[str, Any]:
        """Devuelve la cadena PROV-O (actividad, fuente, periodo) de una observación.

        Se acepta una IRI canónica ``https://data.atlashabita.example/resource/
        observation/<indicador>/<kind>/<code>/<periodo>``. Cualquier otra URI
        se rechaza antes de interpolarla para evitar consultas arbitrarias.
        """
        observation_ref = _require_observation_uri(observation_uri)
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX prov: <{PROV}>
        PREFIX dct: <{DCT}>

        SELECT ?activity ?source ?source_title ?period ?indicator ?value ?quality
        WHERE {{
          <{observation_ref}> a ah:IndicatorObservation ;
                              ah:period ?period ;
                              ah:indicator ?indicator ;
                              ah:value ?value ;
                              ah:qualityFlag ?quality .
          OPTIONAL {{
            <{observation_ref}> prov:wasGeneratedBy ?activity .
            ?activity prov:used ?source .
            ?source dct:title ?source_title .
          }}
        }}
        LIMIT 1
        """
        rows = self._execute(query)
        if not rows:
            return {}
        row = rows[0]
        return {
            "observation": str(observation_ref),
            "activity": str(row["activity"]) if row.get("activity") is not None else None,
            "source": str(row["source"]) if row.get("source") is not None else None,
            "source_title": str(row["source_title"])
            if row.get("source_title") is not None
            else None,
            "period": str(row["period"]),
            "indicator": str(row["indicator"]),
            "value": float(str(row["value"])),
            "quality": str(row["quality"]),
        }

    def mobility_flow_between(
        self,
        origin_code: str,
        destination_code: str,
        period: str,
    ) -> list[dict[str, Any]]:
        """Devuelve los flujos de movilidad MITMA entre dos territorios.

        Se aceptan distintos modos cuando el dataset los desagrega: la
        consulta no filtra por modo y la lista resultante puede contener
        varias filas (una por modo). El periodo se valida estrictamente para
        evitar interpolación maliciosa.
        """
        _require_safe_identifier(origin_code, field="origin_code")
        _require_safe_identifier(destination_code, field="destination_code")
        _require_safe_period(period)
        # Aceptamos cualquier kind administrativo; la consulta filtra por
        # ``dct:identifier`` con el código provisto y delega la disambiguación
        # al grafo (origen/destino son territorios cualquiera). Comparamos
        # los literales con ``STR`` para ser robustos frente a tipados
        # mixtos (xsd:string vs literal plano).
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX dct: <{DCT}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?flow ?origin ?destination ?trips ?mode ?distance ?period
        WHERE {{
          ?flow a ah:MobilityFlow ;
                ah:flowOrigin ?origin ;
                ah:flowDestination ?destination ;
                ah:flowTrips ?trips ;
                ah:period ?period .
          ?origin dct:identifier ?origin_code .
          ?destination dct:identifier ?destination_code .
          FILTER(STR(?period) = "{period}")
          FILTER(STR(?origin_code) = "{origin_code}")
          FILTER(STR(?destination_code) = "{destination_code}")
          OPTIONAL {{ ?flow ah:flowMode ?mode . }}
          OPTIONAL {{ ?flow ah:flowDistanceKm ?distance . }}
        }}
        ORDER BY DESC(?trips)
        """
        rows = self._execute(query)
        results: list[dict[str, Any]] = []
        for row in rows:
            results.append(
                {
                    "flow": str(row["flow"]),
                    "origin": str(row["origin"]),
                    "destination": str(row["destination"]),
                    "trips": float(str(row["trips"])),
                    "mode": str(row["mode"]) if row.get("mode") is not None else None,
                    "distance_km": float(str(row["distance"]))
                    if row.get("distance") is not None
                    else None,
                    "period": str(row["period"]) if row.get("period") is not None else period,
                }
            )
        return results[: self.settings.sparql_max_results]

    def accidents_in_radius(
        self,
        lat: float,
        lon: float,
        km: float,
        year: int | None = None,
    ) -> list[dict[str, Any]]:
        """Accidentes DGT cuya geometría puntual cae dentro del radio dado.

        Igual que :meth:`territories_within_radius`, se computa Haversine en
        Python para no depender de extensiones GeoSPARQL. ``year`` es opcional;
        cuando se pasa, se filtra por ``ah:accidentYear`` (xsd:gYear) en la
        propia consulta SPARQL.
        """
        _require_coordinate(lat, minimum=-90.0, maximum=90.0, field="lat")
        _require_coordinate(lon, minimum=-180.0, maximum=180.0, field="lon")
        _require_radius_km(km)
        year_filter = ""
        if year is not None:
            if not isinstance(year, int) or isinstance(year, bool):
                raise ValueError(f"year debe ser entero: {year!r}")
            if not 1900 <= year <= 2100:
                raise ValueError(f"year fuera de rango razonable: {year}")
            # Comparar año con ``STR`` blinda contra mixto de gYear/xsd:string
            # cuando rdflib emite literales con datatype específico.
            year_filter = f'  ?accident ah:accidentYear ?year .\n  FILTER(STR(?year) = "{year}")'

        query = f"""
        PREFIX ah: <{AH}>
        PREFIX wgs84: <{GEO_WGS84}>
        PREFIX dct: <{DCT}>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

        SELECT ?accident ?id ?lat ?lon ?severity ?date
        WHERE {{
          ?accident a ah:RoadAccident ;
                    dct:identifier ?id ;
                    wgs84:lat ?lat ;
                    wgs84:long ?lon ;
                    ah:accidentSeverity ?severity ;
                    ah:accidentDate ?date .
        {year_filter}
        }}
        """
        rows = self._execute(query)
        results: list[dict[str, Any]] = []
        for row in rows:
            try:
                row_lat = float(str(row["lat"]))
                row_lon = float(str(row["lon"]))
            except (TypeError, ValueError):
                continue
            distance_km = _haversine_km(lat, lon, row_lat, row_lon)
            if distance_km <= km:
                results.append(
                    {
                        "accident": str(row["accident"]),
                        "id": str(row["id"]),
                        "lat": row_lat,
                        "lon": row_lon,
                        "severity": str(row["severity"]),
                        "date": str(row["date"]),
                        "distance_km": round(distance_km, 3),
                    }
                )
        results.sort(key=lambda item: float(item["distance_km"]))
        return results[: self.settings.sparql_max_results]

    def transit_stops_in_municipality(self, municipality_code: str) -> list[dict[str, Any]]:
        """Paradas de transporte CRTM ubicadas en un municipio.

        Se confía en la propiedad ``ah:locatedIn`` cuando el dataset la
        provee; cuando no exista (paradas sin asignar), no se devuelven en
        esta consulta para mantener la respuesta determinista.
        """
        _require_safe_identifier(municipality_code, field="municipality_code")
        municipality_uri = URIRef(f"{AHR}territory/municipality/{municipality_code}")
        query = f"""
        PREFIX ah: <{AH}>
        PREFIX wgs84: <{GEO_WGS84}>
        PREFIX dct: <{DCT}>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?stop ?id ?label ?lat ?lon ?operator ?code
        WHERE {{
          ?stop a ah:TransitStop ;
                dct:identifier ?id ;
                rdfs:label ?label ;
                wgs84:lat ?lat ;
                wgs84:long ?lon ;
                ah:operator ?operator ;
                ah:locatedIn <{municipality_uri}> .
          OPTIONAL {{ ?stop ah:stopCode ?code . }}
        }}
        ORDER BY ?label
        """
        rows = self._execute(query)
        return [
            {
                "stop": str(row["stop"]),
                "id": str(row["id"]),
                "label": str(row["label"]),
                "lat": float(str(row["lat"])),
                "lon": float(str(row["lon"])),
                "operator": str(row["operator"]),
                "code": str(row["code"]) if row.get("code") is not None else None,
            }
            for row in rows
        ]

    def risk_index(self, municipality_code: str) -> dict[str, Any]:
        """Indice compuesto de riesgo movilidad-accidentes para un municipio.

        Combina dos señales sencillas y trazables:

        * **Total de accidentes** registrados en el municipio (``ah:occursIn``).
        * **Total de viajes salientes** desde el municipio (``ah:flowOrigin``).

        El indice ``risk_per_1000_trips`` es accidentes / max(1, viajes/1000),
        una aproximación robusta cuando no hay datos: si no hay flujos, el
        denominador es 1 y el indice queda en accidentes absolutos. Es una
        primera iteración que el motor de scoring podrá refinar.
        """
        _require_safe_identifier(municipality_code, field="municipality_code")
        municipality_uri = URIRef(f"{AHR}territory/municipality/{municipality_code}")

        accidents_query = f"""
        PREFIX ah: <{AH}>

        SELECT (COUNT(?accident) AS ?total)
               (SUM(?fatalities) AS ?fatalities)
               (SUM(?victims) AS ?victims)
        WHERE {{
          ?accident a ah:RoadAccident ;
                    ah:occursIn <{municipality_uri}> .
          OPTIONAL {{ ?accident ah:accidentFatalities ?fatalities . }}
          OPTIONAL {{ ?accident ah:accidentVictims ?victims . }}
        }}
        """

        flows_query = f"""
        PREFIX ah: <{AH}>

        SELECT (COUNT(?flow) AS ?flows) (SUM(?trips) AS ?trips)
        WHERE {{
          ?flow a ah:MobilityFlow ;
                ah:flowOrigin <{municipality_uri}> ;
                ah:flowTrips ?trips .
        }}
        """

        accidents_rows = self._execute(accidents_query)
        flows_rows = self._execute(flows_query)
        accidents_total = _safe_int(accidents_rows[0].get("total")) if accidents_rows else 0
        fatalities_total = _safe_int(accidents_rows[0].get("fatalities")) if accidents_rows else 0
        victims_total = _safe_int(accidents_rows[0].get("victims")) if accidents_rows else 0
        flows_total = _safe_int(flows_rows[0].get("flows")) if flows_rows else 0
        trips_total = _safe_float(flows_rows[0].get("trips")) if flows_rows else 0.0

        denominator = max(1.0, trips_total / 1000.0)
        risk_per_1000_trips = round(accidents_total / denominator, 4)
        return {
            "municipality": str(municipality_uri),
            "code": municipality_code,
            "accidents": accidents_total,
            "fatalities": fatalities_total,
            "victims": victims_total,
            "outbound_flows": flows_total,
            "outbound_trips": trips_total,
            "risk_per_1000_trips": risk_per_1000_trips,
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
    """Convierte ``municipality:41091`` al URIRef canónico validando el formato."""
    _require_safe_territory_id(territory_id)
    kind, code = territory_id.split(":", maxsplit=1)
    return URIRef(f"{AHR}territory/{kind}/{code}")


def _require_observation_uri(value: str) -> URIRef:
    """Valida que ``value`` sea una IRI de observación canónica.

    El bloqueo evita que la capa HTTP propague IRIs arbitrarias al SPARQL,
    que podrían redirigir la consulta a recursos inesperados o externos.
    """
    if not isinstance(value, str):
        raise ValueError(f"observation_uri debe ser cadena: {value!r}")
    prefix = f"{AHR}observation/"
    if not value.startswith(prefix):
        raise ValueError(f"observation_uri inválido (prefijo): {value!r}")
    tail = value[len(prefix) :]
    # Componentes admitidos: indicador/kind/code/periodo (4 segmentos).
    parts = tail.split("/")
    if len(parts) != 4:
        raise ValueError(f"observation_uri inválido (segmentos): {value!r}")
    indicator, kind, code, period = parts
    _require_safe_identifier(indicator, field="indicator_code")
    if kind not in {"autonomous_community", "province", "municipality"}:
        raise ValueError(f"observation_uri inválido (kind): {value!r}")
    _require_safe_identifier(code, field="territory_code")
    _require_safe_period(period)
    return URIRef(value)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en km entre dos puntos WGS84 usando Haversine.

    Se evita depender de ``pyproj``/``shapely`` manteniendo la capa liviana.
    El error frente a cálculos elipsoidales es < 0.5% en distancias < 1000 km,
    adecuado para filtros de proximidad municipal.
    """
    earth_radius_km = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_km * c


def _safe_int(value: Any) -> int:
    """Coerciona un valor SPARQL a entero, devolviendo 0 cuando no aplique.

    Las agregaciones ``COUNT``/``SUM`` devuelven ``Literal`` con datatypes
    que rdflib no siempre castea de forma transparente. Esta función blinda
    la conversión sin propagar excepciones a la capa SPARQL.
    """
    if value is None:
        return 0
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return 0


def _safe_float(value: Any) -> float:
    """Coerciona un valor SPARQL a ``float`` con fallback a 0.0."""
    if value is None:
        return 0.0
    try:
        return float(str(value))
    except (TypeError, ValueError):
        return 0.0


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
