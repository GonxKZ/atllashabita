# Dataset demo AtlasHabita

Datos base versionados para que el pipeline funcione sin conexión a fuentes externas y los tests sean deterministas. Siguen el contrato definido en `docs/12_INGESTA_ETL_ELT_Y_CALIDAD_DE_DATOS.md`.

| Archivo | Contenido | Filas |
|---|---|---|
| `territories.csv` | Comunidades, provincias y municipios con centroides y población. | 15 |
| `sources.csv` | Catálogo de fuentes oficiales (SERPAVI, INE, MITECO, SETELECO, AEMET). | 5 |
| `indicators.csv` | Definiciones semánticas de indicadores con unidad y direccionalidad. | 5 |
| `observations.csv` | Valores observados por (indicador, territorio, periodo). | 50 |
| `profiles.csv` | Perfiles de decisión con pesos por indicador. | 3 |

Los valores son coherentes con cifras publicadas por las fuentes indicadas en 2024/2025. Se mantienen como datos **demo**: para una ejecución real se reemplazan con las descargas oficiales manteniendo el mismo esquema.
