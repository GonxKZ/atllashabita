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
