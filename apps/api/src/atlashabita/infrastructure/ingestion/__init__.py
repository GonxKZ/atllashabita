"""Ingesta de datos: lectores del dataset seed y conectores reales.

Entradas principales:

- :class:`SeedLoader` y :func:`seed_loader_from_settings` continúan siendo el
  punto único de carga del dataset versionado bajo ``data/seed``.
- :class:`Downloader` encapsula cache, reintentos y verificación de
  integridad para todas las descargas HTTP.
- Conectores oficiales:

  * :class:`IneApiConnector` — INE datos abiertos (población, hogares).
  * :class:`IneAtlasRentaConnector` — Atlas de Distribución de Renta (INE).
  * :class:`IneDirceConnector` — DIRCE Directorio Central de Empresas (INE).
  * :class:`MitecoDemographicConnector` — MITECO Reto Demográfico (demografía).
  * :class:`MitecoServicesConnector` — MITECO Reto Demográfico (servicios).
  * :class:`MitmaMovilidadConnector` — MITMA estudio de movilidad big data.
  * :class:`DgtAccidentesConnector` — DGT anuario de accidentes con víctimas.
  * :class:`CrtmMadridConnector` — CRTM Madrid GTFS multimodal.

- :class:`DatasetBuilder` orquesta los conectores, produce los CSV
  normalizados bajo ``data/processed`` y el manifiesto de ejecución.
"""

from atlashabita.infrastructure.ingestion.crtm_madrid import (
    CrtmMadridConnector,
    CrtmPayload,
    RouteRecord,
    StopRecord,
)
from atlashabita.infrastructure.ingestion.dataset_builder import (
    DatasetBuilder,
    DatasetManifest,
    SourceArtifact,
)
from atlashabita.infrastructure.ingestion.dgt_accidentes import (
    AccidentRecord,
    DgtAccidentesConnector,
)
from atlashabita.infrastructure.ingestion.downloader import (
    DownloadedPayload,
    Downloader,
    IntegrityError,
    OfflineResourceMissingError,
)
from atlashabita.infrastructure.ingestion.ine_api import (
    IneApiConnector,
    PopulationRecord,
)
from atlashabita.infrastructure.ingestion.ine_atlas_renta import (
    IncomeRecord,
    IneAtlasRentaConnector,
)
from atlashabita.infrastructure.ingestion.ine_dirce import (
    EnterpriseRecord,
    IneDirceConnector,
)
from atlashabita.infrastructure.ingestion.miteco_demographic import (
    DemographicRecord,
    MitecoDemographicConnector,
)
from atlashabita.infrastructure.ingestion.miteco_services import (
    MitecoServicesConnector,
    ServicesRecord,
)
from atlashabita.infrastructure.ingestion.mitma_movilidad import (
    MitmaMovilidadConnector,
    MobilityRecord,
)
from atlashabita.infrastructure.ingestion.seed_loader import (
    SeedDataset,
    SeedLoader,
    seed_loader_from_settings,
)
from atlashabita.infrastructure.ingestion.sources import (
    SOURCE_REGISTRY,
    SourceMetadata,
    all_sources,
)

__all__ = [
    "SOURCE_REGISTRY",
    "AccidentRecord",
    "CrtmMadridConnector",
    "CrtmPayload",
    "DatasetBuilder",
    "DatasetManifest",
    "DemographicRecord",
    "DgtAccidentesConnector",
    "DownloadedPayload",
    "Downloader",
    "EnterpriseRecord",
    "IncomeRecord",
    "IneApiConnector",
    "IneAtlasRentaConnector",
    "IneDirceConnector",
    "IntegrityError",
    "MitecoDemographicConnector",
    "MitecoServicesConnector",
    "MitmaMovilidadConnector",
    "MobilityRecord",
    "OfflineResourceMissingError",
    "PopulationRecord",
    "RouteRecord",
    "SeedDataset",
    "SeedLoader",
    "ServicesRecord",
    "SourceArtifact",
    "SourceMetadata",
    "StopRecord",
    "all_sources",
    "seed_loader_from_settings",
]
