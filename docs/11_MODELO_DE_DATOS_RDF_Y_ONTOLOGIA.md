# 11 — Modelo de datos RDF y ontología

**Proyecto:** AtlasHabita

## 1. Objetivo del modelo RDF

El objetivo del modelo RDF es representar el conocimiento territorial de forma interoperable, consultable y trazable. El grafo debe permitir vincular territorios, indicadores, fuentes, periodos, geometrías, perfiles y scores.

## 2. Principios de modelado RDF

1. Todo recurso relevante debe tener URI estable.
2. Los literales deben tener tipo cuando corresponda.
3. Las relaciones administrativas deben representarse explícitamente.
4. La procedencia debe modelarse, no quedar en comentarios.
5. Los indicadores deben tener unidad, periodo y fuente.
6. Los scores deben estar versionados.
7. Se deben reutilizar vocabularios existentes cuando aporten claridad.

## 3. Espacios de nombres recomendados

| Prefijo | Uso |
|---|---|
| `ah:` | Ontología propia de AtlasHabita. |
| `ahr:` | Recursos propios: territorios, indicadores, fuentes. |
| `rdf:` | Modelo RDF base. |
| `rdfs:` | Etiquetas, clases y comentarios. |
| `xsd:` | Tipos de datos. |
| `dct:` | Metadatos, título, fuente, fecha, licencia. |
| `skos:` | Conceptos, etiquetas alternativas y taxonomías. |
| `geo:` | Representación geoespacial compatible con GeoSPARQL. |
| `prov:` | Procedencia y actividades de ingesta. |
| `qb:` | Data Cube Vocabulary para observaciones si se usa. |

## 4. Clases principales

| Clase | Descripción |
|---|---|
| `ah:Territory` | Territorio genérico. |
| `ah:Municipality` | Municipio. |
| `ah:Province` | Provincia. |
| `ah:AutonomousCommunity` | Comunidad autónoma. |
| `ah:CensusSection` | Sección censal. |
| `ah:Indicator` | Definición de indicador. |
| `ah:IndicatorObservation` | Valor de un indicador para un territorio. |
| `ah:DataSource` | Fuente de datos. |
| `ah:DecisionProfile` | Perfil de recomendación. |
| `ah:Score` | Resultado de scoring. |
| `ah:ScoreContribution` | Aporte parcial al score. |
| `ah:IngestionRun` | Ejecución de ingesta. |

## 5. Propiedades principales

| Propiedad | Dominio | Rango | Uso |
|---|---|---|---|
| `ah:belongsTo` | Territorio | Territorio | Jerarquía administrativa. |
| `ah:hasIndicatorObservation` | Territorio | Observación | Indicadores asociados. |
| `ah:indicator` | Observación | Indicador | Tipo de indicador. |
| `ah:value` | Observación | Literal numérico | Valor observado. |
| `ah:unit` | Observación | Literal/URI | Unidad. |
| `ah:period` | Observación | Literal/URI | Periodo temporal. |
| `ah:providedBy` | Observación | Fuente | Procedencia. |
| `ah:hasScore` | Territorio | Score | Score para perfil. |
| `ah:forProfile` | Score | Perfil | Perfil usado. |
| `ah:hasContribution` | Score | Contribución | Explicación parcial. |
| `ah:weight` | Contribución | Decimal | Peso aplicado. |
| `ah:normalizedValue` | Contribución | Decimal | Valor normalizado. |

## 6. Política de URIs

```text
https://data.atlashabita.example/resource/territory/municipality/{codigo_ine}
https://data.atlashabita.example/resource/territory/province/{codigo_provincia}
https://data.atlashabita.example/resource/indicator/{codigo_indicador}
https://data.atlashabita.example/resource/source/{id_fuente}
https://data.atlashabita.example/resource/profile/{id_perfil}
https://data.atlashabita.example/resource/score/{version}/{perfil}/{territorio}
```

## 7. Ejemplo Turtle

```turtle
@prefix ah: <https://data.atlashabita.example/ontology/> .
@prefix ahr: <https://data.atlashabita.example/resource/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ahr:territory/municipality/41091
    a ah:Municipality ;
    dct:identifier "41091" ;
    rdfs:label "Sevilla"@es ;
    ah:belongsTo ahr:territory/province/41 ;
    ah:hasIndicatorObservation ahr:observation/rent_median/41091/2025 .

ahr:observation/rent_median/41091/2025
    a ah:IndicatorObservation ;
    ah:indicator ahr:indicator/rent_median ;
    ah:value "10.8"^^xsd:decimal ;
    ah:unit "EUR_M2_MONTH" ;
    ah:period "2025" ;
    ah:providedBy ahr:source/mivau_serpavi .
```

## 8. Consultas SPARQL de ejemplo

### Municipios con score alto para teletrabajo

```sparql
PREFIX ah: <https://data.atlashabita.example/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?municipio ?nombre ?score
WHERE {
  ?municipio a ah:Municipality ;
             rdfs:label ?nombre ;
             ah:hasScore ?s .
  ?s ah:forProfile <https://data.atlashabita.example/resource/profile/remote_work> ;
     ah:value ?score .
  FILTER(?score >= 80)
}
ORDER BY DESC(?score)
LIMIT 20
```

### Fuentes usadas por un territorio

```sparql
PREFIX ah: <https://data.atlashabita.example/ontology/>
PREFIX dct: <http://purl.org/dc/terms/>

SELECT DISTINCT ?fuente ?titulo
WHERE {
  <https://data.atlashabita.example/resource/territory/municipality/41091>
      ah:hasIndicatorObservation ?obs .
  ?obs ah:providedBy ?fuente .
  ?fuente dct:title ?titulo .
}
```

## 9. SHACL mínimo recomendado

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ah: <https://data.atlashabita.example/ontology/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ah:MunicipalityShape
    a sh:NodeShape ;
    sh:targetClass ah:Municipality ;
    sh:property [ sh:path <http://purl.org/dc/terms/identifier> ; sh:minCount 1 ; sh:datatype xsd:string ] ;
    sh:property [ sh:path <http://www.w3.org/2000/01/rdf-schema#label> ; sh:minCount 1 ] ;
    sh:property [ sh:path ah:belongsTo ; sh:minCount 1 ] .
```

## 10. Named graphs

Se recomienda separar:

- Grafo de territorios.
- Grafo de indicadores socioeconómicos.
- Grafo de vivienda.
- Grafo de movilidad.
- Grafo de servicios.
- Grafo de fuentes y procedencia.
- Grafo de scores.

Esto permite auditar, actualizar y consultar por dominio sin mezclar todos los triples en un único bloque indistinguible.
