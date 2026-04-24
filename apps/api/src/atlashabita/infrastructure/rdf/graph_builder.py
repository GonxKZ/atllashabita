"""Construcción del grafo RDF a partir del dataset seed.

Este módulo traduce los objetos de dominio (territorios, indicadores,
observaciones, fuentes, perfiles) a tripletas RDF siguiendo la ontología
``ah:``. Se ofrecen dos modos complementarios:

* ``build`` devuelve un ``rdflib.Dataset`` con **named graphs** por dominio,
  cumpliendo la recomendación de separar territorios, observaciones, fuentes,
  indicadores, perfiles y ontología para auditar cada bloque por separado.
* ``build_graph`` aplana todos los triples a un único ``Graph``. Es útil para
  SPARQL en la MVP, donde rdflib ejecuta las consultas sobre un grafo default
  sin necesidad de coordinarse con un triplestore externo.

El builder es determinista: misma entrada produce siempre las mismas URIs y
los mismos literales, lo que permite hashear el grafo y detectar cambios
entre corridas (útil para cachés y pruebas de regresión).

Fase B (M8) añade dos bloques semánticos:

* **Geometrías GeoSPARQL**: cada territorio con centroide emite
  ``geo:hasGeometry`` + ``geo:Point`` + ``geo:asWKT`` en formato CRS84.
* **Procedencia PROV-O completa**: las observaciones se vinculan a una
  ``ah:IngestionActivity`` que declara ``prov:used`` (fuente) y
  ``prov:wasGeneratedBy`` (observación). Las actividades se deduplican por
  (``source_id``, ``period``) y viven en el named graph ``provenance``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Final

from rdflib import Dataset, Graph, Literal, URIRef
from rdflib.namespace import RDF, RDFS, XSD

from atlashabita.domain.indicators import (
    Indicator,
    IndicatorObservation,
)
from atlashabita.domain.profiles import DecisionProfile
from atlashabita.domain.sources import DataSource
from atlashabita.domain.territories import GeoPoint, Territory, TerritoryKind
from atlashabita.infrastructure.ingestion.seed_loader import SeedDataset
from atlashabita.infrastructure.rdf.namespaces import (
    AH,
    DCT,
    GEO,
    GEO_WGS84,
    PROV,
    SF,
    bind_all,
)
from atlashabita.infrastructure.rdf.uri_builder import URIBuilder

#: Nombres canónicos de named graphs por dominio.
GRAPH_TERRITORIES: Final[str] = "territories"
GRAPH_INDICATORS: Final[str] = "indicators"
GRAPH_SOURCES: Final[str] = "sources"
GRAPH_OBSERVATIONS: Final[str] = "observations"
GRAPH_PROFILES: Final[str] = "profiles"
GRAPH_ONTOLOGY: Final[str] = "ontology"
GRAPH_PROVENANCE: Final[str] = "provenance"
GRAPH_GEOMETRY: Final[str] = "geometry"


_TERRITORY_CLASS: dict[TerritoryKind, URIRef] = {
    TerritoryKind.AUTONOMOUS_COMMUNITY: AH.AutonomousCommunity,
    TerritoryKind.PROVINCE: AH.Province,
    TerritoryKind.MUNICIPALITY: AH.Municipality,
}

_WKT_LITERAL_DATATYPE = URIRef("http://www.opengis.net/ont/geosparql#wktLiteral")
#: URI estable del sistema de referencia CRS84 (WGS84 con lon,lat en grados
#: decimales), el preferido por GeoSPARQL para serializaciones WKT "planas".
_CRS84_URI = "<http://www.opengis.net/def/crs/OGC/1.3/CRS84>"

_YEAR_PATTERN = re.compile(r"^(-?\d{4})$")


@dataclass(frozen=True, slots=True)
class GraphBuilder:
    """Traduce un :class:`SeedDataset` a grafo(s) RDF.

    La inyección de :class:`URIBuilder` permite probar el builder con URIs
    sintéticas y mantener la política de URIs en un único lugar (SOLID: la
    responsabilidad de *cómo* se nombra un recurso vive en el builder de URIs,
    no aquí).
    """

    uri_builder: URIBuilder

    def build(self, dataset: SeedDataset, *, ontology_path: Path | None = None) -> Dataset:
        """Crea un ``Dataset`` con named graphs por dominio.

        Parameters
        ----------
        dataset:
            Datos del seed ya parseados por :class:`SeedLoader`.
        ontology_path:
            Ruta opcional al fichero Turtle de la ontología. Si se pasa, se
            importa en el named graph ``ontology`` para que SPARQL pueda
            resolver etiquetas/domain/range contra el TBox sin dependencias
            externas.
        """
        ds = Dataset()
        bind_all(ds)

        territories_graph = ds.graph(self.uri_builder.named_graph(GRAPH_TERRITORIES))
        indicators_graph = ds.graph(self.uri_builder.named_graph(GRAPH_INDICATORS))
        sources_graph = ds.graph(self.uri_builder.named_graph(GRAPH_SOURCES))
        observations_graph = ds.graph(self.uri_builder.named_graph(GRAPH_OBSERVATIONS))
        profiles_graph = ds.graph(self.uri_builder.named_graph(GRAPH_PROFILES))
        provenance_graph = ds.graph(self.uri_builder.named_graph(GRAPH_PROVENANCE))
        geometry_graph = ds.graph(self.uri_builder.named_graph(GRAPH_GEOMETRY))

        for graph in (
            territories_graph,
            indicators_graph,
            sources_graph,
            observations_graph,
            profiles_graph,
            provenance_graph,
            geometry_graph,
        ):
            bind_all(graph)

        for territory in dataset.territories:
            self._emit_territory(territories_graph, territory)
            self._emit_geometry(geometry_graph, territory)
        for indicator in dataset.indicators:
            self._emit_indicator(indicators_graph, indicator)
        for source in dataset.sources:
            self._emit_source(sources_graph, source)
        activities: dict[tuple[str, str], URIRef] = {}
        for observation in dataset.observations:
            self._emit_observation(observations_graph, observation)
            self._emit_provenance(provenance_graph, observations_graph, observation, activities)
        for profile in dataset.profiles:
            self._emit_profile(profiles_graph, profile)

        if ontology_path is not None and ontology_path.exists():
            ontology_graph = ds.graph(self.uri_builder.named_graph(GRAPH_ONTOLOGY))
            bind_all(ontology_graph)
            ontology_graph.parse(ontology_path, format="turtle")

        return ds

    def build_graph(self, dataset: SeedDataset, *, ontology_path: Path | None = None) -> Graph:
        """Construye un ``Graph`` único con todas las tripletas.

        Útil en la MVP para ejecutar SPARQL sin preocuparnos por el grafo
        por defecto frente a los named graphs. El orden de inserción es
        irrelevante semánticamente pero se mantiene estable para producir
        serializaciones reproducibles.
        """
        graph = Graph()
        bind_all(graph)

        for territory in dataset.territories:
            self._emit_territory(graph, territory)
            self._emit_geometry(graph, territory)
        for indicator in dataset.indicators:
            self._emit_indicator(graph, indicator)
        for source in dataset.sources:
            self._emit_source(graph, source)
        activities: dict[tuple[str, str], URIRef] = {}
        for observation in dataset.observations:
            self._emit_observation(graph, observation)
            self._emit_provenance(graph, graph, observation, activities)
        for profile in dataset.profiles:
            self._emit_profile(graph, profile)

        if ontology_path is not None and ontology_path.exists():
            graph.parse(ontology_path, format="turtle")

        return graph

    def _emit_territory(self, graph: Graph, territory: Territory) -> None:
        """Proyecta un :class:`Territory` en tripletas RDF."""
        subject = self.uri_builder.territory(territory.code, territory.kind)
        graph.add((subject, RDF.type, AH.Territory))
        graph.add((subject, RDF.type, _TERRITORY_CLASS[territory.kind]))
        # ``geo:Feature`` se emite explícitamente porque la inferencia de
        # subClassOf no la añade cuando se consulta sin razonador.
        graph.add((subject, RDF.type, GEO.Feature))
        graph.add((subject, DCT.identifier, Literal(territory.code, datatype=XSD.string)))
        graph.add((subject, RDFS.label, Literal(territory.name, lang="es")))

        parent = self._resolve_parent(territory)
        if parent is not None:
            graph.add((subject, AH.belongsTo, parent))

        if territory.centroid is not None:
            # Se conserva el vocabulario histórico WGS84 para compatibilidad
            # con shapes existentes y consumidores que aún lo esperan.
            graph.add((subject, GEO_WGS84.lat, _decimal_literal(territory.centroid.lat)))
            graph.add((subject, GEO_WGS84.long, _decimal_literal(territory.centroid.lon)))
            # Enlace GeoSPARQL hacia la geometría dedicada.
            geometry_uri = self.uri_builder.geometry(territory.code, territory.kind)
            graph.add((subject, AH.hasGeometry, geometry_uri))
            graph.add((subject, GEO.hasGeometry, geometry_uri))
        if territory.population is not None:
            graph.add((subject, AH.population, Literal(territory.population, datatype=XSD.integer)))
        if territory.area_km2 is not None:
            graph.add((subject, AH.area, _decimal_literal(territory.area_km2)))

    def _emit_geometry(self, graph: Graph, territory: Territory) -> None:
        """Emite la geometría GeoSPARQL (``geo:Point`` + ``geo:asWKT``).

        Si el territorio no tiene centroide la geometría se omite: preferimos
        no emitir nodos vacíos que luego SHACL marcaría como incompletos.
        """
        if territory.centroid is None:
            return
        geometry_uri = self.uri_builder.geometry(territory.code, territory.kind)
        graph.add((geometry_uri, RDF.type, GEO.Geometry))
        graph.add((geometry_uri, RDF.type, GEO.Point))
        graph.add((geometry_uri, RDF.type, SF.Point))
        wkt_literal = Literal(_point_wkt(territory.centroid), datatype=_WKT_LITERAL_DATATYPE)
        graph.add((geometry_uri, GEO.asWKT, wkt_literal))
        # ``ah:wktLiteral`` es subpropiedad de ``geo:asWKT``; se emite por
        # compatibilidad con consultas que usen la variante propietaria.
        graph.add((geometry_uri, AH.wktLiteral, wkt_literal))

    def _resolve_parent(self, territory: Territory) -> URIRef | None:
        """Devuelve la URI del territorio padre según la jerarquía administrativa.

        Un municipio pertenece a su provincia; una provincia pertenece a su
        comunidad autónoma; las comunidades no tienen padre. Esto codifica
        ``ah:belongsTo`` en el grafo sin necesidad de lookups cruzados.
        """
        if territory.kind is TerritoryKind.MUNICIPALITY and territory.province_code:
            return self.uri_builder.territory(territory.province_code, TerritoryKind.PROVINCE)
        if territory.kind is TerritoryKind.PROVINCE and territory.autonomous_community_code:
            return self.uri_builder.territory(
                territory.autonomous_community_code,
                TerritoryKind.AUTONOMOUS_COMMUNITY,
            )
        return None

    def _emit_indicator(self, graph: Graph, indicator: Indicator) -> None:
        """Proyecta la definición semántica de un indicador."""
        subject = self.uri_builder.indicator(indicator.code)
        graph.add((subject, RDF.type, AH.Indicator))
        graph.add((subject, DCT.identifier, Literal(indicator.code, datatype=XSD.string)))
        graph.add((subject, RDFS.label, Literal(indicator.label, lang="es")))
        graph.add((subject, DCT.description, Literal(indicator.description, lang="es")))
        graph.add((subject, AH.unit, Literal(indicator.unit, datatype=XSD.string)))
        # ``sh:in`` en shapes compara por igualdad estructural exacta, por lo
        # que la dirección se emite como literal plano (sin datatype) para
        # alinear con la lista enumerada de la shape.
        graph.add((subject, AH.direction, Literal(indicator.direction.value)))
        graph.add(
            (
                subject,
                PROV.wasAttributedTo,
                self.uri_builder.source(indicator.source_id),
            )
        )

    def _emit_source(self, graph: Graph, source: DataSource) -> None:
        """Proyecta una fuente de datos como ``prov:Agent``."""
        subject = self.uri_builder.source(source.id)
        graph.add((subject, RDF.type, AH.DataSource))
        graph.add((subject, RDF.type, PROV.Agent))
        graph.add((subject, DCT.identifier, Literal(source.id, datatype=XSD.string)))
        graph.add((subject, DCT.title, Literal(source.title, lang="es")))
        graph.add((subject, DCT.publisher, Literal(source.publisher, lang="es")))
        graph.add((subject, DCT.source, URIRef(source.url)))
        graph.add((subject, AH.license, Literal(source.license, datatype=XSD.string)))
        graph.add((subject, AH.periodicity, Literal(source.periodicity, datatype=XSD.string)))
        if source.description:
            graph.add((subject, DCT.description, Literal(source.description, lang="es")))

    def _emit_observation(self, graph: Graph, observation: IndicatorObservation) -> None:
        """Proyecta una observación y la enlaza al territorio/fuente/indicador."""
        subject = self.uri_builder.observation(
            observation.indicator_code, observation.territory_id, observation.period
        )
        graph.add((subject, RDF.type, AH.IndicatorObservation))
        graph.add((subject, RDF.type, PROV.Entity))
        graph.add(
            (
                subject,
                AH.indicator,
                self.uri_builder.indicator(observation.indicator_code),
            )
        )
        graph.add((subject, AH.value, _decimal_literal(observation.value)))
        graph.add((subject, AH.period, Literal(observation.period, datatype=XSD.string)))
        if _YEAR_PATTERN.match(observation.period):
            graph.add((subject, AH.periodYear, Literal(observation.period, datatype=XSD.gYear)))
        graph.add((subject, AH.qualityFlag, Literal(observation.quality, datatype=XSD.string)))
        graph.add((subject, AH.providedBy, self.uri_builder.source(observation.source_id)))

        territory_uri = self._territory_uri_from_id(observation.territory_id)
        if territory_uri is not None:
            graph.add((territory_uri, AH.hasIndicatorObservation, subject))

    def _emit_provenance(
        self,
        prov_graph: Graph,
        obs_graph: Graph,
        observation: IndicatorObservation,
        activities: dict[tuple[str, str], URIRef],
    ) -> None:
        """Emite la cadena PROV-O asociada a una observación.

        - Crea una ``ah:IngestionActivity`` única por (fuente, periodo).
        - Declara ``prov:used`` hacia la fuente (``ah:ingestedFrom``).
        - Añade ``prov:wasGeneratedBy`` desde la observación hacia la
          actividad, permitiendo la navegación inversa ``observation ->
          activity -> source``.

        ``prov_graph`` y ``obs_graph`` pueden ser el mismo grafo (caso
        ``build_graph``) o distintos (caso ``build`` con named graphs).
        """
        activity_key = (observation.source_id, observation.period)
        activity_uri = activities.get(activity_key)
        if activity_uri is None:
            activity_uri = self.uri_builder.activity(observation.source_id, observation.period)
            activities[activity_key] = activity_uri
            source_uri = self.uri_builder.source(observation.source_id)
            prov_graph.add((activity_uri, RDF.type, AH.IngestionActivity))
            prov_graph.add((activity_uri, RDF.type, PROV.Activity))
            prov_graph.add((activity_uri, PROV.used, source_uri))
            prov_graph.add((activity_uri, AH.ingestedFrom, source_uri))
            if _YEAR_PATTERN.match(observation.period):
                prov_graph.add(
                    (
                        activity_uri,
                        AH.activityPeriod,
                        Literal(observation.period, datatype=XSD.gYear),
                    )
                )

        observation_uri = self.uri_builder.observation(
            observation.indicator_code, observation.territory_id, observation.period
        )
        prov_graph.add((activity_uri, PROV.generated, observation_uri))
        prov_graph.add((activity_uri, AH.produced, observation_uri))
        # La tripleta inversa vive junto a la observación para que su
        # shape (``sh:maxCount 1`` sobre ``prov:wasGeneratedBy``) la vea.
        obs_graph.add((observation_uri, PROV.wasGeneratedBy, activity_uri))

    def _emit_profile(self, graph: Graph, profile: DecisionProfile) -> None:
        """Proyecta un perfil de decisión y sus pesos como contribuciones base.

        Cada contribución se identifica con una URI determinista derivada del
        perfil y el indicador. Preferimos URIs sobre blank nodes porque:

        * Hacen el grafo **idempotente**: dos construcciones producen los
          mismos triples, lo que facilita hashing y diffs.
        * Permiten referenciar una contribución concreta desde SPARQL o API.
        """
        subject = self.uri_builder.profile(profile.id)
        graph.add((subject, RDF.type, AH.DecisionProfile))
        graph.add((subject, DCT.identifier, Literal(profile.id, datatype=XSD.string)))
        graph.add((subject, RDFS.label, Literal(profile.label, lang="es")))
        graph.add((subject, DCT.description, Literal(profile.description, lang="es")))

        profile_uri = str(subject)
        for indicator_code, weight in profile.weights.items():
            contribution = URIRef(f"{profile_uri}/contribution/{indicator_code}")
            graph.add((subject, AH.hasContribution, contribution))
            graph.add((contribution, RDF.type, AH.ScoreContribution))
            graph.add((contribution, AH.indicator, self.uri_builder.indicator(indicator_code)))
            graph.add((contribution, AH.weight, _decimal_literal(weight)))

    def _territory_uri_from_id(self, territory_id: str) -> URIRef | None:
        """Convierte ``municipality:41091`` en la URI de territorio correspondiente."""
        try:
            kind_value, code = territory_id.split(":", maxsplit=1)
        except ValueError:
            return None
        try:
            kind = TerritoryKind(kind_value)
        except ValueError:
            return None
        return self.uri_builder.territory(code, kind)


def _decimal_literal(value: float | int | Decimal) -> Literal:
    """Construye un ``xsd:decimal`` robusto frente a flotantes binarios.

    SHACL exige ``xsd:decimal`` para ``ah:value`` y ``ah:weight``. rdflib
    serializa los ``float`` de Python como ``xsd:double`` por defecto, por lo
    que se fuerza la conversión vía :class:`Decimal` a partir de su
    representación textual, evitando artefactos como ``13.600000000000001``.
    """
    decimal_value = value if isinstance(value, Decimal) else Decimal(str(value))
    return Literal(decimal_value, datatype=XSD.decimal)


def _point_wkt(point: GeoPoint) -> str:
    """Serializa un :class:`GeoPoint` como WKT con CRS84 explícito.

    GeoSPARQL recomienda incluir el CRS para evitar ambigüedades con los ejes
    (lon,lat vs lat,lon). Se usa CRS84 (lon,lat) por ser el estándar en
    Well-Known Text usado por la mayoría de triplestores con soporte GeoSPARQL.
    """
    return f"{_CRS84_URI} POINT({point.lon} {point.lat})"


__all__ = [
    "GRAPH_GEOMETRY",
    "GRAPH_INDICATORS",
    "GRAPH_OBSERVATIONS",
    "GRAPH_ONTOLOGY",
    "GRAPH_PROFILES",
    "GRAPH_PROVENANCE",
    "GRAPH_SOURCES",
    "GRAPH_TERRITORIES",
    "GraphBuilder",
]
