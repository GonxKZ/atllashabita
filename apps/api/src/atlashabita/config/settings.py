"""Configuración del backend cargada desde variables de entorno.

La configuración se centraliza en un único modelo Pydantic que se inyecta en los
casos de uso. Así evitamos leer ``os.environ`` en capas internas, mantenemos
trazabilidad de qué variables afectan al comportamiento y facilitamos tests que
sustituyen valores concretos sin tocar el entorno global.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """Parámetros globales del backend.

    Los valores por defecto están pensados para funcionar en desarrollo local y
    en pruebas sin necesidad de variables de entorno adicionales. Producción
    debe establecer al menos ``ATLASHABITA_ENV`` y los directorios de datos.
    """

    model_config = SettingsConfigDict(
        env_prefix="ATLASHABITA_",
        env_file=(REPO_ROOT / ".env", REPO_ROOT / ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = Field(default="development", description="Identificador del entorno.")
    app_name: str = Field(default="AtlasHabita API", description="Nombre visible de la API.")
    app_version: str = Field(default="0.1.0", description="Versión del backend.")

    cors_allow_origins: tuple[str, ...] = Field(
        default=("http://localhost:5173", "http://127.0.0.1:5173"),
        description="Orígenes aceptados por el middleware CORS.",
    )

    data_root: Path = Field(
        default=REPO_ROOT / "data",
        description="Directorio raíz con las zonas de datos (raw, interim, processed, rdf).",
    )
    ontology_root: Path = Field(
        default=REPO_ROOT / "ontology",
        description="Directorio con la ontología y las shapes SHACL.",
    )

    scoring_version: str = Field(default="2026.04.1")
    rdf_graph_base_uri: str = Field(default="https://data.atlashabita.example/")

    sparql_max_results: int = Field(default=500, ge=1, le=10_000)
    sparql_timeout_seconds: float = Field(default=5.0, ge=0.1, le=60.0)
    sparql_allow_update: bool = Field(default=False)

    cache_ttl_seconds: int = Field(default=300, ge=0)
    cache_max_entries: int = Field(default=256, ge=1)

    request_max_limit: int = Field(default=200, ge=1, le=1000)

    def data_zone(self, zone: str) -> Path:
        """Devuelve el directorio normalizado de una zona de datos."""
        allowed = {"raw", "interim", "processed", "rdf", "reports", "seed"}
        if zone not in allowed:
            raise ValueError(f"Zona de datos desconocida: {zone!r}")
        return self.data_root / zone


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton de configuración cacheado."""
    return Settings()
