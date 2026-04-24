# API REST de AtlasHabita

Catálogo operativo de endpoints expuestos por `apps/api` (FastAPI). Alinea el contrato del servidor con los consumidores del frontend (`apps/web`) y documenta los códigos de error normalizados. Para la discusión extendida consulta [`15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md`](15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md).

---

## 1. Convenciones

- **Base URL**: `http://127.0.0.1:8000` en local.
- **Formato**: `application/json` (UTF-8); `application/geo+json` en capas de mapa.
- **Autenticación**: no requerida en MVP (modo lectura pública). El panel técnico queda detrás de un flag `ATLASHABITA_ADMIN=1`.
- **Paginación**: parámetros `limit` (≤ 200) y `offset` (≥ 0).
- **Idempotencia**: todos los endpoints `GET` son idempotentes y cacheables por `ETag` cuando aplique.
- **Versionado de datos**: cada respuesta principal incluye `scoring_version` y/o `data_version`.
- **Documentación interactiva**: `/docs` (Swagger UI) y `/redoc`.

---

## 2. Catálogo

| Método | Ruta | Estado | Descripción |
|---|---|---|---|
| GET | `/health` | **completado** | Estado básico del backend. |
| GET | `/profiles` | ready | Lista de perfiles de decisión disponibles. |
| GET | `/profiles/{profile_id}` | ready | Metadatos y pesos por defecto de un perfil. |
| GET | `/territories/search?q=` | ready | Búsqueda textual tolerante a tildes y mayúsculas. |
| GET | `/territories/{id}` | ready | Ficha territorial completa. |
| GET | `/territories/{id}/indicators` | ready | Listado de indicadores del territorio. |
| GET | `/rankings` | ready | Ranking parametrizado por perfil y ámbito. |
| POST | `/rankings/custom` | ready | Ranking con pesos y filtros personalizados. |
| GET | `/map/layers` | ready | Catálogo de capas disponibles. |
| GET | `/map/layers/{layer_id}` | ready | GeoJSON simplificado de una capa. |
| GET | `/sources` | ready | Catálogo de fuentes y estado. |
| GET | `/sources/{id}` | ready | Detalle de una fuente (licencia, periodicidad, cobertura). |
| GET | `/rdf/export` | **completado** | Exportación RDF (Turtle/JSON-LD/NT/TriG) con streaming y tope de 16 MB. |
| POST | `/sparql` | **completado** | Ejecuta una consulta del catálogo con `{query_id, bindings}`; devuelve filas, variables y `elapsed_ms`. |
| GET | `/sparql/catalog` | **completado** | Firmas (`query_id`, bindings esperados, descripción en español) de las consultas disponibles. |
| GET | `/quality/reports` | ready | Reportes de calidad por fuente y ejecución. |

Los estados siguen el roadmap: **completado** = implementado en `develop`; **ready** = especificado y pendiente de implementación en la fase 4 ([`roadmap.md`](roadmap.md)).

---

## 3. Contratos

### 3.1 `GET /health`

**Response 200**

```json
{
  "status": "ok",
  "name": "AtlasHabita",
  "version": "0.1.0",
  "environment": "local",
  "timestamp": "2026-04-24T10:15:00+00:00"
}
```

Implementado en [`apps/api/src/atlashabita/interfaces/api/routers/health.py`](../apps/api/src/atlashabita/interfaces/api/routers/health.py).

---

### 3.2 `GET /profiles`

**Response 200**

```json
{
  "items": [
    {
      "id": "remote_work",
      "label": "Teletrabajador",
      "description": "Prioriza conectividad, servicios y coste de vida.",
      "default_weights": {
        "connectivity": 0.30,
        "rent_median": 0.25,
        "services": 0.20,
        "environment": 0.15,
        "mobility": 0.10
      }
    }
  ]
}
```

---

### 3.3 `GET /territories/search?q=`

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `q` | string | sí | Texto de búsqueda (min. 2 caracteres). |
| `scope` | string | no | `country` (por defecto), `ccaa:<id>`, `province:<id>`. |
| `limit` | int | no | 1–50 (por defecto 20). |

**Response 200**

```json
{
  "query": "sevilla",
  "results": [
    {
      "id": "municipality:41091",
      "name": "Sevilla",
      "province": "Sevilla",
      "autonomous_community": "Andalucía",
      "type": "municipality"
    }
  ]
}
```

---

### 3.4 `GET /territories/{id}`

**Path params:** `id` con el patrón `<type>:<codigo>` (`municipality:41091`, `province:41`, `autonomous_community:01`).

**Response 200**

```json
{
  "id": "municipality:41091",
  "name": "Sevilla",
  "type": "municipality",
  "hierarchy": {
    "province": "Sevilla",
    "autonomous_community": "Andalucía"
  },
  "geometry_centroid": [-5.9823, 37.3886],
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
      "confidence": 0.92,
      "scoring_version": "2026.04.1"
    }
  ]
}
```

---

### 3.5 `GET /rankings`

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `profile` | string | sí | `remote_work`, `student`, `family`, etc. |
| `scope` | string | no | `country` (por defecto), `ccaa:<id>`, `province:<id>`. |
| `limit` | int | no | 1–200 (por defecto 20). |
| `offset` | int | no | ≥ 0 (por defecto 0). |

**Response 200**

```json
{
  "profile": "remote_work",
  "scope": "province:41",
  "scoring_version": "2026.04.1",
  "data_version": "2026.04.24",
  "pagination": { "limit": 20, "offset": 0, "total": 85 },
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
        { "factor": "connectivity", "weight": 0.30, "impact": 24.1 },
        { "factor": "services",     "weight": 0.20, "impact": 18.3 }
      ]
    }
  ]
}
```

---

### 3.6 `POST /rankings/custom`

**Request body**

```json
{
  "profile": "remote_work",
  "scope": "country",
  "weights_override": {
    "connectivity": 0.40,
    "rent_median": 0.30,
    "services": 0.15,
    "environment": 0.10,
    "mobility": 0.05
  },
  "hard_filters": {
    "max_rent_median": 12.0,
    "min_connectivity": 0.70
  },
  "limit": 50
}
```

**Response 200**: mismo contrato que `GET /rankings` con el bloque `applied_weights` y `applied_filters` añadido.

Validaciones:

- Suma de pesos = 1.0 ± 1e-6.
- Pesos ∈ [0, 1].
- Filtros duros referencian indicadores existentes.

---

### 3.7 `GET /map/layers` y `GET /map/layers/{layer_id}`

`GET /map/layers` devuelve el catálogo:

```json
{
  "items": [
    { "id": "score_remote_work", "label": "Score teletrabajo", "type": "choropleth" },
    { "id": "rent_median",       "label": "Alquiler mediano",  "type": "choropleth" },
    { "id": "hospitals",         "label": "Hospitales",        "type": "poi" }
  ]
}
```

`GET /map/layers/{layer_id}` devuelve un `FeatureCollection` GeoJSON simplificado compatible con MapLibre.

---

### 3.8 `GET /sources` y `GET /sources/{id}`

**Response 200 (detalle)**

```json
{
  "id": "mivau_serpavi",
  "title": "Sistema Estatal de Referencia del Precio del Alquiler",
  "license": "CC BY 4.0",
  "periodicity": "anual",
  "last_ingestion": "2026-04-20T09:30:00Z",
  "coverage": {
    "municipal": 0.96,
    "indicators": ["rent_median"]
  },
  "status": "ok"
}
```

---

### 3.9 `GET /rdf/export`

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `format` | enum | no | `turtle` (por defecto), `trig`, `json-ld`, `nt`. |

La respuesta adjunta `Content-Type` apropiado según el formato solicitado:

| Formato | `Content-Type` |
|---|---|
| `turtle` | `text/turtle; charset=utf-8` |
| `json-ld` | `application/ld+json` |
| `nt` | `application/n-triples` |
| `trig` | `application/trig` |

La respuesta se emite en streaming (`StreamingResponse`) dividiendo el payload
en chunks de 64 KB. rdflib no ofrece serialización incremental cuando el
grafo está en memoria, por lo que el payload se materializa completo y luego
se trocea. Existe un tope defensivo de 16 MB: si se supera, el servidor
devuelve `413 PAYLOAD_TOO_LARGE` en lugar de bloquear el proceso.

---

### 3.10 `POST /sparql`

Ejecuta una consulta **de catálogo** (whitelist). El cuerpo JSON es:

```json
{
  "query_id": "top_scores_by_profile",
  "bindings": { "profile_id": "remote_work", "limit": 10 }
}
```

`query_id` admite los valores:

- `top_scores_by_profile` (bindings: `profile_id`, opcionales `scope`, `limit`).
- `municipalities_by_province` (bindings: `province_code`).
- `indicators_for_territory` (bindings: `territory_id`).
- `sources_used_by_territory` (bindings: `territory_id`).
- `count_triples_by_class` (sin bindings).
- `indicator_definition` (bindings: `indicator_code`).

**Response 200**

```json
{
  "query_id": "top_scores_by_profile",
  "rows": [
    { "territory": "https://.../municipality/41091", "score": 82.1 }
  ],
  "elapsed_ms": 12
}
```

**Errores**

- `INVALID_QUERY` (400): `query_id` fuera del catálogo. `details.allowed`
  enumera las opciones válidas.
- `INVALID_BINDINGS` (400): falta un binding obligatorio o su tipo no encaja.

La ejecución respeta `settings.sparql_max_results` y
`settings.sparql_timeout_seconds`. El backend concreto (rdflib en memoria o
Fuseki remoto) se selecciona con `ATLASHABITA_SPARQL_BACKEND`.

---

### 3.11 `GET /sparql/catalog`

Devuelve la descripción pública de cada consulta disponible:

```json
{
  "queries": [
    {
      "query_id": "top_scores_by_profile",
      "description": "Top territorios por perfil...",
      "required": ["profile_id"],
      "optional": ["scope", "limit"]
    }
  ]
}
```

Este endpoint es el contrato mínimo que deben consultar los clientes antes
de invocar `POST /sparql`, permitiendo validar localmente que el `query_id`
y los bindings están soportados por la versión actual del backend.

---

### 3.12 Adaptador Fuseki (opcional)

El backend soporta delegar `POST /sparql` en un servidor [Apache Jena
Fuseki](https://jena.apache.org/documentation/fuseki2/) configurando:

```env
ATLASHABITA_SPARQL_BACKEND=fuseki
ATLASHABITA_FUSEKI_BASE_URL=http://localhost:3030
ATLASHABITA_FUSEKI_DATASET=atlashabita
```

El stack Docker Compose incluye un servicio opcional (`docker compose
--profile fuseki up`) con imagen propia definida en `docker/fuseki/`. Los
comandos `make fuseki-up`, `make fuseki-down` y `make fuseki-load` orquestan
el ciclo de vida local. Las URLs de las consultas siguen las convenciones
de SPARQL 1.1 HTTP Protocol (`POST /<dataset>/query`).

---

### 3.10 `GET /quality/reports`

Devuelve una lista paginada de reportes con `source_id`, `timestamp`, `status`, `coverage`, `critical_errors`, `warnings`.

---

## 4. Códigos de error normalizados

Todas las respuestas de error siguen el esquema:

```json
{
  "error": "INVALID_PROFILE",
  "message": "El perfil 'xyz' no existe.",
  "details": { "allowed": ["remote_work", "student", "family"] }
}
```

| Código interno | HTTP | Significado |
|---|---|---|
| `INVALID_PROFILE` | 400 | Perfil inexistente o mal formado. |
| `INVALID_SCOPE` | 400 | Ámbito territorial inválido. |
| `INVALID_WEIGHTS` | 422 | Pesos fuera de rango o no suman 1. |
| `INVALID_FILTER` | 422 | Filtro duro referencia indicador inexistente. |
| `TERRITORY_NOT_FOUND` | 404 | Territorio solicitado no existe. |
| `LAYER_NOT_FOUND` | 404 | Capa de mapa no disponible. |
| `SOURCE_NOT_FOUND` | 404 | Fuente no encontrada. |
| `INSUFFICIENT_DATA` | 409 | Datos insuficientes para calcular el score. |
| `SOURCE_UNAVAILABLE` | 503 | Fuente no disponible en la versión actual. |
| `QUALITY_BLOCKED` | 409 | Resultado bloqueado por validación de calidad. |
| `RATE_LIMITED` | 429 | Exceso de peticiones. |
| `INVALID_QUERY` | 400 | `query_id` desconocido en `POST /sparql`. |
| `INVALID_BINDINGS` | 400 | Bindings faltantes o con tipo incorrecto. |
| `INVALID_FORMAT` | 400 | Formato RDF no soportado en `GET /rdf/export`. |
| `PAYLOAD_TOO_LARGE` | 413 | La exportación supera el tope defensivo. |
| `INTERNAL_ERROR` | 500 | Error inesperado (registrado con `request_id`). |

El mapeo se implementa vía `DomainError` en [`apps/api/src/atlashabita/observability/errors.py`](../apps/api/src/atlashabita/observability/errors.py) y el manejador global en [`apps/api/src/atlashabita/interfaces/api/app.py`](../apps/api/src/atlashabita/interfaces/api/app.py).

---

## 5. Cabeceras y seguridad

| Cabecera | Uso |
|---|---|
| `X-Request-Id` | Generada o propagada para correlación de logs. |
| `Cache-Control` | `public, max-age=60` en lecturas cacheables. |
| `ETag` / `If-None-Match` | Sólo en recursos estables (`/map/layers/{id}`, `/rdf/export`). |

Medidas de seguridad aplicadas ([`17_SEGURIDAD_PRIVACIDAD_Y_CUMPLIMIENTO.md`](17_SEGURIDAD_PRIVACIDAD_Y_CUMPLIMIENTO.md)):

- Validación estricta con Pydantic v2.
- Paginación obligatoria en listados.
- Sin ejecución de SPARQL arbitrario en modo público.
- CORS restringido a orígenes configurados.
- Logs sin filtrado de secretos.

---

## 6. Criterio de aceptación

La API se considera aceptable si el frontend puede construir mapa, ranking, ficha, comparador e inspector de fuentes sin leer ficheros internos ni conocer detalles del pipeline ([`15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md §8`](15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md)).

---

## 7. Referencias

- [15 · Backend, API, contratos y servicios](15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md)
- [architecture.md §7 · Observabilidad y seguridad](architecture.md)
- [testing.md · Pruebas de API](testing.md)
- [`apps/api/src/atlashabita/interfaces/api/`](../apps/api/src/atlashabita/interfaces/api/)
