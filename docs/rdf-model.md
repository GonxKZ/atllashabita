# Modelo RDF de AtlasHabita

Resumen ejecutivo del Knowledge Graph construido en [`ontology/atlashabita.ttl`](../ontology/atlashabita.ttl) y validado por [`ontology/shapes.ttl`](../ontology/shapes.ttl). Para la discusión académica completa consulta [`11_MODELO_DE_DATOS_RDF_Y_ONTOLOGIA.md`](11_MODELO_DE_DATOS_RDF_Y_ONTOLOGIA.md) y [`data-pipeline.md`](data-pipeline.md).

---

## 1. Objetivos del modelo

1. Representar el **dominio territorial** español (CCAA, provincias, municipios) con URIs estables.
2. Modelar **indicadores y observaciones** con unidad, periodo y procedencia.
3. Permitir **recomendación explicable**: perfiles, scores y contribuciones al score.
4. Ser **consultable con SPARQL** y **validable con SHACL**.
5. Mantener trazabilidad mediante `prov:Agent` y `prov:wasAttributedTo`.

---

## 2. Espacios de nombres

| Prefijo | URI | Uso |
|---|---|---|
| `ah:` | `https://data.atlashabita.example/ontology/` | Ontología propia. |
| `ahr:` | `https://data.atlashabita.example/resource/` | Recursos. |
| `rdf:` | `http://www.w3.org/1999/02/22-rdf-syntax-ns#` | Base RDF. |
| `rdfs:` | `http://www.w3.org/2000/01/rdf-schema#` | Etiquetas y clases. |
| `owl:` | `http://www.w3.org/2002/07/owl#` | Clases y propiedades OWL. |
| `xsd:` | `http://www.w3.org/2001/XMLSchema#` | Tipos literales. |
| `dct:` | `http://purl.org/dc/terms/` | Metadatos Dublin Core. |
| `skos:` | `http://www.w3.org/2004/02/skos/core#` | Taxonomías. |
| `geo:` | `http://www.w3.org/2003/01/geo/wgs84_pos#` | Coordenadas. |
| `prov:` | `http://www.w3.org/ns/prov#` | Procedencia. |
| `sh:` | `http://www.w3.org/ns/shacl#` | Shapes SHACL. |

---

## 3. Clases principales

Extraídas directamente de `ontology/atlashabita.ttl`:

```turtle
ah:Territory              a owl:Class .
ah:AutonomousCommunity    rdfs:subClassOf ah:Territory .
ah:Province               rdfs:subClassOf ah:Territory .
ah:Municipality           rdfs:subClassOf ah:Territory .

ah:Indicator              a owl:Class .
ah:IndicatorObservation   a owl:Class .
ah:DataSource             rdfs:subClassOf prov:Agent .

ah:DecisionProfile        a owl:Class .
ah:Score                  a owl:Class .
ah:ScoreContribution      a owl:Class .
```

---

## 4. Propiedades principales

| Propiedad | Dominio | Rango | Uso |
|---|---|---|---|
| `ah:belongsTo` | `ah:Territory` | `ah:Territory` | Jerarquía administrativa. |
| `ah:population` | `ah:Territory` | `xsd:integer` | Población registrada. |
| `ah:area` | `ah:Territory` | `xsd:decimal` | Área en km². |
| `ah:hasIndicatorObservation` | `ah:Territory` | `ah:IndicatorObservation` | Valores observados. |
| `ah:indicator` | `ah:IndicatorObservation` | `ah:Indicator` | Tipo de indicador. |
| `ah:value` | `ah:IndicatorObservation` | `xsd:decimal` | Valor numérico. |
| `ah:unit` | `ah:IndicatorObservation` | `xsd:string` | Unidad canónica. |
| `ah:period` | `ah:IndicatorObservation` | `xsd:string` | Periodo (`2025`, `2025Q2`). |
| `ah:providedBy` | `ah:IndicatorObservation` | `ah:DataSource` | Procedencia (sub-propiedad de `prov:wasAttributedTo`). |
| `ah:direction` | `ah:Indicator` | `xsd:string` | `higher_is_better` o `lower_is_better`. |
| `ah:qualityFlag` | `ah:IndicatorObservation` | `xsd:string` | `ok`, `warning`, `imputed`. |
| `ah:license` | `ah:DataSource` | `xsd:string` | Licencia de uso. |
| `ah:periodicity` | `ah:DataSource` | `xsd:string` | Frecuencia de actualización. |
| `ah:hasScore` | `ah:Territory` | `ah:Score` | Resultado por perfil. |
| `ah:forProfile` | `ah:Score` | `ah:DecisionProfile` | Perfil aplicado. |
| `ah:hasContribution` | `ah:Score` | `ah:ScoreContribution` | Explicación parcial. |
| `ah:weight` | `ah:ScoreContribution` | `xsd:decimal` | Peso aplicado. |
| `ah:normalizedValue` | `ah:ScoreContribution` | `xsd:decimal` | Valor tras normalizar. |
| `ah:impact` | `ah:ScoreContribution` | `xsd:decimal` | Aporte final al score. |
| `ah:scoreValue` | `ah:Score` | `xsd:decimal` | Score total (0–100). |
| `ah:scoringVersion` | `ah:Score` | `xsd:string` | Versión reproducible. |
| `ah:confidence` | `ah:Score` | `xsd:decimal` | Confianza (0–1). |

---

## 5. Política de URIs

```text
https://data.atlashabita.example/resource/territory/autonomous_community/{id_ccaa}
https://data.atlashabita.example/resource/territory/province/{codigo_provincia}
https://data.atlashabita.example/resource/territory/municipality/{codigo_ine}
https://data.atlashabita.example/resource/indicator/{codigo_indicador}
https://data.atlashabita.example/resource/source/{id_fuente}
https://data.atlashabita.example/resource/profile/{id_perfil}
https://data.atlashabita.example/resource/observation/{indicador}/{territorio}/{periodo}
https://data.atlashabita.example/resource/score/{scoring_version}/{perfil}/{territorio}
```

---

## 6. Ejemplo Turtle

```turtle
@prefix ah:   <https://data.atlashabita.example/ontology/> .
@prefix ahr:  <https://data.atlashabita.example/resource/> .
@prefix dct:  <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix geo:  <http://www.w3.org/2003/01/geo/wgs84_pos#> .

ahr:territory/municipality/41091
    a ah:Municipality ;
    dct:identifier "41091" ;
    rdfs:label "Sevilla"@es ;
    geo:lat "37.3886"^^xsd:decimal ;
    geo:long "-5.9823"^^xsd:decimal ;
    ah:population 684025 ;
    ah:belongsTo ahr:territory/province/41 ;
    ah:hasIndicatorObservation ahr:observation/rent_median/41091/2025 .

ahr:observation/rent_median/41091/2025
    a ah:IndicatorObservation ;
    ah:indicator ahr:indicator/rent_median ;
    ah:value "10.8"^^xsd:decimal ;
    ah:unit "EUR_M2_MONTH" ;
    ah:period "2025" ;
    ah:qualityFlag "ok" ;
    ah:providedBy ahr:source/mivau_serpavi .

ahr:source/mivau_serpavi
    a ah:DataSource ;
    dct:title "Sistema Estatal de Referencia del Precio del Alquiler de Vivienda"@es ;
    ah:license "CC BY 4.0" ;
    ah:periodicity "anual" .
```

---

## 7. Restricciones SHACL destacadas

De [`ontology/shapes.ttl`](../ontology/shapes.ttl):

```turtle
ah:TerritoryShape
    a sh:NodeShape ;
    sh:targetClass ah:Territory ;
    sh:property [ sh:path dct:identifier ; sh:minCount 1 ; sh:datatype xsd:string ] ;
    sh:property [ sh:path rdfs:label ; sh:minCount 1 ] ;
    sh:property [
        sh:path geo:lat ;
        sh:maxCount 1 ;
        sh:datatype xsd:decimal ;
        sh:minInclusive -90 ;
        sh:maxInclusive 90 ;
    ] .

ah:IndicatorObservationShape
    a sh:NodeShape ;
    sh:targetClass ah:IndicatorObservation ;
    sh:property [ sh:path ah:indicator ; sh:minCount 1 ; sh:class ah:Indicator ] ;
    sh:property [ sh:path ah:value ; sh:minCount 1 ; sh:datatype xsd:decimal ] ;
    sh:property [ sh:path ah:period ; sh:minCount 1 ; sh:datatype xsd:string ] ;
    sh:property [ sh:path ah:providedBy ; sh:minCount 1 ; sh:class ah:DataSource ] .

ah:ScoreShape
    a sh:NodeShape ;
    sh:targetClass ah:Score ;
    sh:property [ sh:path ah:forProfile ; sh:minCount 1 ; sh:class ah:DecisionProfile ] ;
    sh:property [
        sh:path ah:scoreValue ;
        sh:minCount 1 ;
        sh:datatype xsd:decimal ;
        sh:minInclusive 0 ;
        sh:maxInclusive 100 ;
    ] ;
    sh:property [ sh:path ah:scoringVersion ; sh:minCount 1 ; sh:datatype xsd:string ] .
```

Un `sh:Violation` sobre cualquiera de estas shapes bloquea la publicación del grafo ([`data-pipeline.md §2.6`](data-pipeline.md)).

---

## 8. Consultas SPARQL de ejemplo

### 8.1 Municipios con score alto para teletrabajo

```sparql
PREFIX ah:   <https://data.atlashabita.example/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?municipio ?nombre ?score
WHERE {
  ?municipio a ah:Municipality ;
             rdfs:label ?nombre ;
             ah:hasScore ?s .
  ?s ah:forProfile <https://data.atlashabita.example/resource/profile/remote_work> ;
     ah:scoreValue ?score .
  FILTER (?score >= 80)
}
ORDER BY DESC(?score)
LIMIT 20
```

### 8.2 Fuentes usadas por un territorio

```sparql
PREFIX ah:  <https://data.atlashabita.example/ontology/>
PREFIX dct: <http://purl.org/dc/terms/>

SELECT DISTINCT ?fuente ?titulo
WHERE {
  <https://data.atlashabita.example/resource/territory/municipality/41091>
      ah:hasIndicatorObservation ?obs .
  ?obs ah:providedBy ?fuente .
  ?fuente dct:title ?titulo .
}
```

### 8.3 Contribuciones de un score concreto

```sparql
PREFIX ah: <https://data.atlashabita.example/ontology/>

SELECT ?factor ?peso ?valorNormalizado ?impacto
WHERE {
  <https://data.atlashabita.example/resource/score/2026.04.1/remote_work/41091>
      ah:hasContribution ?c .
  ?c ah:indicator ?factor ;
     ah:weight ?peso ;
     ah:normalizedValue ?valorNormalizado ;
     ah:impact ?impacto .
}
ORDER BY DESC(?impacto)
```

### 8.4 Jerarquía administrativa

```sparql
PREFIX ah:   <https://data.atlashabita.example/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?municipio ?nombreMun ?provincia ?nombreProv ?ccaa ?nombreCcaa
WHERE {
  ?municipio a ah:Municipality ;
             rdfs:label ?nombreMun ;
             ah:belongsTo ?provincia .
  ?provincia rdfs:label ?nombreProv ;
             ah:belongsTo ?ccaa .
  ?ccaa rdfs:label ?nombreCcaa .
}
```

---

## 9. Named graphs utilizados

| Named graph | URI | Contenido |
|---|---|---|
| Territorios | `https://data.atlashabita.example/graph/territories` | Jerarquía y geometrías resumidas. |
| Socioeconomía | `https://data.atlashabita.example/graph/socioeconomic` | Renta, desempleo, educación. |
| Vivienda | `https://data.atlashabita.example/graph/housing` | Alquiler y vivienda. |
| Movilidad | `https://data.atlashabita.example/graph/mobility` | Transporte y cobertura. |
| Servicios | `https://data.atlashabita.example/graph/services` | Sanidad y educación. |
| Fuentes | `https://data.atlashabita.example/graph/sources` | Metadatos de procedencia. |
| Scores | `https://data.atlashabita.example/graph/scores` | Resultados calculados. |

---

## 10. Criterio de aceptación del modelo

El modelo RDF se considera aceptable si:

1. El grafo cargado en RDFLib parsea sin errores.
2. `pyshacl.validate(...)` no reporta violaciones críticas.
3. Las consultas SPARQL 8.1–8.4 devuelven resultados no vacíos sobre el dataset demo.
4. Toda observación tiene `indicator`, `value`, `period` y `providedBy` (enforced por SHACL).
5. Todo score tiene `forProfile`, `scoreValue ∈ [0, 100]` y `scoringVersion`.

---

## 11. Referencias

- [`ontology/atlashabita.ttl`](../ontology/atlashabita.ttl) · Ontología.
- [`ontology/shapes.ttl`](../ontology/shapes.ttl) · Shapes SHACL.
- [11 · Modelo RDF y ontología](11_MODELO_DE_DATOS_RDF_Y_ONTOLOGIA.md).
- [data-pipeline.md](data-pipeline.md) · Pipeline que produce el grafo.
- [api.md](api.md) · Endpoints que exponen datos derivados del grafo.

---

## 12. Consumo RDF desde la UI (v0.2.0)

La Fase D añade tres superficies en el frontend que ejercitan el grafo:

- `features/territory/RdfExportModal` abre `POST /rdf/export` con `{territory_id, format: 'turtle', chunk_bytes, page}` y muestra el resultado en un `CodeBlock` paginado. Si la API no responde, el modal construye un Turtle sintético con prefijos `ah:`, `dct:`, `prov:`, `xsd:` a partir del dataset nacional mock, para que la demo sea ejecutable sin backend.
- `features/sparql/SparqlPlayground` consume `GET /sparql/catalog` y `POST /sparql` y mantiene un **catálogo local** con tres consultas de referencia (top-by-score, affordable-housing, indicator-by-ca) que pueden ejecutarse offline sobre el dataset mock. Los bindings se validan en cliente con `features/sparql/schema.ts` (tipos `string`, `integer`, `number`, `boolean`, `iri`).
- `features/provenance/ProvenanceChip` materializa la procedencia PROV-O por indicador (dataset, licencia, periodo, URL oficial) en un tooltip accesible.

Estos contratos se alinean con los tipos definidos en `apps/web/src/services/sparql.ts` y `apps/web/src/services/rdf_export.ts`. Cuando la Fase C publique los endpoints reales, los hooks (`useSparql`, `useRdfExport`) alternarán automáticamente al backend, manteniendo el fallback solo como red de seguridad.
