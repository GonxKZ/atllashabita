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

Milestone M11 incorpora tres nuevos bloques:

* **Movilidad** (``ah:MobilityFlow``): flujos origen-destino MITMA modelados
  como ``sosa:Observation`` + ``qb:Observation`` con periodo y modo.
* **Accidentes** (``ah:RoadAccident``): registros DGT con geometría puntual
  y atributos de severidad.
* **Transporte público** (``ah:TransitStop`` / ``ah:TransitRoute``): paradas
  y rutas alineadas con CRTM/GTFS.

Los métodos ``build``/``build_graph`` aceptan colecciones opcionales para
estos tres bloques. Si la capa de ingesta aún no las ha producido (caso
habitual mientras TM1 finaliza la generación de los CSV), las colecciones
quedan vacías y el grafo se compone exclusivamente con los datos previos
sin romper la build ni la validación SHACL.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
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
    QB,
    SF,
    SOSA,
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
GRAPH_MOBILITY: Final[str] = "mobility"
GRAPH_ACCIDENTS: Final[str] = "accidents"
GRAPH_TRANSIT: Final[str] = "transit"


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
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@dataclass(frozen=True, slots=True)
class MobilityFlowRecord:
    """Registro origen-destino de movilidad MITMA listo para emitir como RDF.

    No vive en :mod:`domain` porque a fecha del milestone M11 todavía no se
    consume desde la lógica de scoring. Se mantiene aquí como DTO de la capa
    de infraestructura, alineado con el resto de helpers de emisión RDF, y
    se elevará a dominio cuando la aplicación necesite invariantes de
    negocio sobre los flujos.
    """

    origin: str
    """Identificador territorio origen, formato ``kind:code`` (ej: ``municipality:41091``)."""

    destination: str
    """Identificador territorio destino, formato ``kind:code``."""

    period: str
    """Periodo MITMA (``2024``, ``2024Q3``, ``2024-07``)."""

    trips: float
    """Número estimado de desplazamientos en el periodo."""

    source_id: str
    """Fuente de datos asociada (típicamente ``mitma_om``)."""

    mode: str | None = None
    """Modo de transporte si el dataset lo desagrega."""

    distance_km: float | None = None
    """Distancia media estimada en km, si aplica."""


@dataclass(frozen=True, slots=True)
class RoadAccidentRecord:
    """Registro DGT de un accidente vial.

    El identificador debe ser estable entre ingestas para garantizar
    idempotencia: si la fuente original no lo provee, la capa de ingesta
    sintetiza uno determinista a partir de fecha + coordenada + carretera.
    """

    accident_id: str
    """Identificador estable del accidente (``ID_ACCIDENTE`` DGT)."""

    date: str
    """Fecha en formato ``YYYY-MM-DD``."""

    lat: float
    """Latitud WGS84 del lugar del siniestro."""

    lon: float
    """Longitud WGS84 del lugar del siniestro."""

    severity: str
    """Severidad: ``fatal``, ``serious`` o ``slight``."""

    source_id: str
    """Fuente de datos asociada (típicamente ``dgt_accidentes``)."""

    municipality_code: str | None = None
    """Código INE 5 dígitos del municipio donde ocurre el accidente."""

    victims: int | None = None
    fatalities: int | None = None
    road_type: str | None = None


@dataclass(frozen=True, slots=True)
class TransitStopRecord:
    """Parada de transporte público (CRTM/GTFS)."""

    operator: str
    stop_id: str
    name: str
    lat: float
    lon: float
    source_id: str
    code: str | None = None
    municipality_code: str | None = None


@dataclass(frozen=True, slots=True)
class TransitRouteRecord:
    """Ruta o línea de transporte público (CRTM/GTFS)."""

    operator: str
    route_id: str
    short_name: str
    long_name: str
    mode: str
    source_id: str
    stop_ids: tuple[str, ...] = field(default_factory=tuple)
    """Identificadores de las paradas (sin prefijo de operador) que sirve la ruta."""


@dataclass(frozen=True, slots=True)
class MobilityDataset:
    """Colección agregada de los nuevos datasets M11.

    Se diseña como contenedor explícito para que ``GraphBuilder.build`` reciba
    un único parámetro opcional sin saturar la firma. Todas las colecciones
    son tuplas vacías por defecto, garantizando que la build no rompe cuando
    los CSV de TM1 aún no estén versionados.
    """

    flows: tuple[MobilityFlowRecord, ...] = field(default_factory=tuple)
    accidents: tuple[RoadAccidentRecord, ...] = field(default_factory=tuple)
    transit_stops: tuple[TransitStopRecord, ...] = field(default_factory=tuple)
    transit_routes: tuple[TransitRouteRecord, ...] = field(default_factory=tuple)

    @property
    def is_empty(self) -> bool:
        """Indica si no hay ningún registro nuevo cargado.

        Útil para que las pruebas decidan si activar las verificaciones
        avanzadas (cuando el seed extendido ya existe) o limitarse a los
        casos básicos.
        """
        return not (self.flows or self.accidents or self.transit_stops or self.transit_routes)


_EMPTY_MOBILITY: Final[MobilityDataset] = MobilityDataset()


@dataclass(frozen=True, slots=True)
class GraphBuilder:
    """Traduce un :class:`SeedDataset` a grafo(s) RDF.

    La inyección de :class:`URIBuilder` permite probar el builder con URIs
    sintéticas y mantener la política de URIs en un único lugar (SOLID: la
    responsabilidad de *cómo* se nombra un recurso vive en el builder de URIs,
    no aquí).
    """

    uri_builder: URIBuilder

    def build(
        self,
        dataset: SeedDataset,
        *,
        ontology_path: Path | None = None,
        mobility: MobilityDataset | None = None,
    ) -> Dataset:
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
        mobility:
            Colección opcional con los registros M11 (movilidad MITMA,
            accidentes DGT, paradas y rutas CRTM). Cuando es ``None`` o
            está vacía la build no añade tripletas adicionales y los named
            graphs ``mobility``/``accidents``/``transit`` permanecen vacíos.
        """
        ds = Dataset()
        # ``bind_all`` se invoca una sola vez sobre el Dataset: rdflib propaga
        # los prefijos a los named graphs derivados, por lo que iterar la
        # llamada por grafo era redundante (ver issue #133, hallazgo H14).
        bind_all(ds)

        mobility_data = mobility or _EMPTY_MOBILITY

        territories_graph = ds.graph(self.uri_builder.named_graph(GRAPH_TERRITORIES))
        indicators_graph = ds.graph(self.uri_builder.named_graph(GRAPH_INDICATORS))
        sources_graph = ds.graph(self.uri_builder.named_graph(GRAPH_SOURCES))
        observations_graph = ds.graph(self.uri_builder.named_graph(GRAPH_OBSERVATIONS))
        profiles_graph = ds.graph(self.uri_builder.named_graph(GRAPH_PROFILES))
        provenance_graph = ds.graph(self.uri_builder.named_graph(GRAPH_PROVENANCE))
        geometry_graph = ds.graph(self.uri_builder.named_graph(GRAPH_GEOMETRY))
        mobility_graph = ds.graph(self.uri_builder.named_graph(GRAPH_MOBILITY))
        accidents_graph = ds.graph(self.uri_builder.named_graph(GRAPH_ACCIDENTS))
        transit_graph = ds.graph(self.uri_builder.named_graph(GRAPH_TRANSIT))

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

        for flow in mobility_data.flows:
            self._emit_mobility_flow(mobility_graph, flow)
        for accident in mobility_data.accidents:
            self._emit_road_accident(accidents_graph, geometry_graph, accident)
        for stop in mobility_data.transit_stops:
            self._emit_transit_stop(transit_graph, geometry_graph, stop)
        for route in mobility_data.transit_routes:
            self._emit_transit_route(transit_graph, route)

        if ontology_path is not None and ontology_path.exists():
            ontology_graph = ds.graph(self.uri_builder.named_graph(GRAPH_ONTOLOGY))
            bind_all(ontology_graph)
            ontology_graph.parse(ontology_path, format="turtle")

        return ds

    def build_graph(
        self,
        dataset: SeedDataset,
        *,
        ontology_path: Path | None = None,
        mobility: MobilityDataset | None = None,
    ) -> Graph:
        """Construye un ``Graph`` único con todas las tripletas.

        Útil en la MVP para ejecutar SPARQL sin preocuparnos por el grafo
        por defecto frente a los named graphs. El orden de inserción es
        irrelevante semánticamente pero se mantiene estable para producir
        serializaciones reproducibles.

        El parámetro opcional ``mobility`` mantiene la simetría con
        :meth:`build`: cuando se pasa, se emiten las tripletas M11 en el
        mismo grafo plano; cuando es ``None`` el comportamiento es idéntico
        al de la fase B.
        """
        graph = Graph()
        bind_all(graph)
        mobility_data = mobility or _EMPTY_MOBILITY

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

        for flow in mobility_data.flows:
            self._emit_mobility_flow(graph, flow)
        for accident in mobility_data.accidents:
            self._emit_road_accident(graph, graph, accident)
        for stop in mobility_data.transit_stops:
            self._emit_transit_stop(graph, graph, stop)
        for route in mobility_data.transit_routes:
            self._emit_transit_route(graph, route)

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

        Invariante administrativa esperada (no validada aquí porque la capa
        de dominio ya la ha asegurado):

        * Municipios: código INE de 5 dígitos y ``province_code`` de 2 dígitos.
        * Provincias: código INE de 2 dígitos y ``autonomous_community_code``
          de 2 dígitos compatible con la nomenclatura del INE.
        * Comunidades: código INE de 2 dígitos sin padre.
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

    def _emit_mobility_flow(self, graph: Graph, flow: MobilityFlowRecord) -> None:
        """Proyecta un flujo MITMA como ``ah:MobilityFlow``.

        El flujo se modela como ``sosa:Observation`` y ``qb:Observation``
        para reaprovechar herramientas estándar:

        * ``sosa:hasFeatureOfInterest`` apunta al territorio origen,
          consistente con la subPropertyOf declarada en la ontología sobre
          ``ah:flowOrigin``.
        * ``ah:flowDestination`` se mantiene como propiedad propia porque
          SOSA no expone una "feature de destino" canónica.
        * ``ah:flowTrips`` se reutiliza como ``sosa:hasSimpleResult``.
        """
        origin_uri = self._territory_uri_from_id(flow.origin)
        destination_uri = self._territory_uri_from_id(flow.destination)
        if origin_uri is None or destination_uri is None:
            # Se ignoran flujos cuyos territorios no se puedan resolver: el
            # SHACL fallaría igualmente y preferimos no emitir tripletas
            # huérfanas que dificulten el debugging.
            return
        origin_code = flow.origin.split(":", maxsplit=1)[1]
        destination_code = flow.destination.split(":", maxsplit=1)[1]
        subject = self.uri_builder.flow(origin_code, destination_code, flow.period, flow.mode)
        graph.add((subject, RDF.type, AH.MobilityFlow))
        graph.add((subject, RDF.type, SOSA.Observation))
        graph.add((subject, RDF.type, QB.Observation))
        graph.add((subject, RDF.type, PROV.Entity))
        graph.add((subject, AH.flowOrigin, origin_uri))
        graph.add((subject, SOSA.hasFeatureOfInterest, origin_uri))
        graph.add((subject, AH.flowDestination, destination_uri))
        graph.add((subject, AH.flowTrips, _decimal_literal(flow.trips)))
        graph.add((subject, SOSA.hasSimpleResult, _decimal_literal(flow.trips)))
        graph.add((subject, AH.period, Literal(flow.period, datatype=XSD.string)))
        if _YEAR_PATTERN.match(flow.period):
            graph.add((subject, AH.periodYear, Literal(flow.period, datatype=XSD.gYear)))
        if flow.mode:
            graph.add((subject, AH.flowMode, Literal(flow.mode, datatype=XSD.string)))
        if flow.distance_km is not None:
            graph.add((subject, AH.flowDistanceKm, _decimal_literal(flow.distance_km)))
        if flow.source_id:
            graph.add((subject, AH.providedBy, self.uri_builder.source(flow.source_id)))

    def _emit_road_accident(
        self,
        graph: Graph,
        geometry_graph: Graph,
        accident: RoadAccidentRecord,
    ) -> None:
        """Proyecta un accidente DGT con su geometría puntual.

        ``graph`` y ``geometry_graph`` pueden coincidir (caso ``build_graph``)
        o ser distintos (caso ``build`` con named graphs). La separación
        permite mantener todas las geometrías en su propio bucket reutilizando
        el mismo diseño que para los territorios.
        """
        subject = self.uri_builder.accident(accident.accident_id)
        graph.add((subject, RDF.type, AH.RoadAccident))
        graph.add((subject, RDF.type, GEO.Feature))
        graph.add((subject, RDF.type, PROV.Entity))
        graph.add(
            (
                subject,
                DCT.identifier,
                Literal(accident.accident_id, datatype=XSD.string),
            )
        )
        graph.add((subject, AH.accidentDate, Literal(accident.date, datatype=XSD.date)))
        # ``ah:accidentSeverity`` se emite como literal plano para que la
        # restricción SHACL ``sh:in`` (que compara estructuralmente) acepte
        # el valor. Misma lógica que ``ah:direction``.
        graph.add((subject, AH.accidentSeverity, Literal(accident.severity)))
        if _DATE_PATTERN.match(accident.date):
            year = accident.date.split("-", 1)[0]
            graph.add((subject, AH.accidentYear, Literal(year, datatype=XSD.gYear)))
        graph.add((subject, GEO_WGS84.lat, _decimal_literal(accident.lat)))
        graph.add((subject, GEO_WGS84.long, _decimal_literal(accident.lon)))
        if accident.victims is not None:
            graph.add(
                (
                    subject,
                    AH.accidentVictims,
                    Literal(accident.victims, datatype=XSD.integer),
                )
            )
        if accident.fatalities is not None:
            graph.add(
                (
                    subject,
                    AH.accidentFatalities,
                    Literal(accident.fatalities, datatype=XSD.integer),
                )
            )
        if accident.road_type:
            graph.add(
                (
                    subject,
                    AH.accidentRoadType,
                    Literal(accident.road_type, datatype=XSD.string),
                )
            )
        if accident.municipality_code:
            municipality_uri = self.uri_builder.territory(
                accident.municipality_code, TerritoryKind.MUNICIPALITY
            )
            graph.add((subject, AH.occursIn, municipality_uri))
        if accident.source_id:
            graph.add((subject, AH.providedBy, self.uri_builder.source(accident.source_id)))

        # Geometría puntual (CRS84) reutilizando la misma URI que territorios:
        # ``/resource/geometry/accident/<id>`` para no colisionar.
        geometry_uri = self.uri_builder.accident_geometry(accident.accident_id)
        graph.add((subject, AH.hasGeometry, geometry_uri))
        graph.add((subject, GEO.hasGeometry, geometry_uri))
        geometry_graph.add((geometry_uri, RDF.type, GEO.Geometry))
        geometry_graph.add((geometry_uri, RDF.type, GEO.Point))
        geometry_graph.add((geometry_uri, RDF.type, SF.Point))
        wkt_literal = Literal(
            _point_wkt(GeoPoint(lat=accident.lat, lon=accident.lon)),
            datatype=_WKT_LITERAL_DATATYPE,
        )
        geometry_graph.add((geometry_uri, GEO.asWKT, wkt_literal))
        geometry_graph.add((geometry_uri, AH.wktLiteral, wkt_literal))

    def _emit_transit_stop(
        self,
        graph: Graph,
        geometry_graph: Graph,
        stop: TransitStopRecord,
    ) -> None:
        """Proyecta una parada de transporte con su geometría puntual."""
        subject = self.uri_builder.transit_stop(stop.operator, stop.stop_id)
        graph.add((subject, RDF.type, AH.TransitStop))
        graph.add((subject, RDF.type, GEO.Feature))
        graph.add(
            (
                subject,
                DCT.identifier,
                Literal(f"{stop.operator}:{stop.stop_id}", datatype=XSD.string),
            )
        )
        graph.add((subject, RDFS.label, Literal(stop.name, lang="es")))
        graph.add((subject, AH.stopName, Literal(stop.name, datatype=XSD.string)))
        if stop.code:
            graph.add((subject, AH.stopCode, Literal(stop.code, datatype=XSD.string)))
        graph.add((subject, AH.operator, Literal(stop.operator, datatype=XSD.string)))
        graph.add((subject, GEO_WGS84.lat, _decimal_literal(stop.lat)))
        graph.add((subject, GEO_WGS84.long, _decimal_literal(stop.lon)))
        if stop.municipality_code:
            graph.add(
                (
                    subject,
                    AH.locatedIn,
                    self.uri_builder.territory(stop.municipality_code, TerritoryKind.MUNICIPALITY),
                )
            )
        if stop.source_id:
            graph.add((subject, AH.providedBy, self.uri_builder.source(stop.source_id)))

        geometry_uri = self.uri_builder.transit_stop_geometry(stop.operator, stop.stop_id)
        graph.add((subject, AH.hasGeometry, geometry_uri))
        graph.add((subject, GEO.hasGeometry, geometry_uri))
        geometry_graph.add((geometry_uri, RDF.type, GEO.Geometry))
        geometry_graph.add((geometry_uri, RDF.type, GEO.Point))
        geometry_graph.add((geometry_uri, RDF.type, SF.Point))
        wkt_literal = Literal(
            _point_wkt(GeoPoint(lat=stop.lat, lon=stop.lon)),
            datatype=_WKT_LITERAL_DATATYPE,
        )
        geometry_graph.add((geometry_uri, GEO.asWKT, wkt_literal))
        geometry_graph.add((geometry_uri, AH.wktLiteral, wkt_literal))

    def _emit_transit_route(self, graph: Graph, route: TransitRouteRecord) -> None:
        """Proyecta una ruta de transporte y su relación con paradas."""
        subject = self.uri_builder.transit_route(route.operator, route.route_id)
        graph.add((subject, RDF.type, AH.TransitRoute))
        graph.add(
            (
                subject,
                DCT.identifier,
                Literal(f"{route.operator}:{route.route_id}", datatype=XSD.string),
            )
        )
        graph.add((subject, RDFS.label, Literal(route.long_name or route.short_name, lang="es")))
        if route.short_name:
            graph.add((subject, AH.routeShortName, Literal(route.short_name, datatype=XSD.string)))
        if route.long_name:
            graph.add((subject, AH.routeLongName, Literal(route.long_name, datatype=XSD.string)))
        # Plain literal (sin datatype) para alinearse con ``sh:in`` de la shape.
        graph.add((subject, AH.transitMode, Literal(route.mode)))
        graph.add((subject, AH.operator, Literal(route.operator, datatype=XSD.string)))
        if route.source_id:
            graph.add((subject, AH.providedBy, self.uri_builder.source(route.source_id)))
        for stop_id in route.stop_ids:
            stop_uri = self.uri_builder.transit_stop(route.operator, stop_id)
            graph.add((subject, AH.servesStop, stop_uri))

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
    "GRAPH_ACCIDENTS",
    "GRAPH_GEOMETRY",
    "GRAPH_INDICATORS",
    "GRAPH_MOBILITY",
    "GRAPH_OBSERVATIONS",
    "GRAPH_ONTOLOGY",
    "GRAPH_PROFILES",
    "GRAPH_PROVENANCE",
    "GRAPH_SOURCES",
    "GRAPH_TERRITORIES",
    "GRAPH_TRANSIT",
    "GraphBuilder",
    "MobilityDataset",
    "MobilityFlowRecord",
    "RoadAccidentRecord",
    "TransitRouteRecord",
    "TransitStopRecord",
]
