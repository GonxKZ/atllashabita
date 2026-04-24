# Ontología AtlasHabita

Carpeta con los artefactos OWL/SHACL que describen el vocabulario del
knowledge graph. La versión semántica que vive aquí es **0.3.0 (Fase B M11)**
y añade clases para **flujos de movilidad MITMA**, **accidentes DGT** y
**transporte público CRTM/GTFS** sobre la base 0.2.0 (que ya alineaba con
GeoSPARQL y reforzaba PROV-O).

## Archivos

- `atlashabita.ttl` — Ontología OWL 2 con las clases y propiedades del dominio.
  Importa (declarativamente) `geosparql` y `prov-o` para que consumidores
  compatibles puedan cargar la TBox completa.
- `shapes.ttl` — Shapes SHACL para validar el ABox (instancias) contra reglas
  de dominio: códigos INE de 5 dígitos, rangos de coordenadas WGS84,
  geometría obligatoria en municipios, cadena PROV-O en actividades de
  ingesta, etc.

## Novedades Fase B (M8)

1. **GeoSPARQL**
   - `ah:Territory rdfs:subClassOf geo:Feature`.
   - Nueva propiedad `ah:hasGeometry` (subproperty de `geo:hasGeometry`).
   - Nueva propiedad `ah:wktLiteral` (subproperty de `geo:asWKT`).
   - Geometrías dedicadas bajo `ahr:geometry/<kind>/<code>`.
   - WKT con CRS84 explícito: `<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT(lon lat)`.

2. **PROV-O reforzado**
   - Nueva clase `ah:IngestionActivity rdfs:subClassOf prov:Activity`.
   - Propiedades `ah:ingestedFrom` (subproperty de `prov:used`) y
     `ah:produced` (alias de `prov:generated`).
   - Observaciones declaran `prov:wasGeneratedBy` hacia la actividad.
   - Deduplicación por tupla `(source, period)` para una actividad
     única por ejecución.
   - Nuevo named graph `ahr:graph/provenance`.

3. **Periodicidad tipada**
   - Propiedad `ah:periodYear` (`xsd:gYear`) para consultas temporales
     nativas; la propiedad `ah:period` (xsd:string) se conserva para
     compatibilidad con periodos trimestrales/mensuales.

4. **SHACL reforzado**
   - `sh:pattern "^[0-9]{5}$"` sobre `dct:identifier` de municipios.
   - Geometría obligatoria en municipios (`ah:MunicipalityShape`).
   - Shape `ah:GeometryShape` exige `geo:asWKT`.
   - Shape `ah:IngestionActivityShape` exige `prov:used`.

## Novedades Fase B (M11)

1. **Movilidad** (`ah:MobilityFlow`)
   - Subclase de `prov:Entity`, `sosa:Observation` y `qb:Observation`.
   - Propiedades `ah:flowOrigin`, `ah:flowDestination`, `ah:flowTrips`
     (subproperty de `sosa:hasSimpleResult`), `ah:flowMode`,
     `ah:flowDistanceKm`.
   - URIs deterministas: `/resource/flow/<origin>/<destination>/<period>[/<mode>]`.
   - Named graph: `/graph/mobility`.

2. **Accidentes viales** (`ah:RoadAccident`)
   - Subclase de `prov:Entity` y `geo:Feature` con geometría puntual
     dedicada en `/resource/geometry/accident/<id>`.
   - Propiedades `ah:accidentDate` (xsd:date), `ah:accidentYear`
     (xsd:gYear), `ah:accidentSeverity` (enum SHACL), `ah:accidentVictims`,
     `ah:accidentFatalities`, `ah:accidentRoadType`, `ah:occursIn`.
   - Named graph: `/graph/accidents`.

3. **Transporte público** (`ah:TransitStop`, `ah:TransitRoute`)
   - Paradas alineadas con GeoSPARQL (`geo:Feature`) y rutas con modos
     GTFS validados por SHACL (`bus`/`metro`/`tram`/`rail`/`ferry`/...).
   - Propiedad `ah:servesStop` para conectar rutas con paradas.
   - URIs determinadas por `agency_id + stop_id` / `agency_id + route_id`.
   - Named graph: `/graph/transit`.

4. **Vocabularios añadidos**
   - `sosa:` y `ssn:` cargados explícitamente en `bind_all`.
   - `qb:` reforzado: ahora se utiliza activamente en flujos de movilidad.

## Compatibilidad

La versión 0.3.0 mantiene retrocompatibilidad total con 0.2.0 y 0.1.0.
Las clases y propiedades nuevas viven en sus propios named graphs y la
validación SHACL del seed clásico no se ve afectada.

## Convenciones de URIs

Consulta [`docs/rdf-model.md`](../docs/rdf-model.md) para el catálogo de
URIs y named graphs. Resumen de recursos:

```
/resource/territory/<kind>/<code>
/resource/geometry/<kind>/<code>
/resource/geometry/accident/<id>
/resource/geometry/transit_stop/<operator>/<stop_id>
/resource/indicator/<code>
/resource/source/<id>
/resource/observation/<indicator>/<kind>/<code>/<period>
/resource/activity/<source_id>/<period>
/resource/profile/<id>
/resource/score/<version>/<profile_id>/<kind>/<code>
/resource/flow/<origin_code>/<destination_code>/<period>[/<mode>]
/resource/accident/<id>
/resource/transit_stop/<operator>/<stop_id>
/resource/transit_route/<operator>/<route_id>
```

## Referencias

- [GeoSPARQL (OGC)](https://www.ogc.org/standards/geosparql/)
- [PROV-O (W3C)](https://www.w3.org/TR/prov-o/)
- [SOSA/SSN (W3C)](https://www.w3.org/TR/vocab-ssn/)
- [RDF Data Cube (W3C)](https://www.w3.org/TR/vocab-data-cube/)
- [SHACL (W3C)](https://www.w3.org/TR/shacl/)
- [OWL 2 (W3C)](https://www.w3.org/TR/owl2-overview/)
- [SPARQL 1.1 (W3C)](https://www.w3.org/TR/sparql11-query/)
