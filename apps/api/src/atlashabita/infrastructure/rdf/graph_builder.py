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
"""

from __future__ import annotations

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
from atlashabita.domain.territories import Territory, TerritoryKind
from atlashabita.infrastructure.ingestion.seed_loader import SeedDataset
from atlashabita.infrastructure.rdf.namespaces import AH, DCT, GEO, PROV, bind_all
from atlashabita.infrastructure.rdf.uri_builder import URIBuilder

#: Nombres canónicos de named graphs por dominio.
GRAPH_TERRITORIES: Final[str] = "territories"
GRAPH_INDICATORS: Final[str] = "indicators"
GRAPH_SOURCES: Final[str] = "sources"
GRAPH_OBSERVATIONS: Final[str] = "observations"
GRAPH_PROFILES: Final[str] = "profiles"
GRAPH_ONTOLOGY: Final[str] = "ontology"


_TERRITORY_CLASS: dict[TerritoryKind, URIRef] = {
    TerritoryKind.AUTONOMOUS_COMMUNITY: AH.AutonomousCommunity,
    TerritoryKind.PROVINCE: AH.Province,
    TerritoryKind.MUNICIPALITY: AH.Municipality,
}


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

        for graph in (
            territories_graph,
            indicators_graph,
            sources_graph,
            observations_graph,
            profiles_graph,
        ):
            bind_all(graph)

        for territory in dataset.territories:
            self._emit_territory(territories_graph, territory)
        for indicator in dataset.indicators:
            self._emit_indicator(indicators_graph, indicator)
        for source in dataset.sources:
            self._emit_source(sources_graph, source)
        for observation in dataset.observations:
            self._emit_observation(observations_graph, observation)
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
        for indicator in dataset.indicators:
            self._emit_indicator(graph, indicator)
        for source in dataset.sources:
            self._emit_source(graph, source)
        for observation in dataset.observations:
            self._emit_observation(graph, observation)
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
        graph.add((subject, DCT.identifier, Literal(territory.code, datatype=XSD.string)))
        graph.add((subject, RDFS.label, Literal(territory.name, lang="es")))

        parent = self._resolve_parent(territory)
        if parent is not None:
            graph.add((subject, AH.belongsTo, parent))

        if territory.centroid is not None:
            graph.add((subject, GEO.lat, _decimal_literal(territory.centroid.lat)))
            graph.add((subject, GEO.long, _decimal_literal(territory.centroid.lon)))
        if territory.population is not None:
            graph.add((subject, AH.population, Literal(territory.population, datatype=XSD.integer)))
        if territory.area_km2 is not None:
            graph.add((subject, AH.area, _decimal_literal(territory.area_km2)))

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
        graph.add(
            (
                subject,
                AH.indicator,
                self.uri_builder.indicator(observation.indicator_code),
            )
        )
        graph.add((subject, AH.value, _decimal_literal(observation.value)))
        graph.add((subject, AH.period, Literal(observation.period, datatype=XSD.string)))
        graph.add((subject, AH.qualityFlag, Literal(observation.quality, datatype=XSD.string)))
        graph.add((subject, AH.providedBy, self.uri_builder.source(observation.source_id)))

        territory_uri = self._territory_uri_from_id(observation.territory_id)
        if territory_uri is not None:
            graph.add((territory_uri, AH.hasIndicatorObservation, subject))

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


__all__ = [
    "GRAPH_INDICATORS",
    "GRAPH_OBSERVATIONS",
    "GRAPH_ONTOLOGY",
    "GRAPH_PROFILES",
    "GRAPH_SOURCES",
    "GRAPH_TERRITORIES",
    "GraphBuilder",
]
