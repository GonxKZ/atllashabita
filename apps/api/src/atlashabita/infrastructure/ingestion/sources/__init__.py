"""Registro central de fuentes oficiales con metadatos y URLs canónicas.

Cada entrada del registro describe una fuente real (INE, MITECO, etc.) con su
identificador interno, publisher, licencia, URL de aterrizaje (landing page) y
las rutas por defecto de los ficheros generados en ``data/processed``.

El registro se expone como estructura inmutable para que los conectores y el
constructor de dataset puedan resolver sin acoplarse a literales distribuidos.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from types import MappingProxyType
from typing import Final


@dataclass(frozen=True, slots=True)
class SourceMetadata:
    """Metadatos canónicos de una fuente oficial."""

    id: str
    title: str
    publisher: str
    landing_url: str
    license: str
    periodicity: str
    description: str
    indicators: tuple[str, ...] = field(default_factory=tuple)
    fixture_name: str = ""
    processed_filename: str = ""


_REGISTRY: Final[dict[str, SourceMetadata]] = {
    "ine_datosabiertos": SourceMetadata(
        id="ine_datosabiertos",
        title="INE - Datos abiertos (población y hogares)",
        publisher="Instituto Nacional de Estadística",
        landing_url="https://www.ine.es/datosabiertos/",
        license="CC BY 4.0",
        periodicity="anual",
        description=("Población y características del hogar por municipio (padrón y censo)."),
        indicators=("population_total", "household_size"),
        fixture_name="ine_api_population.json",
        processed_filename="ine_population.csv",
    ),
    "ine_atlas_renta": SourceMetadata(
        id="ine_atlas_renta",
        title="Atlas de Distribución de Renta de los Hogares",
        publisher="Instituto Nacional de Estadística",
        landing_url="https://www.ine.es/dynt3/inebase/index.htm?capsel=5650&padre=12385",
        license="CC BY 4.0",
        periodicity="anual",
        description="Renta neta por persona a nivel municipal y sección censal.",
        indicators=("income_per_capita",),
        fixture_name="ine_atlas_renta.json",
        processed_filename="ine_income.csv",
    ),
    "ine_dirce": SourceMetadata(
        id="ine_dirce",
        title="DIRCE - Directorio Central de Empresas",
        publisher="Instituto Nacional de Estadística",
        landing_url=(
            "https://www.ine.es/dyngs/INEbase/operacion.htm?"
            "c=Estadistica_C&cid=1254736160707&idp=1254735576550&menu=ultiDatos"
        ),
        license="CC BY 4.0",
        periodicity="anual",
        description="Empresas activas por CNAE y municipio.",
        indicators=("enterprise_density",),
        fixture_name="ine_dirce.json",
        processed_filename="ine_enterprises.csv",
    ),
    "miteco_reto_demografico_demografia": SourceMetadata(
        id="miteco_reto_demografico_demografia",
        title="Reto Demográfico - datos demográficos",
        publisher="Ministerio para la Transición Ecológica",
        landing_url=(
            "https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/"
            "reto-demografico/datos-demograficos.html"
        ),
        license="CC BY 4.0",
        periodicity="anual",
        description=("Indicadores demográficos (edad; crecimiento; envejecimiento) por municipio."),
        indicators=("age_median",),
        fixture_name="miteco_demographic.json",
        processed_filename="miteco_demographic.csv",
    ),
    "miteco_reto_demografico_servicios": SourceMetadata(
        id="miteco_reto_demografico_servicios",
        title="Reto Demográfico - servicios municipales",
        publisher="Ministerio para la Transición Ecológica",
        landing_url=(
            "https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/"
            "reto-demografico/datos-servicios.html"
        ),
        license="CC BY 4.0",
        periodicity="anual",
        description="Indicadores de servicios básicos por municipio.",
        indicators=("services_score",),
        fixture_name="miteco_services.json",
        processed_filename="miteco_services.csv",
    ),
    "mitma_movilidad": SourceMetadata(
        id="mitma_movilidad",
        title="Estudio de movilidad MITMA con big data",
        publisher="Ministerio de Transportes y Movilidad Sostenible",
        landing_url="https://movilidad-opendata.mitma.es/",
        license="CC BY 4.0",
        periodicity="diaria",
        description=(
            "Flujos origen-destino agregados a partir de telefonía móvil "
            "anonimizada (estudio MITMA de movilidad cotidiana)."
        ),
        indicators=("mobility_flow",),
        fixture_name="mitma_movilidad.json",
        processed_filename="mitma_movilidad.csv",
    ),
    "dgt_accidentes": SourceMetadata(
        id="dgt_accidentes",
        title="DGT - Anuario estadístico de accidentes",
        publisher="Dirección General de Tráfico",
        landing_url=(
            "https://www.dgt.es/menusecundario/dgt-en-cifras/"
            "dgt-en-cifras-resultados/dgt-en-cifras-detalle/"
        ),
        license="CC BY 4.0",
        periodicity="mensual",
        description=(
            "Accidentes con víctimas por municipio y mes, distinguiendo "
            "fallecidos, heridos graves y heridos leves."
        ),
        indicators=("accident_rate",),
        fixture_name="dgt_accidentes.csv",
        processed_filename="dgt_accidentes.csv",
    ),
    "crtm_gtfs": SourceMetadata(
        id="crtm_gtfs",
        title="CRTM Madrid - GTFS multimodal",
        publisher="Consorcio Regional de Transportes de Madrid",
        landing_url=("https://datos.crtm.es/datasets/1a25440bf66f499bae2657ec7fb40144"),
        license="CC BY 4.0",
        periodicity="continua",
        description=(
            "Paradas y rutas multimodales (Metro, Cercanías, Metro Ligero, "
            "EMT, autobuses interurbanos) en formato GTFS."
        ),
        indicators=("transit_score",),
        fixture_name="crtm_gtfs.json",
        processed_filename="crtm_transit.csv",
    ),
}

SOURCE_REGISTRY: Final[MappingProxyType[str, SourceMetadata]] = MappingProxyType(_REGISTRY)


def source(source_id: str) -> SourceMetadata:
    """Devuelve los metadatos de la fuente con ``source_id``.

    Raises:
        KeyError: si ``source_id`` no existe en el registro.
    """
    try:
        return SOURCE_REGISTRY[source_id]
    except KeyError as exc:  # pragma: no cover — error de programación.
        raise KeyError(f"Fuente desconocida: {source_id!r}") from exc


def all_sources() -> tuple[SourceMetadata, ...]:
    """Devuelve todas las fuentes registradas en orden estable."""
    return tuple(sorted(SOURCE_REGISTRY.values(), key=lambda s: s.id))


def default_fixture_dir() -> Path:
    """Ruta canónica donde se versionan los fixtures de fuentes."""
    return Path(__file__).resolve().parents[5] / "tests" / "fixtures" / "ingestion"


__all__ = [
    "SOURCE_REGISTRY",
    "SourceMetadata",
    "all_sources",
    "default_fixture_dir",
    "source",
]
