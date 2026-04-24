"""Constructor determinista de URIs para AtlasHabita.

Las URIs son el eje de identidad del grafo RDF. Este módulo aísla toda la
lógica de construcción para:

* Garantizar **determinismo**: dos ejecuciones con el mismo input producen las
  mismas URIs.
* Evitar la dispersión de plantillas de URI por el código (DRY).
* Facilitar tests puros que no necesitan un grafo completo.

La política sigue el documento ``docs/11_MODELO_DE_DATOS_RDF_Y_ONTOLOGIA.md``:
recursos bajo ``/resource/<dominio>/...`` y named graphs bajo
``/graph/<dominio>``. Los nombres con tildes o caracteres especiales se
normalizan con ``python-slugify`` para producir segmentos URL seguros sin
perder la identidad semántica (el código INE se mantiene como primario).

Fase B (M8) añade dos nuevos tipos de recurso:

* **Geometrías GeoSPARQL** (``/resource/geometry/<kind>/<code>``).
* **Actividades PROV-O de ingesta** (``/resource/activity/<source>/<period>``)
  identificadas por la tupla fuente+periodo, de forma que una misma ingesta
  se deduplica y sus observaciones apuntan a una sola URI.

Milestone M11 incorpora cuatro tipos adicionales para los datasets MITMA,
DGT y CRTM/GTFS:

* **Flujos de movilidad** (``/resource/flow/<origin>/<destination>/<period>[/<mode>]``)
  con identidad determinista por origen, destino y periodo. Cuando el
  registro original distingue por modo de transporte, se incluye como
  cuarto segmento para evitar colisiones.
* **Accidentes viales** (``/resource/accident/<id>``) donde ``<id>`` es el
  identificador estable proporcionado por la DGT.
* **Paradas de transporte** (``/resource/transit_stop/<operator>/<stop_id>``)
  alineado con la convención GTFS ``agency_id + stop_id``.
* **Rutas de transporte** (``/resource/transit_route/<operator>/<route_id>``)
  alineado con GTFS ``agency_id + route_id``.
"""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote

from rdflib import URIRef
from slugify import slugify

from atlashabita.domain.territories import TerritoryKind

_TERRITORY_KIND_SEGMENT: dict[TerritoryKind, str] = {
    TerritoryKind.AUTONOMOUS_COMMUNITY: "autonomous_community",
    TerritoryKind.PROVINCE: "province",
    TerritoryKind.MUNICIPALITY: "municipality",
}


@dataclass(frozen=True, slots=True)
class URIBuilder:
    """Genera URIs estables para los recursos del dominio.

    La clase es inmutable y sus métodos son puros: solo dependen de la base
    fijada en el constructor y del input explícito. Esto permite reutilizar
    la misma instancia entre hilos y cachear resultados sin sorpresas.
    """

    base_uri: str

    def __post_init__(self) -> None:
        if not self.base_uri:
            raise ValueError("base_uri no puede ser vacío.")
        # Normalización mínima: garantizar que termina en ``/`` para poder
        # concatenar segmentos sin ambigüedad en el resto de métodos.
        if not self.base_uri.endswith("/"):
            object.__setattr__(self, "base_uri", self.base_uri + "/")

    @property
    def resource_base(self) -> str:
        """Prefijo común de todos los recursos (``.../resource/``)."""
        return f"{self.base_uri}resource/"

    @property
    def graph_base(self) -> str:
        """Prefijo común de los named graphs (``.../graph/``)."""
        return f"{self.base_uri}graph/"

    def territory(self, code: str, kind: TerritoryKind) -> URIRef:
        """URI del territorio ``{kind}/{code}``.

        El código INE es estable y único dentro de su nivel, por lo que no se
        necesita slugificar. Sí se valida que no sea vacío para abortar pronto
        cuando un CSV mal formado llegue hasta esta capa.
        """
        self._require_non_empty(code, "code")
        segment = _TERRITORY_KIND_SEGMENT[kind]
        return URIRef(f"{self.resource_base}territory/{segment}/{_safe(code)}")

    def geometry(self, code: str, kind: TerritoryKind) -> URIRef:
        """URI de la geometría asociada a un territorio.

        Se usa una URI dedicada (``/resource/geometry/<kind>/<code>``) en
        lugar de un blank node porque GeoSPARQL y SPARQL federado sólo
        pueden referenciar recursos con IRI estable (p.ej. para consultas
        de distancia entre geometrías de distintos grafos).
        """
        self._require_non_empty(code, "code")
        segment = _TERRITORY_KIND_SEGMENT[kind]
        return URIRef(f"{self.resource_base}geometry/{segment}/{_safe(code)}")

    def indicator(self, code: str) -> URIRef:
        """URI del indicador ``indicator/{code}``."""
        self._require_non_empty(code, "code")
        return URIRef(f"{self.resource_base}indicator/{_safe(code)}")

    def observation(self, indicator_code: str, territory_id: str, period: str) -> URIRef:
        """URI de una observación.

        ``territory_id`` llega en formato ``municipality:41091``. Se sustituye
        el separador por ``/`` para obtener un segmento de URL plano y legible
        sin introducir caracteres especiales.
        """
        self._require_non_empty(indicator_code, "indicator_code")
        self._require_non_empty(territory_id, "territory_id")
        self._require_non_empty(period, "period")
        territory_plain = territory_id.replace(":", "/")
        return URIRef(
            f"{self.resource_base}observation/"
            f"{_safe(indicator_code)}/{_safe(territory_plain)}/{_safe(period)}"
        )

    def source(self, source_id: str) -> URIRef:
        """URI de una fuente de datos."""
        self._require_non_empty(source_id, "source_id")
        return URIRef(f"{self.resource_base}source/{_safe(source_id)}")

    def activity(self, source_id: str, period: str) -> URIRef:
        """URI de una actividad PROV-O de ingesta.

        La tupla ``(source_id, period)`` es la clave de deduplicación natural:
        varias observaciones ingeridas en la misma ejecución de ``source_id``
        para un ``period`` concreto comparten la misma actividad, reforzando
        el análisis de procedencia y reduciendo la explosión combinatoria.
        """
        self._require_non_empty(source_id, "source_id")
        self._require_non_empty(period, "period")
        return URIRef(f"{self.resource_base}activity/{_safe(source_id)}/{_safe(period)}")

    def profile(self, profile_id: str) -> URIRef:
        """URI de un perfil de decisión."""
        self._require_non_empty(profile_id, "profile_id")
        return URIRef(f"{self.resource_base}profile/{_safe(profile_id)}")

    def score(self, version: str, profile_id: str, territory_id: str) -> URIRef:
        """URI de un score versionado.

        Incluye versión, perfil y territorio para que una misma combinación no
        se pise al regenerar scores entre releases.
        """
        self._require_non_empty(version, "version")
        self._require_non_empty(profile_id, "profile_id")
        self._require_non_empty(territory_id, "territory_id")
        territory_plain = territory_id.replace(":", "/")
        return URIRef(
            f"{self.resource_base}score/"
            f"{_safe(version)}/{_safe(profile_id)}/{_safe(territory_plain)}"
        )

    def named_graph(self, domain: str) -> URIRef:
        """URI del named graph de un dominio (territories, observations...)."""
        self._require_non_empty(domain, "domain")
        return URIRef(f"{self.graph_base}{_safe(domain)}")

    def flow(
        self,
        origin_code: str,
        destination_code: str,
        period: str,
        mode: str | None = None,
    ) -> URIRef:
        """URI determinista de un flujo de movilidad MITMA.

        Se elige la tupla ``(origen, destino, periodo[, modo])`` como clave
        natural porque MITMA agrega los desplazamientos por origen/destino
        municipal y por periodo (mes/trimestre/año). Cuando el dataset
        diferencia el modo (coche, transporte público...) se incluye como
        cuarto segmento para evitar colisiones entre filas que comparten
        origen-destino-periodo.
        """
        self._require_non_empty(origin_code, "origin_code")
        self._require_non_empty(destination_code, "destination_code")
        self._require_non_empty(period, "period")
        base = (
            f"{self.resource_base}flow/"
            f"{_safe(origin_code)}/{_safe(destination_code)}/{_safe(period)}"
        )
        if mode is None or not mode.strip():
            return URIRef(base)
        return URIRef(f"{base}/{_safe(mode)}")

    def accident(self, accident_id: str) -> URIRef:
        """URI de un accidente vial DGT.

        ``accident_id`` debe ser el identificador estable que la DGT publica
        en sus microdatos (``ID_ACCIDENTE``). Si la fuente no proporciona
        identificador, la capa de ingesta debe sintetizar uno determinista a
        partir de fecha + coordenada + carretera para garantizar idempotencia.
        """
        self._require_non_empty(accident_id, "accident_id")
        return URIRef(f"{self.resource_base}accident/{_safe(accident_id)}")

    def transit_stop(self, operator: str, stop_id: str) -> URIRef:
        """URI de una parada de transporte GTFS/CRTM.

        Se usa la convención ``agency_id + stop_id`` para evitar colisiones
        entre operadores cuando se federen distintos GTFS (CRTM, EMT,
        Cercanías, Metro). El operador siempre forma parte de la URI.
        """
        self._require_non_empty(operator, "operator")
        self._require_non_empty(stop_id, "stop_id")
        return URIRef(f"{self.resource_base}transit_stop/{_safe(operator)}/{_safe(stop_id)}")

    def transit_route(self, operator: str, route_id: str) -> URIRef:
        """URI de una ruta de transporte GTFS/CRTM.

        Idéntica política a :meth:`transit_stop`: ``agency_id + route_id``
        garantiza unicidad cuando coexisten varias agencias en el grafo.
        """
        self._require_non_empty(operator, "operator")
        self._require_non_empty(route_id, "route_id")
        return URIRef(f"{self.resource_base}transit_route/{_safe(operator)}/{_safe(route_id)}")

    def accident_geometry(self, accident_id: str) -> URIRef:
        """URI de la geometría puntual asociada a un accidente DGT.

        Se mantiene la misma política de slug/quote que el resto de URIs
        para producir IRIs deterministas y URL-safe.
        """
        self._require_non_empty(accident_id, "accident_id")
        return URIRef(f"{self.resource_base}geometry/accident/{_safe(accident_id)}")

    def transit_stop_geometry(self, operator: str, stop_id: str) -> URIRef:
        """URI de la geometría puntual asociada a una parada de transporte."""
        self._require_non_empty(operator, "operator")
        self._require_non_empty(stop_id, "stop_id")
        return URIRef(
            f"{self.resource_base}geometry/transit_stop/{_safe(operator)}/{_safe(stop_id)}"
        )

    @staticmethod
    def _require_non_empty(value: str, field_name: str) -> None:
        if not value or not value.strip():
            raise ValueError(f"URIBuilder: {field_name} no puede ser vacío.")


def _safe(segment: str) -> str:
    """Normaliza un segmento de URL.

    Se usa ``slugify`` para nombres con tildes (``Málaga`` -> ``malaga``). Los
    guiones bajos se preservan porque los códigos canónicos de indicadores y
    perfiles (``rent_median``, ``remote_work``) los usan como identidad estable
    en el CSV y en SPARQL. El separador ``/`` se mantiene para rutas
    compuestas y finalmente se aplica ``quote`` por seguridad frente a
    caracteres no previstos.
    """
    stripped = segment.strip()
    slug = slugify(
        stripped,
        lowercase=False,
        separator="_",
        regex_pattern=r"[^A-Za-z0-9_/.-]+",
    )
    candidate = slug or stripped
    return quote(candidate, safe="-._~/")


__all__ = ["URIBuilder"]
