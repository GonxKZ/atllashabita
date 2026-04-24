# Ontología AtlasHabita

Carpeta con los artefactos OWL/SHACL que describen el vocabulario del
knowledge graph. La versión semántica que vive aquí es **0.2.0 (Fase B M8)**
y añade alineación con **GeoSPARQL** y reforzamiento de **PROV-O** y
**SHACL** sobre la base 0.1.0 heredada.

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

## Compatibilidad

La versión 0.2.0 es retrocompatible con 0.1.0: todas las tripletas válidas
en la versión anterior lo siguen siendo. Las nuevas restricciones sólo
aplican cuando los nuevos tipos y propiedades aparecen en el grafo.

## Convenciones de URIs

Consulta [`docs/rdf-model.md`](../docs/rdf-model.md) para el catálogo de
URIs y named graphs. Resumen de recursos:

```
/resource/territory/<kind>/<code>
/resource/geometry/<kind>/<code>
/resource/indicator/<code>
/resource/source/<id>
/resource/observation/<indicator>/<kind>/<code>/<period>
/resource/activity/<source_id>/<period>
/resource/profile/<id>
/resource/score/<version>/<profile_id>/<kind>/<code>
```

## Referencias

- [GeoSPARQL (OGC)](https://www.ogc.org/standards/geosparql/)
- [PROV-O (W3C)](https://www.w3.org/TR/prov-o/)
- [SHACL (W3C)](https://www.w3.org/TR/shacl/)
- [OWL 2 (W3C)](https://www.w3.org/TR/owl2-overview/)
- [SPARQL 1.1 (W3C)](https://www.w3.org/TR/sparql11-query/)
