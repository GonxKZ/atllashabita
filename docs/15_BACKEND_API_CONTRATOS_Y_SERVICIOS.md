# 15 — Backend, API, contratos y servicios

**Proyecto:** AtlasHabita

## 1. Objetivo

El backend actúa como frontera estable entre los datos, el grafo RDF, el scoring y el frontend. Debe exponer endpoints claros, validar parámetros y devolver respuestas explicables.

## 2. Servicios internos

| Servicio | Responsabilidad |
|---|---|
| `TerritoryService` | Buscar territorios, jerarquías y geometrías. |
| `IndicatorService` | Recuperar indicadores por territorio. |
| `SourceService` | Recuperar metadatos y estado de fuentes. |
| `ScoringService` | Calcular o leer scores y contribuciones. |
| `RDFService` | Ejecutar consultas SPARQL predefinidas y exportar RDF. |
| `MapLayerService` | Preparar GeoJSON simplificado para capas. |
| `QualityService` | Exponer reportes de calidad. |

## 3. Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado básico del sistema. |
| GET | `/profiles` | Lista de perfiles disponibles. |
| GET | `/territories/search?q=` | Buscar territorios por texto. |
| GET | `/territories/{id}` | Ficha territorial. |
| GET | `/territories/{id}/indicators` | Indicadores de un territorio. |
| GET | `/rankings` | Ranking parametrizado por perfil, ámbito y pesos. |
| POST | `/rankings/custom` | Ranking con configuración personalizada. |
| GET | `/map/layers` | Capas disponibles. |
| GET | `/map/layers/{layer_id}` | Datos GeoJSON/tiles de una capa. |
| GET | `/sources` | Fuentes disponibles y estado. |
| GET | `/sources/{id}` | Detalle de fuente. |
| GET | `/rdf/export` | Exportación RDF limitada. |
| GET | `/quality/reports` | Reportes de calidad. |

## 4. Contrato de ranking

### Request

```http
GET /rankings?profile=remote_work&scope=province:41&limit=20
```

### Response

```json
{
  "profile": "remote_work",
  "scope": "province:41",
  "scoring_version": "2026.04.1",
  "data_version": "2026.04.24",
  "results": [
    {
      "rank": 1,
      "territory_id": "municipality:41091",
      "name": "Sevilla",
      "province": "Sevilla",
      "score": 84.2,
      "confidence": 0.92,
      "highlights": ["Conectividad alta", "Servicios abundantes"],
      "warnings": ["Alquiler elevado"],
      "top_contributions": [
        {"factor": "connectivity", "impact": 24.1},
        {"factor": "services", "impact": 18.3}
      ]
    }
  ]
}
```

## 5. Contrato de ficha territorial

```json
{
  "id": "municipality:41091",
  "name": "Sevilla",
  "type": "municipality",
  "hierarchy": {
    "province": "Sevilla",
    "autonomous_community": "Andalucía"
  },
  "indicators": [
    {
      "id": "rent_median",
      "label": "Alquiler mediano",
      "value": 10.8,
      "unit": "EUR/m2/mes",
      "period": "2025",
      "source_id": "mivau_serpavi",
      "quality": "ok"
    }
  ],
  "scores": [
    {
      "profile": "remote_work",
      "score": 84.2,
      "version": "2026.04.1"
    }
  ]
}
```

## 6. Errores normalizados

| Código | Significado |
|---|---|
| `INVALID_PROFILE` | Perfil inexistente o mal formado. |
| `INVALID_SCOPE` | Ámbito territorial inválido. |
| `TERRITORY_NOT_FOUND` | No existe el territorio solicitado. |
| `INSUFFICIENT_DATA` | No hay datos suficientes para calcular score. |
| `SOURCE_UNAVAILABLE` | Fuente no disponible en la versión actual. |
| `QUALITY_BLOCKED` | Resultado bloqueado por validación de calidad. |

## 7. Seguridad de API

- Validar todos los parámetros.
- Limitar `limit` y paginación.
- No exponer rutas de ficheros internos.
- No permitir consultas SPARQL arbitrarias en modo público sin sandbox.
- Sanitizar textos de búsqueda.
- Registrar errores sin filtrar secretos.

## 8. Criterio de aceptación

La API es aceptable si el frontend puede construir mapa, ranking, ficha, comparador e inspector de fuentes sin leer ficheros internos ni conocer detalles del pipeline.
