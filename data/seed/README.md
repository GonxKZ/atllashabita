# Dataset seed AtlasHabita — cobertura nacional

Datos versionados para que el pipeline funcione sin conexión a fuentes externas y los tests sean deterministas. Siguen el contrato definido en `docs/12_INGESTA_ETL_ELT_Y_CALIDAD_DE_DATOS.md` y se expanden a cobertura nacional tras la Fase A del milestone M8.

## Conteos actuales

| Archivo | Contenido | Filas |
|---|---|---|
| `territories.csv` | 19 CCAA (17 + Ceuta y Melilla) + 52 provincias + 101 municipios. | 172 |
| `sources.csv` | Fuentes oficiales con URLs reales (MIVAU SERPAVI, INE datos abiertos, INE Atlas de Renta, INE DIRCE, MITECO Reto Demográfico demografía y servicios, SETELECO, AEMET). | 8 |
| `indicators.csv` | Indicadores semánticos: rent_median, broadband_coverage, income_per_capita, services_score, climate_comfort, population_total, age_median, household_size, enterprise_density. | 9 |
| `observations.csv` | Observaciones municipio × indicador (101 × 9). | 909 |
| `profiles.csv` | Perfiles de decisión: remote_work, family, student y retire. | 4 |

## Procedencia

- **Municipios**: 17 capitales de CCAA + 52 capitales de provincia + 32 municipios adicionales (top por población o relevancia territorial) repartidos por todas las CCAA.
- **Valores**: se combinan extracciones reales de las fuentes oficiales (cuando el conector offline las ha cacheado) con extrapolaciones deterministas alineadas con cifras publicadas en 2024/2025 (SERPAVI, INE Atlas de Renta, SETELECO, AEMET, MITECO Reto Demográfico).
- **Códigos INE**: 5 dígitos para municipios, 2 para provincias y CCAA. Ceuta y Melilla se modelan como CCAA + provincia (códigos 18/51 y 19/52) por coherencia con el pipeline territorial.

Los CSV auxiliares por fuente (``data/processed/*.csv``) los escribe el `DatasetBuilder` a partir de las respuestas cacheadas. Ejecuta::

    python scripts/data_pipeline.py ingest

Para repetir la descarga real habilita ``ATLASHABITA_INGESTION_ONLINE=1``.
