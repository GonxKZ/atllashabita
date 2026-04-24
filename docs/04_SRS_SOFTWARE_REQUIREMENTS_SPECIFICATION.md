# SRS — AtlasHabita

**Producto:** AtlasHabita  
**Documento:** Software Requirements Specification, edición narrativa y granular  
**Versión:** 1.0 — edición ampliada con arquitectura production-ready, DoD técnico granular y playbooks de implementación  
**Fecha:** 2026-04-24  
**Estado:** Especificación técnica lista para implementación incremental, con arquitectura semántica, ingesta reproducible, caché, diseño orientado a datos, RDFLib, SPARQL, SHACL, API y frontend con mapa interactivo.  
**Audiencia:** Equipo de desarrollo, evaluador académico, arquitecto de software, responsable de datos y futuro mantenedor del sistema.

---

## 1. Propósito del sistema

AtlasHabita es un sistema de software que integra datos públicos territoriales de España para construir un Knowledge Graph RDF y exponerlo mediante una aplicación web de recomendación. El sistema debe permitir recomendar zonas para vivir, teletrabajar, estudiar o emprender a partir de perfiles configurables, scores explicables y fuentes trazables.

El objetivo técnico no es únicamente descargar datos y pintarlos. El objetivo es construir una arquitectura de datos reproducible donde cada fuente se ingiere, se valida, se normaliza, se cachea, se convierte parcialmente a RDF, se enlaza con entidades territoriales y se utiliza para calcular recomendaciones. La aplicación debe ofrecer una experiencia simple, pero la base debe ser rigurosa.

La especificación asume Python como lenguaje principal, RDFLib como librería semántica, Pandas/GeoPandas como soporte de procesamiento tabular y geoespacial, SHACL como validación semántica, FastAPI como API backend, Streamlit o React/Leaflet como frontend y almacenamiento local en Parquet/GeoPackage/TriG para el MVP. Si el grafo crece, Apache Jena Fuseki o Virtuoso pueden añadirse como triplestore, pero no son obligatorios para la primera entrega.

---

## 2. Alcance técnico

El sistema debe cubrir toda España a nivel municipal en el MVP. Esto significa que cada municipio debe tener una entidad estable, una geometría simplificada, una provincia, una comunidad autónoma y el mayor número posible de indicadores. Las secciones censales se incorporarán como nivel fino donde exista dato útil y donde el frontend pueda renderizarlas sin degradar la experiencia.

El sistema debe manejar cuatro tipos de datos. El primer tipo son datos geográficos base, como límites y secciones censales. El segundo tipo son indicadores agregados, como renta, alquiler, conectividad, acceso a hospital o turismo. El tercer tipo son puntos de interés, como hospitales, estaciones, colegios, farmacias, supermercados, parques y negocios. El cuarto tipo son metadatos y procedencia, como fuente, licencia, fecha de ingesta, transformación y calidad.

No todos los datos brutos deben vivir como triples RDF. Esta decisión es deliberada y responde al diseño orientado a datos. Las series grandes, puntos masivos y geometrías pesadas pueden almacenarse en Parquet, GeoPackage o PostGIS. El grafo RDF debe contener las entidades, relaciones semánticas, indicadores agregados, metadatos, procedencia y resultados de scoring. Esta estrategia evita convertir RDF en un almacén indiscriminado de todo y mantiene el sistema eficiente.

---

## 3. Arquitectura general

La arquitectura se organiza en capas: ingesta, normalización, almacenamiento analítico, construcción RDF, validación, scoring, API y frontend. Cada capa tiene responsabilidades claras y produce artefactos versionados. La salida de una capa debe poder inspeccionarse sin ejecutar la siguiente. Esta separación favorece depuración, reproducibilidad y tests.

La capa de ingesta descarga o descubre recursos desde fuentes externas. Debe soportar HTTP con caché, APIs con clave, portales CKAN/DCAT, descargas ZIP, feeds ATOM, OGC API Features, CSV, JSON, GeoJSON, SHP, GeoPackage, GTFS y PBF de OpenStreetMap. Cada fuente se implementa como adaptador aislado para evitar acoplamiento.

La capa de normalización convierte datos heterogéneos a contratos internos. Aquí se limpian nombres, códigos INE, fechas, unidades, CRS geográficos, geometrías y categorías. Esta capa no debe conocer RDF. Debe producir datasets normalizados en Parquet o GeoPackage con esquemas estables.

La capa RDF construye triples a partir de contratos normalizados. Debe crear named graphs por fuente y por dominio. Debe aplicar una política de URIs estable, vocabularios estándar y modelado propio mínimo. El RDF debe serializarse en TriG para preservar named graphs y en Turtle/JSON-LD cuando convenga para exportación.

La capa de validación ejecuta quality gates tabulares y SHACL. Los tests tabulares verifican columnas, rangos, códigos y nulos. SHACL verifica la estructura RDF: municipios con nombre, código, geometría, fuente; indicadores con valor, unidad, periodo y procedencia; scores con perfil, versión y contribuciones.

La capa de scoring calcula sub-scores y scores finales por perfil. Debe ser determinista, versionada y reproducible. Cada score debe guardar contribuciones por dimensión para poder explicar resultados.

La API expone perfiles, rankings, fichas, comparación, fuentes, health checks y endpoints avanzados de RDF. El frontend consume esta API y presenta mapa, ranking, fichas, comparador e inspector de fuentes.

---

## 4. Screaming architecture

La estructura del repositorio debe gritar el dominio de AtlasHabita. Un lector debe entender que el sistema trata de territorios, indicadores, recomendaciones, procedencia y datasets abiertos. Se debe evitar una estructura genérica basada en carpetas como `helpers`, `utils` o `misc` para todo. Las utilidades compartidas deben existir solo cuando tengan una responsabilidad clara.

```text
atlashabita/
  pyproject.toml
  README.md
  docs/
    PRD.md
    SRS.md
    architecture_decisions/
    demo_scenarios/
  config/
    sources.yaml
    profiles.yaml
    scoring.yaml
    cache.yaml
  data/
    raw/
    cache/
    normalized/
    analytics/
    rdf/
    reports/
  src/atlashabita/
    territories/
      codes.py
      geometries.py
      administrative_hierarchy.py
      section_census.py
    datasets/
      registry.py
      source_contracts.py
      http_cache.py
      discovery.py
      licenses.py
    ingestion/
      ine/
      ign_cnig/
      mivau/
      miteco/
      aemet/
      transport/
      dgt/
      dataestur/
      osm/
      catastro/
      siose/
      wikidata/
      geonames/
    indicators/
      housing.py
      income.py
      demography.py
      connectivity.py
      services.py
      mobility.py
      environment.py
      tourism.py
      road_safety.py
      business.py
    knowledge_graph/
      namespaces.py
      uri_policy.py
      graph_builder.py
      named_graphs.py
      serializers.py
      sparql_queries.py
    validation/
      tabular_quality.py
      shacl_runner.py
      quality_gates.py
    recommendations/
      profiles.py
      normalization.py
      scoring_engine.py
      explanations.py
      confidence.py
    api/
      main.py
      routers/
        rankings.py
        territories.py
        profiles.py
        sources.py
        rdf.py
        health.py
    frontend/
      app/
      components/
      map/
      design_system/
    shared/
      logging.py
      errors.py
      clock.py
      settings.py
  shapes/
    territory_shapes.ttl
    indicator_shapes.ttl
    score_shapes.ttl
    provenance_shapes.ttl
  ontology/
    atlashabita.ttl
  queries/
    rankings/
    quality/
    provenance/
    export/
  tests/
    unit/
    integration/
    contract/
    e2e/
```

Esta estructura permite que cada cambio tenga un lugar evidente. Si se añade un nuevo indicador de vivienda, debe vivir en `indicators/housing.py` y su ingesta en `ingestion/mivau`. Si se añade una nueva validación RDF, debe vivir en `shapes` y `validation`. Si se cambia el algoritmo de score, debe vivir en `recommendations`. Esta claridad reduce deuda técnica desde el inicio.

---

## 5. Principios de diseño de software

El sistema debe aplicar Clean Code de forma pragmática. Las funciones deben tener responsabilidades pequeñas, nombres explícitos y entradas/salidas tipadas. Los módulos no deben ocultar efectos secundarios. Una función llamada `normalize_municipality_codes` no debe descargar datos ni escribir RDF. Una función llamada `build_rdf_graph` no debe limpiar CSVs. Esta disciplina facilita testing y depuración.

El principio DRY debe aplicarse a conocimiento de dominio, no a coincidencias superficiales. Si dos fuentes tienen lógica HTTP similar, se extrae un cliente común. Si dos indicadores comparten normalización min-max, se extrae una función común. Pero si dos datasets se parecen solo accidentalmente, no se debe crear una abstracción prematura. La duplicación pequeña puede ser aceptable si evita una abstracción confusa.

SOLID debe guiar los adaptadores. Cada fuente implementa una interfaz estable de extracción, normalización y materialización. El sistema debe depender de abstracciones como `SourceAdapter`, `DatasetManifest`, `NormalizedFrame` y `RdfMapper`, no de detalles concretos de una URL. Esto permite cambiar una fuente sin romper el resto.

El diseño orientado a datos debe evitar modelar millones de filas como millones de objetos Python con métodos. El procesamiento intensivo debe hacerse en dataframes, arrays, operaciones vectorizadas y formatos columnares. Las clases deben usarse para contratos, configuración, adaptadores y entidades de dominio conceptuales; los datos masivos deben fluir como tablas tipadas.

---

## 6. Diseño orientado a datos

El sistema debe tratar los datos como artefactos versionados. Cada ingesta produce un snapshot crudo. Cada normalización produce un dataset limpio. Cada construcción RDF produce un grafo. Cada scoring produce una tabla de scores. Estos artefactos deben tener hash, fecha, versión de fuente, versión de transformación y ubicación.

La representación interna preferida para datos tabulares normalizados será Parquet. Parquet permite lectura eficiente por columnas, compresión y esquemas estables. Las geometrías se pueden conservar en GeoPackage o GeoParquet cuando sea viable. Los datos RDF se conservarán en TriG para named graphs. Los resultados de API se precomputarán parcialmente como JSON compacto para acelerar frontend.

El sistema debe evitar recalcular todo cuando no hace falta. Si la fuente no cambió según ETag, Last-Modified o hash de contenido, se reutiliza el snapshot. Si solo cambió una fuente, se recalculan los indicadores dependientes y los scores afectados. En MVP puede implementarse un grafo de dependencias simple basado en nombres de artefacto y hashes.

La política de IDs debe ser estable. Un municipio no puede tener una URI diferente cada vez que se ingiere. Los IDs deben derivarse de códigos oficiales. Por ejemplo, `https://atlashabita.local/id/municipio/28079` para Madrid, `https://atlashabita.local/id/provincia/28` para Madrid provincia y `https://atlashabita.local/id/ccaa/13` para Comunidad de Madrid si se adopta codificación oficial. La estabilidad de URIs es condición de calidad.

---

## 7. Modelo semántico RDF

El grafo RDF debe usar vocabularios estándar donde aporten valor. RDF/RDFS/OWL se usarán para tipos, clases y relaciones básicas. DCAT se usará para describir datasets y distribuciones. DCTERMS se usará para títulos, fechas, licencias, descripciones y publicadores. PROV-O se usará para procedencia. GeoSPARQL se usará para geometrías y relaciones espaciales. SKOS se usará para taxonomías de categorías, actividades y temas. SHACL se usará para validar el grafo.

La ontología propia debe ser pequeña y clara. No debe reinventar DCAT ni GeoSPARQL. Debe definir clases del dominio de producto: `ve:Municipio`, `ve:Provincia`, `ve:ComunidadAutonoma`, `ve:SeccionCensal`, `ve:Indicador`, `ve:IndicadorRenta`, `ve:IndicadorAlquiler`, `ve:IndicadorConectividad`, `ve:Recurso`, `ve:Hospital`, `ve:CentroEducativo`, `ve:EstacionTransporte`, `ve:PerfilRecomendacion`, `ve:Score`, `ve:ContribucionScore` y `ve:FuenteIngesta`.

Cada indicador debe ser una entidad, no solo una propiedad literal. Esto permite asociar valor, unidad, periodo, fuente, calidad y método de cálculo. Aunque para rendimiento se puedan materializar propiedades directas como `ve:rentaMedia`, el modelo canónico debe preservar la entidad indicador.

Ejemplo de patrón canónico:

```ttl
ve:indicador/renta/municipio/28079/2023
    a ve:IndicadorRenta ;
    ve:observedIn ve:municipio/28079 ;
    ve:value "18000"^^xsd:decimal ;
    ve:unit unit:EUR_PER_PERSON_YEAR ;
    ve:period "2023"^^xsd:gYear ;
    prov:wasDerivedFrom ve:source/ine-adrh-2023 ;
    dcterms:modified "2026-04-22"^^xsd:date .
```

Este patrón hace que la aplicación pueda explicar de dónde sale un número y permite validar con SHACL que cada indicador tiene valor, unidad, periodo y fuente.

---

## 8. Named graphs

Los named graphs son obligatorios porque el sistema integra muchas fuentes. Cada fuente importante debe tener su propio grafo. Esto permite consultar procedencia, aislar errores, regenerar partes del grafo y demostrar trazabilidad. Además, SPARQL permite usar `GRAPH ?g` para consultar patrones dentro de grafos nombrados.

Propuesta de named graphs:

```text
urn:ve:graph:catalog
urn:ve:graph:territory:ign-cnig
urn:ve:graph:territory:ine-sections
urn:ve:graph:demography:ine
urn:ve:graph:income:ine-adrh
urn:ve:graph:housing:mivau-serpavi
urn:ve:graph:services:miteco-reto-demografico
urn:ve:graph:health:sanidad-hospitals
urn:ve:graph:education:educacion-centros
urn:ve:graph:connectivity:seteleco-broadband
urn:ve:graph:mobility:nap
urn:ve:graph:mobility:renfe
urn:ve:graph:environment:miteco-air
urn:ve:graph:environment:aemet
urn:ve:graph:environment:siose
urn:ve:graph:tourism:dataestur
urn:ve:graph:road-safety:dgt
urn:ve:graph:pois:osm
urn:ve:graph:linked-data:wikidata
urn:ve:graph:linked-data:geonames
urn:ve:graph:app:scores
urn:ve:graph:app:quality
```

El grafo de catálogo debe describir las fuentes mediante DCAT. Los grafos de datos contienen entidades e indicadores. El grafo de scores contiene resultados calculados por la aplicación. El grafo de quality contiene validaciones, incidencias y métricas de completitud.

---

## 9. Política de URIs

La política de URIs debe ser simple, estable y legible. Para MVP se puede usar un dominio local o namespace propio como `https://atlashabita.local/id/`. En producción se reemplazaría por un dominio real. Las URIs no deben incluir nombres que puedan cambiar ni acentos. Deben usar códigos oficiales y slugs controlados.

Patrones recomendados:

```text
https://atlashabita.local/id/ccaa/{codigo_ccaa}
https://atlashabita.local/id/provincia/{codigo_provincia}
https://atlashabita.local/id/municipio/{codigo_ine_municipio}
https://atlashabita.local/id/seccion-censal/{codigo_seccion}
https://atlashabita.local/id/indicador/{tipo}/{nivel}/{id_zona}/{periodo}
https://atlashabita.local/id/recurso/{tipo}/{source}/{source_id}
https://atlashabita.local/id/source/{source_id}
https://atlashabita.local/id/score/{profile}/{zona}/{version}
```

No se deben usar URIs generadas aleatoriamente para entidades persistentes. Solo los eventos de ingesta, ejecuciones de pipeline o informes temporales pueden usar identificadores basados en fecha/hash.

---

## 10. Catálogo de datasets y estrategia de ingesta

La ingesta se define mediante `config/sources.yaml`. Este manifiesto es la fuente de verdad para saber qué se descarga, de dónde, con qué frecuencia, qué licencia tiene, qué adaptador usa, qué entidad alimenta y qué quality gates debe pasar. La documentación humana y el código deben estar alineados con este manifiesto.

Algunos recursos tienen descarga directa estable. Otros requieren descubrimiento mediante API o catálogo. Otros requieren clave API. Otros pueden tener descarga manual asistida si el portal no ofrece endpoint bulk estable. El sistema debe tratar todos estos casos de forma explícita y no mezclarlos.

A continuación se describe el catálogo recomendado para el MVP y fases avanzadas.

### 10.1 Territorio base — CNIG/IGN límites administrativos

**Fuente oficial:** Centro de Descargas del CNIG, producto “Límites municipales, provinciales y autonómicos”.  
**URL de referencia:** https://centrodedescargas.cnig.es/CentroDescargas/limites-municipales-provinciales-autonomicos  
**Uso:** geometrías de municipios, provincias y comunidades autónomas.  
**Entidad destino:** `ve:Municipio`, `ve:Provincia`, `ve:ComunidadAutonoma`.  
**Estrategia de ingesta:** descargar producto desde CNIG cuando haya enlace directo o registrar recurso en `sources.yaml`. Convertir CRS a EPSG:4326 para frontend y conservar versión original para análisis. Simplificar geometrías para mapa.  
**Quality gates:** todos los municipios deben tener código, nombre, provincia y geometría válida. Las geometrías inválidas se corrigen con buffer cero o herramientas de reparación, registrando incidencia.

### 10.2 Secciones censales — INE OGC API Features

**Fuente oficial:** INE GeoServer OGC API Features.  
**URL de referencia:** https://www.ine.es/geoserver/ogc/features/v1/collections  
**Uso:** granularidad fina para ciudades y análisis intraurbano.  
**Entidad destino:** `ve:SeccionCensal`.  
**Estrategia de ingesta:** consultar colecciones disponibles y descargar secciones en GeoJSON o CSV/JSON según soporte. El adaptador debe permitir seleccionar año.  
**Quality gates:** cada sección debe tener código, municipio derivable, geometría válida y CRS conocido. La unión con municipio debe superar un umbral de cobertura.

### 10.3 Estadística general — INE API JSON

**Fuente oficial:** API JSON INE.  
**URL de referencia:** https://www.ine.es/dyngs/DAB/index.htm?cid=1099  
**Uso:** población, demografía y otras series estadísticas disponibles en INEbase.  
**Entidad destino:** indicadores demográficos municipales, provinciales o autonómicos.  
**Estrategia de ingesta:** usar códigos de tabla configurables. Cada tabla se descarga con `DATOS_TABLA` o endpoints equivalentes definidos por la API. El adaptador debe materializar una tabla normalizada con columnas `territory_id`, `period`, `indicator_code`, `value`, `unit`.  
**Quality gates:** fechas parseables, valores numéricos válidos, cobertura territorial mínima y ausencia de duplicados para la misma clave.

### 10.4 Renta — Atlas de Distribución de Renta de los Hogares

**Fuente oficial:** INE, Atlas de Distribución de Renta de los Hogares.  
**URL de referencia:** https://www.ine.es/dynt3/inebase/index.htm?capsel=5650&padre=12385  
**Uso:** renta media y mediana por municipios, distritos y secciones censales.  
**Entidad destino:** `ve:IndicadorRenta`.  
**Estrategia de ingesta:** descargar las tablas disponibles para municipios y secciones censales. Debido al volumen, el adaptador debe soportar descarga por recurso y cacheo.  
**Quality gates:** cobertura de municipios, periodos coherentes, valores no negativos, unidad monetaria explícita y fuente versionada.

### 10.5 Vivienda y alquiler — MIVAU/SERPAVI

**Fuente oficial:** Sistema Estatal de Referencia del Precio del Alquiler de Vivienda.  
**URL de referencia:** https://www.mivau.gob.es/vivienda/alquila-bien-es-tu-derecho/serpavi y https://serpavi.mivau.gob.es/  
**Uso:** referencia de precios de alquiler para evaluar asequibilidad.  
**Entidad destino:** `ve:IndicadorAlquiler`.  
**Estrategia de ingesta:** implementar adaptador específico. Si existe explotación estadística descargable, usarla como fuente principal. Si el portal ofrece consulta interactiva sin bulk estable, documentar `manual_fallback` y permitir colocar ficheros descargados en `data/raw/mivau/`. El pipeline debe detectar esos ficheros y normalizarlos.  
**Quality gates:** valores monetarios positivos, periodo definido, granularidad declarada y cobertura territorial registrada. La aplicación debe mostrar nivel de confianza cuando el dato de alquiler no exista para una zona.

### 10.6 Servicios y reto demográfico — MITECO Datos de Servicios

**Fuente oficial:** MITECO, Datos de Servicios del Reto Demográfico.  
**URL de referencia:** https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/reto-demografico/datos-servicios.html  
**Uso:** farmacias, centros educativos, acceso a hospital, acceso a autovía y servicios municipales agregados.  
**Entidad destino:** indicadores de servicios y accesibilidad.  
**Estrategia de ingesta:** descargar cartografía vectorial o servicios publicados, extraer atributos alfanuméricos por municipio y convertirlos a indicadores.  
**Quality gates:** unión por código de municipio, valores de tiempo no negativos, unidades explícitas y cobertura nacional.

### 10.7 Hospitales — Catálogo Nacional de Hospitales

**Fuente oficial:** Ministerio de Sanidad / datos.gob.es.  
**URL de referencia:** https://datos.gob.es/es/catalogo/e05070101-centros-y-servicios-del-sns-catalogo-nacional-de-hospitales  
**Uso:** localización y catálogo de hospitales.  
**Entidad destino:** `ve:Hospital` y agregados sanitarios por municipio.  
**Estrategia de ingesta:** descubrir distribución desde datos.gob.es o usar recurso oficial publicado por Sanidad. Geocodificar solo si el recurso no trae coordenadas y registrar calidad de geocodificación.  
**Quality gates:** hospital con nombre, provincia/comunidad, fuente y localización o municipio asociado. Si no hay coordenadas, debe conservarse al menos territorio administrativo.

### 10.8 Centros educativos — Registro Estatal de Centros Docentes

**Fuente oficial:** Ministerio de Educación, Formación Profesional y Deportes.  
**URL de referencia:** https://www.educacionfpydeportes.gob.es/servicios-al-ciudadano/catalogo/centros-docentes/servicios-generales/registro-centros-no-universitarios.html  
**Uso:** centros docentes no universitarios.  
**Entidad destino:** `ve:CentroEducativo` y agregados por municipio.  
**Estrategia de ingesta:** usar servicio oficial o exportaciones disponibles. Normalizar titularidad, enseñanzas y código de centro.  
**Quality gates:** centro con código, nombre, municipio o coordenadas, titularidad si existe y enseñanza si existe.

### 10.9 Banda ancha — SETELECO / Avance Digital

**Fuente oficial:** Mapas de servicios y cobertura agregada de banda ancha.  
**URL de referencia:** https://avance.digital.gob.es/banda-ancha/cobertura/Mapas-servicios-Banda-Ancha/Paginas/inicio.aspx y https://avance.digital.gob.es/banda-ancha/cobertura/Mapas-cobertura-agregada/Paginas/incio.aspx  
**Uso:** cobertura de banda ancha fija y móvil, especialmente para perfil teletrabajo.  
**Entidad destino:** `ve:IndicadorConectividad`.  
**Estrategia de ingesta:** preferir cobertura agregada por municipio para MVP. Si se incorporan mapas detallados, tratarlos como fase avanzada por volumen y granularidad.  
**Quality gates:** porcentajes en rango 0–100, tecnología declarada, fecha de referencia y nivel territorial explícito.

### 10.10 Transporte multimodal — NAP

**Fuente oficial:** Punto de Acceso Nacional de Transporte Multimodal.  
**URL de referencia:** https://nap.transportes.gob.es/  
**Uso:** datasets de transporte por autobús, ferroviario, marítimo y aéreo; GTFS cuando esté disponible.  
**Entidad destino:** `ve:ParadaTransporte`, `ve:LineaTransporte`, indicadores de accesibilidad.  
**Estrategia de ingesta:** consumir listado de datasets y descargar recursos GTFS-ZIP seleccionados. El MVP debe comenzar con recursos nacionales o regionales relevantes y registrar cobertura.  
**Quality gates:** GTFS válido con `stops.txt`, `routes.txt` y `trips.txt` cuando aplique; coordenadas válidas; asignación territorial por spatial join.

### 10.11 Transporte ferroviario — Renfe Data

**Fuente oficial:** Renfe Data.  
**URL de referencia:** https://data.renfe.com/dataset  
**Uso:** estaciones, horarios, GTFS y actualizaciones ferroviarias.  
**Entidad destino:** estaciones y conectividad ferroviaria municipal.  
**Estrategia de ingesta:** descargar datasets de estaciones y GTFS disponibles. En MVP basta con presencia de estación y servicios principales; horarios completos pueden quedar para fase posterior.  
**Quality gates:** estación con nombre, coordenadas o municipio, tipo de servicio si existe y fuente.

### 10.12 Movilidad cotidiana — Open Data Movilidad

**Fuente oficial:** Ministerio de Transportes y Movilidad Sostenible.  
**URL de referencia:** https://www.transportes.gob.es/ministerio/proyectos-singulares/estudios-de-movilidad-con-big-data/opendata-movilidad  
**Uso:** flujos de movilidad agregada.  
**Entidad destino:** indicadores de movilidad intermunicipal.  
**Estrategia de ingesta:** fase avanzada. El volumen puede ser alto, por lo que se recomienda preagregar y no convertir todo a RDF.  
**Quality gates:** anonimización respetada, agregados territoriales coherentes y documentación de periodo.

### 10.13 Calidad del aire — MITECO

**Fuente oficial:** MITECO datos de calidad del aire.  
**URL de referencia:** https://catalogo.datosabiertos.miteco.gob.es/catalogo/dataset/19458583-9953-4fe7-a494-e2cc26e89e58 y https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/atmosfera-y-calidad-del-aire/evaluacion-y-datos-de-calidad-del-aire/datos.html  
**Uso:** indicadores ambientales por estación y agregación territorial.  
**Entidad destino:** `ve:IndicadorCalidadAire`.  
**Estrategia de ingesta:** descargar datos diarios u oficiales y agregar por estación/municipio/proximidad. En MVP se recomienda calcular indicadores anuales o recientes agregados, no series horarias completas.  
**Quality gates:** contaminante válido, valor numérico, fecha, estación, unidad y método de agregación documentado.

### 10.14 Meteorología — AEMET OpenData

**Fuente oficial:** AEMET OpenData.  
**URL de referencia:** https://opendata.aemet.es/ y https://www.aemet.es/es/datos_abiertos/AEMET_OpenData  
**Uso:** clima, estaciones, observaciones y datos meteorológicos.  
**Entidad destino:** indicadores climáticos o ambientales.  
**Estrategia de ingesta:** requiere API key. El script debe leer `AEMET_API_KEY` desde entorno. Si no existe, debe omitir fuente con estado `skipped_missing_credentials` sin romper el pipeline.  
**Quality gates:** estación válida, fecha, unidad y rango físico razonable.

### 10.15 Ocupación del suelo — SIOSE

**Fuente oficial:** SIOSE / CNIG.  
**URL de referencia:** https://www.siose.es/ y https://centrodedescargas.cnig.es/CentroDescargas/siose  
**Uso:** naturaleza, suelo urbano, forestal, agrícola, zonas verdes y entorno territorial.  
**Entidad destino:** indicadores de entorno y uso del suelo.  
**Estrategia de ingesta:** fase avanzada o MVP parcial. Los datos pueden ser voluminosos. Se recomienda preagregar porcentajes por municipio.  
**Quality gates:** geometrías válidas, categorías normalizadas y porcentajes por municipio en rango 0–100.

### 10.16 Puntos de interés — OpenStreetMap / Geofabrik

**Fuente oficial/comunitaria:** OpenStreetMap a través de Geofabrik.  
**URL de referencia:** https://download.geofabrik.de/europe/spain.html  
**Licencia:** ODbL; requiere atribución a OpenStreetMap y sus contribuidores.  
**Uso:** supermercados, gimnasios, bibliotecas, farmacias, parques, cafeterías, restaurantes, estaciones, colegios y otros POIs.  
**Entidad destino:** `ve:Recurso` y agregados por zona.  
**Estrategia de ingesta:** descargar PBF de España o subregiones; filtrar tags relevantes con `osmium`, `pyrosm` u `ogr2ogr`; asignar municipio mediante spatial join; guardar POIs filtrados en Parquet/GeoPackage; convertir a RDF solo entidades agregadas y una muestra o subset relevante.  
**Quality gates:** coordenadas válidas, tag reconocido, asignación territorial y atribución visible en UI.

### 10.17 Turismo — Dataestur

**Fuente oficial:** Dataestur.  
**URL de referencia:** https://www.dataestur.es/apidata/  
**Uso:** demanda turística, alojamientos, ocupación, precios y otros indicadores turísticos.  
**Entidad destino:** `ve:IndicadorTurismo`.  
**Estrategia de ingesta:** usar API de Dataestur para descargar ficheros disponibles. Normalizar por destino, municipio, provincia o comunidad según granularidad.  
**Quality gates:** periodo, territorio, valor, unidad y fuente.

### 10.18 Seguridad vial — DGT

**Fuente oficial:** Dirección General de Tráfico, microdatos de accidentes con víctimas.  
**URL de referencia:** https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/  
**Uso:** indicadores de siniestralidad agregada.  
**Entidad destino:** `ve:IndicadorSeguridadVial`.  
**Estrategia de ingesta:** descargar ficheros anuales, normalizar variables, agregar por municipio/provincia/tipo de vía según disponibilidad. Evitar mostrar puntos sensibles si la granularidad no está pensada para eso.  
**Quality gates:** año válido, conteos no negativos, territorio asignado y documentación de definiciones.

### 10.19 Catastro INSPIRE

**Fuente oficial:** Sede Electrónica del Catastro, servicios INSPIRE.  
**URL de referencia:** https://www.catastro.hacienda.gob.es/webinspire/index.html  
**Uso:** parcelas, edificios y direcciones; fase avanzada para granularidad urbana.  
**Entidad destino:** edificios, direcciones o agregados de densidad.  
**Estrategia de ingesta:** descargar por municipio mediante ATOM. Como el volumen puede ser muy alto, el MVP debe limitarse a metadatos o casos piloto.  
**Quality gates:** municipio, geometría válida, tipo de entidad y cumplimiento de condiciones de uso.

### 10.20 datos.gob.es — descubrimiento semántico y catálogo

**Fuente oficial:** datos.gob.es API y SPARQL.  
**URL de referencia:** https://datos.gob.es/es/apidata y https://datos.gob.es/es/sparql  
**Uso:** descubrimiento de datasets, metadatos DCAT y documentación de fuentes.  
**Entidad destino:** `dcat:Dataset`, `dcat:Distribution`, `ve:FuenteIngesta`.  
**Estrategia de ingesta:** usar API y SPARQL para localizar datasets por publicador, tema y formato. No se usa como única fuente de datos, sino como catálogo semántico y mecanismo de descubrimiento.  
**Quality gates:** dataset con título, publicador, distribución y URL.

### 10.21 Wikidata

**Fuente oficial/comunitaria:** Wikidata Query Service.  
**URL de referencia:** https://query.wikidata.org/ y https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual  
**Uso:** enriquecimiento de entidades territoriales, equivalencias, coordenadas y metadatos.  
**Entidad destino:** enlaces `owl:sameAs` o `skos:exactMatch` hacia entidades externas.  
**Estrategia de ingesta:** consultas SPARQL limitadas y cacheadas. Se deben respetar límites de uso y evitar consultas masivas innecesarias.  
**Quality gates:** enlace único por entidad cuando sea posible, etiqueta, tipo y confianza.

### 10.22 GeoNames

**Fuente oficial/comunitaria:** GeoNames Ontology.  
**URL de referencia:** https://www.geonames.org/ontology  
**Uso:** topónimos, URIs geográficas y relaciones entre lugares.  
**Entidad destino:** enriquecimiento de `ve:Municipio`, `ve:Provincia` y lugares.  
**Estrategia de ingesta:** usar dumps o servicios RDF para topónimos necesarios, no llamadas indiscriminadas.  
**Quality gates:** país ES, correspondencia de nombre/código, coordenadas y URI.

---

## 11. Ejemplo de `sources.yaml`

El siguiente manifiesto es una base para implementación. Debe vivir en `config/sources.yaml` y ser leído por el CLI de ingesta. Los campos `url` pueden apuntar a página de referencia, endpoint, feed o recurso directo. Si una fuente requiere descubrimiento, se usa `discovery`. Si requiere clave, se declara `requires_env`.

```yaml
version: 2
updated_at: "2026-04-22"
cache:
  root: "data/cache"
  raw_root: "data/raw"
  normalized_root: "data/normalized"
  default_ttl_days: 30
  use_etag: true
  use_last_modified: true

sources:
  - id: ign_cnig_limites
    name: "Límites municipales, provinciales y autonómicos"
    publisher: "IGN/CNIG"
    category: "territory"
    url: "https://centrodedescargas.cnig.es/CentroDescargas/limites-municipales-provinciales-autonomicos"
    access_mode: "download_or_manual_resource"
    adapter: "atlashabita.ingestion.ign_cnig.LimitsAdapter"
    output: "territories_administrative_boundaries"
    graph: "urn:ve:graph:territory:ign-cnig"
    cadence: "quarterly"
    critical: true

  - id: ine_ogc_secciones
    name: "Seccionado censal OGC API Features"
    publisher: "INE"
    category: "territory"
    url: "https://www.ine.es/geoserver/ogc/features/v1/collections"
    access_mode: "ogc_api_features"
    adapter: "atlashabita.ingestion.ine.SectionsOgcAdapter"
    output: "census_sections"
    graph: "urn:ve:graph:territory:ine-sections"
    cadence: "annual"
    critical: false

  - id: ine_api_json
    name: "API JSON INE"
    publisher: "INE"
    category: "demography"
    url: "https://www.ine.es/dyngs/DAB/index.htm?cid=1099"
    access_mode: "api_json"
    adapter: "atlashabita.ingestion.ine.IneJsonAdapter"
    output: "demography_indicators"
    graph: "urn:ve:graph:demography:ine"
    cadence: "monthly"
    critical: true

  - id: ine_adrh
    name: "Atlas de Distribución de Renta de los Hogares"
    publisher: "INE"
    category: "income"
    url: "https://www.ine.es/dynt3/inebase/index.htm?capsel=5650&padre=12385"
    access_mode: "download_or_discovery"
    adapter: "atlashabita.ingestion.ine.IncomeAtlasAdapter"
    output: "income_indicators"
    graph: "urn:ve:graph:income:ine-adrh"
    cadence: "annual"
    critical: true

  - id: mivau_serpavi
    name: "Sistema Estatal de Referencia del Precio del Alquiler de Vivienda"
    publisher: "MIVAU"
    category: "housing"
    url: "https://www.mivau.gob.es/vivienda/alquila-bien-es-tu-derecho/serpavi"
    access_mode: "adapter_with_manual_fallback"
    adapter: "atlashabita.ingestion.mivau.SerpaviAdapter"
    output: "rental_price_indicators"
    graph: "urn:ve:graph:housing:mivau-serpavi"
    cadence: "annual"
    critical: true

  - id: miteco_reto_servicios
    name: "Datos de Servicios — Reto Demográfico"
    publisher: "MITECO"
    category: "services"
    url: "https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/reto-demografico/datos-servicios.html"
    access_mode: "download_or_manual_resource"
    adapter: "atlashabita.ingestion.miteco.ServicesAdapter"
    output: "service_access_indicators"
    graph: "urn:ve:graph:services:miteco-reto-demografico"
    cadence: "annual"
    critical: true

  - id: sanidad_hospitales
    name: "Catálogo Nacional de Hospitales"
    publisher: "Ministerio de Sanidad"
    category: "health"
    url: "https://datos.gob.es/es/catalogo/e05070101-centros-y-servicios-del-sns-catalogo-nacional-de-hospitales"
    access_mode: "datosgob_discovery"
    adapter: "atlashabita.ingestion.health.HospitalsAdapter"
    output: "hospitals"
    graph: "urn:ve:graph:health:sanidad-hospitals"
    cadence: "annual"
    critical: false

  - id: educacion_centros
    name: "Registro Estatal de Centros Docentes no Universitarios"
    publisher: "Ministerio de Educación"
    category: "education"
    url: "https://www.educacionfpydeportes.gob.es/servicios-al-ciudadano/catalogo/centros-docentes/servicios-generales/registro-centros-no-universitarios.html"
    access_mode: "api_or_manual_resource"
    adapter: "atlashabita.ingestion.education.SchoolsAdapter"
    output: "schools"
    graph: "urn:ve:graph:education:educacion-centros"
    cadence: "annual"
    critical: false

  - id: seteleco_broadband
    name: "Cobertura agregada de Banda Ancha"
    publisher: "SETELECO / Avance Digital"
    category: "connectivity"
    url: "https://avance.digital.gob.es/banda-ancha/cobertura/Mapas-cobertura-agregada/Paginas/incio.aspx"
    access_mode: "download_or_manual_resource"
    adapter: "atlashabita.ingestion.connectivity.BroadbandAdapter"
    output: "connectivity_indicators"
    graph: "urn:ve:graph:connectivity:seteleco-broadband"
    cadence: "annual"
    critical: true

  - id: nap_transport
    name: "Punto de Acceso Nacional de Transporte Multimodal"
    publisher: "Ministerio de Transportes"
    category: "mobility"
    url: "https://nap.transportes.gob.es/"
    access_mode: "catalog_discovery"
    adapter: "atlashabita.ingestion.transport.NapAdapter"
    output: "transport_datasets"
    graph: "urn:ve:graph:mobility:nap"
    cadence: "monthly"
    critical: false

  - id: renfe_data
    name: "Renfe Data"
    publisher: "Renfe"
    category: "mobility"
    url: "https://data.renfe.com/dataset"
    access_mode: "ckan_or_catalog_discovery"
    adapter: "atlashabita.ingestion.transport.RenfeAdapter"
    output: "railway_indicators"
    graph: "urn:ve:graph:mobility:renfe"
    cadence: "weekly"
    critical: false

  - id: miteco_air_quality
    name: "Datos de calidad del aire"
    publisher: "MITECO"
    category: "environment"
    url: "https://catalogo.datosabiertos.miteco.gob.es/catalogo/dataset/19458583-9953-4fe7-a494-e2cc26e89e58"
    access_mode: "download_or_catalog"
    adapter: "atlashabita.ingestion.environment.AirQualityAdapter"
    output: "air_quality_indicators"
    graph: "urn:ve:graph:environment:miteco-air"
    cadence: "daily_or_annual"
    critical: false

  - id: aemet_opendata
    name: "AEMET OpenData"
    publisher: "AEMET"
    category: "environment"
    url: "https://opendata.aemet.es/"
    access_mode: "api_key"
    requires_env: "AEMET_API_KEY"
    adapter: "atlashabita.ingestion.environment.AemetAdapter"
    output: "weather_climate_indicators"
    graph: "urn:ve:graph:environment:aemet"
    cadence: "daily"
    critical: false

  - id: siose_land_use
    name: "SIOSE ocupación del suelo"
    publisher: "SIOSE / CNIG"
    category: "environment"
    url: "https://centrodedescargas.cnig.es/CentroDescargas/siose"
    access_mode: "download_or_manual_resource"
    adapter: "atlashabita.ingestion.environment.SioseAdapter"
    output: "land_use_indicators"
    graph: "urn:ve:graph:environment:siose"
    cadence: "multiannual"
    critical: false

  - id: osm_geofabrik_spain
    name: "OpenStreetMap Spain extract"
    publisher: "OpenStreetMap / Geofabrik"
    category: "pois"
    url: "https://download.geofabrik.de/europe/spain.html"
    access_mode: "direct_pbf_or_subregion"
    adapter: "atlashabita.ingestion.osm.OsmPoisAdapter"
    output: "points_of_interest"
    graph: "urn:ve:graph:pois:osm"
    cadence: "weekly"
    license: "ODbL"
    attribution_required: true
    critical: false

  - id: dataestur_api
    name: "Dataestur API"
    publisher: "SEGITTUR / Dataestur"
    category: "tourism"
    url: "https://www.dataestur.es/apidata/"
    access_mode: "api"
    adapter: "atlashabita.ingestion.tourism.DataesturAdapter"
    output: "tourism_indicators"
    graph: "urn:ve:graph:tourism:dataestur"
    cadence: "monthly"
    critical: false

  - id: dgt_accidents
    name: "Microdatos de accidentes con víctimas"
    publisher: "DGT"
    category: "road_safety"
    url: "https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/"
    access_mode: "download_or_catalog"
    adapter: "atlashabita.ingestion.road_safety.DgtAccidentsAdapter"
    output: "road_safety_indicators"
    graph: "urn:ve:graph:road-safety:dgt"
    cadence: "annual"
    critical: false

  - id: catastro_inspire
    name: "Servicios INSPIRE de cartografía catastral"
    publisher: "Catastro"
    category: "cadastre"
    url: "https://www.catastro.hacienda.gob.es/webinspire/index.html"
    access_mode: "atom_by_municipality"
    adapter: "atlashabita.ingestion.catastro.CatastroInspireAdapter"
    output: "cadastre_features"
    graph: "urn:ve:graph:cadastre:catastro"
    cadence: "semiannual"
    critical: false

  - id: datosgob_catalog
    name: "datos.gob.es API y SPARQL"
    publisher: "datos.gob.es"
    category: "catalog"
    url: "https://datos.gob.es/es/apidata"
    sparql_url: "https://datos.gob.es/es/sparql"
    access_mode: "api_and_sparql"
    adapter: "atlashabita.ingestion.catalog.DatosGobAdapter"
    output: "dcat_catalog_metadata"
    graph: "urn:ve:graph:catalog:datosgob"
    cadence: "weekly"
    critical: false

  - id: wikidata
    name: "Wikidata Query Service"
    publisher: "Wikidata"
    category: "linked_data"
    url: "https://query.wikidata.org/"
    access_mode: "sparql_limited"
    adapter: "atlashabita.ingestion.linked_data.WikidataAdapter"
    output: "wikidata_links"
    graph: "urn:ve:graph:linked-data:wikidata"
    cadence: "monthly"
    critical: false

  - id: geonames
    name: "GeoNames Ontology"
    publisher: "GeoNames"
    category: "linked_data"
    url: "https://www.geonames.org/ontology"
    access_mode: "rdf_or_dump"
    adapter: "atlashabita.ingestion.linked_data.GeoNamesAdapter"
    output: "geonames_links"
    graph: "urn:ve:graph:linked-data:geonames"
    cadence: "monthly"
    critical: false
```

---

## 12. CLI de ingesta

El sistema debe proporcionar una CLI reproducible. El usuario no debe editar scripts manualmente para ejecutar una ingesta. Los comandos deben ser claros y permitir descargar todo, una fuente concreta, validar, construir RDF y lanzar la app.

Comandos recomendados:

```bash
# Preparar entorno
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Ver fuentes configuradas
atlashabita sources list

# Descargar fuentes críticas del MVP
atlashabita ingest --profile mvp

# Descargar todo lo configurado, saltando fuentes sin credenciales
atlashabita ingest --all --skip-missing-credentials

# Descargar una fuente concreta
atlashabita ingest --source ine_adrh

# Normalizar datos descargados
atlashabita normalize --profile mvp

# Construir RDF con named graphs
atlashabita kg build --profile mvp --output data/rdf/atlashabita.trig

# Validar datos tabulares y RDF
atlashabita validate --profile mvp

# Calcular scores
atlashabita score --profiles residencia teletrabajo familia negocio

# Lanzar API
atlashabita api serve --host 0.0.0.0 --port 8000

# Lanzar frontend
atlashabita frontend serve
```

La CLI debe producir logs estructurados. Cada ejecución debe tener un `run_id`, fecha, fuentes procesadas, artefactos generados, errores y duración. Si una fuente falla, el pipeline debe decidir según criticidad: una fuente crítica bloquea publicación; una fuente no crítica marca degradación y continúa con última versión válida si existe.

---

## 13. Contratos de datos normalizados

Los contratos son esquemas internos. Deben ser estables y testeables. Cada dataset normalizado debe tener columnas obligatorias y tipos esperados. Si una fuente cambia su formato, el test de contrato debe fallar antes de contaminar el grafo RDF.

### 13.1 Contrato `territories_municipalities`

```text
municipality_id: string, código INE de cinco dígitos.
municipality_name: string, nombre oficial normalizado.
province_id: string, código de provincia.
province_name: string.
autonomous_community_id: string.
autonomous_community_name: string.
geometry: geometry, multipolygon válido.
centroid_lat: float.
centroid_lon: float.
source_id: string.
source_version: string.
ingested_at: datetime.
```

Este contrato es crítico porque todos los indicadores dependen de él. No se permite publicar si hay municipios sin identificador, sin provincia o con geometría inválida.

### 13.2 Contrato `indicators`

```text
indicator_id: string.
indicator_type: string.
territory_level: enum[municipality, province, autonomous_community, census_section].
territory_id: string.
period: string.
value: decimal.
unit: string.
source_id: string.
method_id: string.
confidence: decimal between 0 and 1.
ingested_at: datetime.
```

Este contrato permite unificar renta, alquiler, conectividad, servicios, turismo, ambiente y seguridad vial. La clave lógica debe ser `indicator_type + territory_level + territory_id + period + source_id + method_id`.

### 13.3 Contrato `pois`

```text
poi_id: string.
poi_type: string.
name: string nullable.
lat: float.
lon: float.
municipality_id: string nullable.
census_section_id: string nullable.
source_id: string.
raw_tags: map/string/json.
confidence: decimal.
ingested_at: datetime.
```

Los POIs deben filtrarse por categorías útiles. No se debe cargar todo OSM a RDF sin necesidad. El contrato permite agregación por municipio y selección de subconjuntos para mapa.

### 13.4 Contrato `scores`

```text
score_id: string.
profile_id: string.
territory_level: string.
territory_id: string.
score_value: decimal 0-100.
confidence: decimal 0-1.
score_version: string.
weights_hash: string.
period_context: string.
computed_at: datetime.
```

### 13.5 Contrato `score_contributions`

```text
score_id: string.
dimension_id: string.
indicator_type: string nullable.
raw_value: decimal nullable.
normalized_value: decimal nullable.
weight: decimal.
contribution: decimal.
direction: enum[positive, negative, neutral].
explanation_token: string.
missing_policy: string nullable.
```

Este contrato es fundamental para explicabilidad. Sin contribuciones no debe mostrarse score.

---

## 14. Caché y reproducibilidad

El sistema debe tener caché en varias capas. La caché HTTP evita descargar de nuevo recursos externos sin cambios. La caché de artefactos evita reprocesar datos cuyo contenido no cambió. La caché de consultas evita recalcular rankings frecuentes. La caché de mapa evita enviar geometrías completas en cada interacción.

La caché HTTP debe respetar ETag y Last-Modified cuando el servidor los ofrece. Si no existen, debe calcular hash de contenido. Cada recurso descargado se guarda con metadatos: URL, headers, fecha de descarga, hash, tamaño, source_id y run_id. Nunca se debe sobrescribir un recurso crudo sin conservar versión o hash.

La caché de normalización debe depender del hash de entrada y de la versión del transformador. Si cambia el código de normalización, debe regenerarse el artefacto aunque la fuente no cambie. Esto puede implementarse con un `transform_version` o hash del módulo.

La caché de scoring debe depender de versión de datos, versión del algoritmo y pesos. Si el usuario cambia pesos, se recalcula ranking, pero puede cachearse por `weights_hash`. Para MVP, una cache en memoria o SQLite puede bastar. Para producción, Redis sería razonable.

---

## 15. Scoring engine

El scoring engine debe ser determinista y explicable. Cada perfil define dimensiones, cada dimensión define indicadores y cada indicador define normalización, dirección, peso y política de missing data. La configuración debe vivir en `config/scoring.yaml` para poder ajustar sin modificar código.

Ejemplo conceptual:

```yaml
profiles:
  teletrabajo:
    dimensions:
      connectivity:
        weight: 0.30
        indicators:
          broadband_100mbps:
            weight: 0.70
            direction: higher_is_better
            missing_policy: critical_penalty
          mobile_5g:
            weight: 0.30
            direction: higher_is_better
            missing_policy: conservative_imputation
      housing:
        weight: 0.20
        indicators:
          rental_reference:
            weight: 1.0
            direction: lower_is_better
            missing_policy: confidence_penalty
      services:
        weight: 0.15
        indicators:
          hospital_access_minutes:
            weight: 0.50
            direction: lower_is_better
          pharmacies_per_1000:
            weight: 0.25
            direction: higher_is_better
          schools_per_1000:
            weight: 0.25
            direction: higher_is_better
```

La normalización debe ser robusta a outliers. Para indicadores con colas largas, como densidad de POIs, se recomienda winsorización o escala logarítmica antes de min-max. Para indicadores comparables nacionalmente, la normalización puede ser nacional. Para indicadores dependientes de contexto, se puede usar comparación provincial o autonómica en la explicación, pero el score debe documentar qué referencia utiliza.

La confianza se calcula separada del score. Un municipio puede tener buen score con baja confianza si faltan datos. La UI debe mostrar ambos. Esto evita que el ranking parezca más preciso de lo que es.

---

## 16. Explicabilidad

La explicación debe generarse a partir de `score_contributions`. El algoritmo debe identificar las tres contribuciones positivas más fuertes, las dos negativas más importantes y los datos faltantes críticos. Con eso se construye una frase natural.

Ejemplo:

```text
Este municipio encaja bien con teletrabajo porque tiene alta cobertura de banda ancha, alquiler moderado frente a la media provincial y buen acceso a servicios básicos. Penaliza ligeramente por menor conectividad ferroviaria. La confianza es media porque faltan datos recientes de calidad del aire.
```

La explicación no debe inventar causalidad. Debe hablar de encaje con criterios, no de garantías. No debe decir “será rentable abrir una cafetería”. Debe decir “presenta oportunidad relativa alta para cafetería porque combina turismo, movilidad y competencia moderada”.

Cada explicación debe ser testeable. Dado un conjunto de contribuciones, la salida debe contener factores esperados. Se pueden usar tests snapshots para evitar regresiones textuales.

---

## 17. API backend

La API debe ser clara y orientada al producto. No debe exponer la complejidad interna salvo en endpoints avanzados. Todos los endpoints deben devolver metadatos de versión de datos y perfil cuando aplique.

### 17.1 Endpoints principales

```http
GET /health
GET /metadata
GET /profiles
POST /recommendations/search
GET /territories/{territory_id}
POST /territories/compare
GET /territories/{territory_id}/sources
GET /territories/{territory_id}/rdf?format=turtle
GET /map/municipalities?profile=teletrabajo&indicator=score
GET /quality/summary
```

`POST /recommendations/search` recibe perfil, filtros, pesos y nivel territorial. Devuelve ranking paginado, bounding boxes para mapa y resumen de calidad. El backend debe validar el payload y rechazar pesos inválidos.

### 17.2 Payload de búsqueda

```json
{
  "profile_id": "teletrabajo",
  "territory_level": "municipality",
  "filters": {
    "autonomous_community_id": null,
    "province_id": null,
    "min_population": 5000,
    "max_rental_reference": 900
  },
  "weights_override": {
    "connectivity": 0.35,
    "housing": 0.25,
    "services": 0.15,
    "environment": 0.15,
    "mobility": 0.10
  },
  "page": 1,
  "page_size": 25
}
```

### 17.3 Respuesta de ranking

```json
{
  "data_version": "2026-04-22T12:00:00Z",
  "score_version": "teletrabajo-v1.2.0",
  "results": [
    {
      "territory_id": "municipio/24089",
      "name": "León",
      "province": "León",
      "score": 82.4,
      "confidence": 0.91,
      "badges": ["Buena conectividad", "Alquiler moderado", "Servicios completos"],
      "warning_badges": ["Movilidad ferroviaria media"],
      "explanation_short": "Encaja bien por conectividad, coste y servicios; penaliza ligeramente por movilidad interurbana.",
      "top_contributions": [
        {"dimension": "connectivity", "contribution": 22.1},
        {"dimension": "housing", "contribution": 17.4}
      ]
    }
  ]
}
```

---

## 18. Frontend y mapa

El frontend debe organizarse alrededor del mapa, el ranking y la ficha. En una implementación rápida, Streamlit con Folium/Leaflet puede servir para MVP. Para una interfaz más premium y production-ready, React o Next.js con MapLibre GL o Leaflet sería mejor. La decisión depende del tiempo. Si el objetivo académico prioriza RDF e ingesta, Streamlit permite avanzar rápido. Si el objetivo es pulir interfaz, React ofrece más control.

El mapa debe consumir geometrías simplificadas. No debe pedir todas las geometrías pesadas al cargar. La API puede ofrecer GeoJSON simplificado por nivel de zoom o tiles vectoriales en fases avanzadas. Las geometrías completas se reservan para ficha o análisis.

El diseño visual debe tener componentes reutilizables: `ProfileWizard`, `MapCanvas`, `Legend`, `RankingPanel`, `TerritoryCard`, `ScoreBreakdown`, `SourceInspector`, `ComparisonTable`, `QualityBadge` y `EmptyState`. Cada componente debe tener props claras y no mezclar lógica de negocio con renderizado. La lógica de scoring no debe vivir en frontend.

---

## 19. Consultas SPARQL principales

El sistema debe incluir consultas SPARQL guardadas en `queries/`. Estas consultas sirven para demo, validación y exportación. Aunque parte del ranking se haga en tablas precomputadas por rendimiento, SPARQL debe usarse de forma real para demostrar el grafo.

Consulta de indicadores por municipio:

```sparql
PREFIX ve: <https://atlashabita.local/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX prov: <http://www.w3.org/ns/prov#>

SELECT ?municipio ?nombre ?indicator ?type ?value ?unit ?period ?source
WHERE {
  ?municipio a ve:Municipio ;
             rdfs:label ?nombre .
  ?indicator ve:observedIn ?municipio ;
             a ?type ;
             ve:value ?value ;
             ve:unit ?unit ;
             ve:period ?period ;
             prov:wasDerivedFrom ?source .
  FILTER(?municipio = <https://atlashabita.local/id/municipio/28079>)
}
ORDER BY ?type ?period
```

Consulta de procedencia por named graph:

```sparql
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>

SELECT ?graph ?entity ?source ?date
WHERE {
  GRAPH ?graph {
    ?entity prov:wasDerivedFrom ?source .
    OPTIONAL { ?entity dct:modified ?date . }
  }
}
LIMIT 100
```

Consulta de scores por perfil:

```sparql
PREFIX ve: <https://atlashabita.local/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?municipio ?nombre ?score ?confidence
WHERE {
  GRAPH <urn:ve:graph:app:scores> {
    ?scoreNode a ve:Score ;
               ve:forProfile ve:profile/teletrabajo ;
               ve:forTerritory ?municipio ;
               ve:scoreValue ?score ;
               ve:confidence ?confidence .
  }
  ?municipio rdfs:label ?nombre .
}
ORDER BY DESC(?score)
LIMIT 25
```

---

## 20. Validación SHACL

SHACL debe validar la estructura RDF antes de publicar. Las shapes deben ser estrictas para entidades críticas. Un municipio sin etiqueta o código no debe pasar. Un indicador sin valor, unidad o fuente no debe pasar. Un score sin perfil, territorio, valor y confianza no debe pasar.

Ejemplo de shape para indicadores:

```ttl
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ve: <https://atlashabita.local/ontology#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ve:IndicatorShape
    a sh:NodeShape ;
    sh:targetClass ve:Indicador ;
    sh:property [
        sh:path ve:observedIn ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:message "Todo indicador debe estar asociado a una zona territorial." ;
    ] ;
    sh:property [
        sh:path ve:value ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:datatype xsd:decimal ;
        sh:message "Todo indicador debe tener un valor decimal." ;
    ] ;
    sh:property [
        sh:path ve:unit ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:message "Todo indicador debe declarar unidad." ;
    ] ;
    sh:property [
        sh:path prov:wasDerivedFrom ;
        sh:minCount 1 ;
        sh:message "Todo indicador debe tener procedencia." ;
    ] .
```

La validación SHACL debe generar un informe RDF y un resumen legible. Los fallos críticos bloquean publicación. Los fallos no críticos pueden generar warnings si afectan a fuentes opcionales.

---

## 21. Observabilidad

El sistema debe producir logs estructurados con `run_id`, `source_id`, `stage`, `duration_ms`, `records_in`, `records_out`, `errors`, `warnings` y `artifact_hash`. Los logs deben permitir reconstruir qué ocurrió en una ingesta sin leer trazas desordenadas.

Las métricas mínimas son número de fuentes descargadas, fuentes fallidas, tamaño de descargas, tiempo de normalización, número de municipios cubiertos, número de indicadores calculados, número de triples, errores SHACL, tiempo de consultas API y tiempo de renderizado de mapa.

La aplicación debe exponer `/health` para estado básico y `/quality/summary` para estado de datos. En MVP puede bastar con logs en fichero y resumen JSON. En producción se podrían añadir Prometheus/Grafana.

---

## 22. Testing

La estrategia de testing debe cubrir unidades, contratos, integración, RDF y frontend. Los tests unitarios validan normalizadores, scoring y explicaciones. Los tests de contrato validan esquemas de fuentes. Los tests de integración ejecutan pipelines con muestras pequeñas. Los tests RDF validan shapes y consultas SPARQL. Los tests frontend validan flujos principales.

Cada adaptador de fuente debe tener una muestra fixture. No se deben hacer tests unitarios que dependan de internet. Los tests de integración online pueden marcarse como opcionales. La ingesta real se prueba en pipeline controlado, no en cada test unitario.

El scoring debe tener tests de regresión. Para un conjunto pequeño de municipios ficticios con indicadores conocidos, el ranking esperado debe ser determinista. Esto evita que cambios de normalización alteren resultados sin detección.

La explicación debe tener tests. Si un municipio tiene alta conectividad y bajo alquiler, la explicación debe mencionar esos factores. Si falta un indicador crítico, debe mencionar baja confianza o dato faltante.

---

## 23. Seguridad y privacidad

El MVP no necesita datos personales. Los perfiles de búsqueda pueden ser anónimos y guardarse en URL o sesión local. Si en fases futuras se añaden cuentas, favoritos persistentes o alertas, se deberá aplicar minimización de datos, consentimiento, cifrado de secretos y política de privacidad.

Las claves API, como AEMET, deben leerse desde variables de entorno y nunca guardarse en el repositorio. Los logs no deben imprimir secretos. El sistema debe validar URLs descargadas para evitar usos indebidos si se permite modificar `sources.yaml` desde UI.

La API debe tener límites de paginación y validación de payloads. No debe permitir ejecutar SPARQL arbitrario públicamente sin control. Las consultas SPARQL avanzadas pueden limitarse a consultas predefinidas o modo local.

---

## 24. Rendimiento

El mapa municipal debe cargar de forma fluida. Para conseguirlo, las geometrías deben simplificarse y comprimirse. El ranking debe paginarse o virtualizarse. Las fichas deben cargar indicadores bajo demanda. Las consultas pesadas deben precomputarse.

Los objetivos MVP son razonables: carga inicial inferior a unos pocos segundos en entorno local, recalculo de ranking tras cambiar pesos en menos de un segundo si los scores están precomputados, ficha de municipio en menos de medio segundo desde API local y validación completa ejecutable en minutos para dataset MVP. Los valores exactos pueden ajustarse tras medir, pero el sistema debe diseñarse para medir.

La construcción RDF puede tardar más porque es proceso batch. No debe bloquear la interfaz. La aplicación debe usar artefactos publicados, no construir grafo en cada arranque.

---

## 25. Deployment

Para MVP, el despliegue puede ser local con Docker Compose. Un contenedor ejecuta API, otro frontend y opcionalmente otro triplestore. Los datos se montan como volumen. La ingesta puede ejecutarse como job manual.

En producción, se recomienda separar jobs de ingesta, API, frontend y almacenamiento. Los artefactos de datos deben publicarse de forma versionada. La API no debe escribir sobre datos publicados; debe leer snapshots estables. Las nuevas ingestas se preparan en staging y se promueven tras pasar quality gates.

Docker Compose de MVP:

```yaml
services:
  api:
    build: .
    command: atlashabita api serve --host 0.0.0.0 --port 8000
    volumes:
      - ./data:/app/data
    ports:
      - "8000:8000"
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - API_BASE_URL=http://api:8000
  fuseki:
    image: stain/jena-fuseki
    profiles: ["triplestore"]
    ports:
      - "3030:3030"
```

---

## 26. Definition of Done técnica global

Una historia técnica queda terminada cuando tiene código implementado, tests, documentación breve, logs, gestión de errores, contrato de datos si aplica, validación y artefactos reproducibles. Una ingesta no está terminada hasta que puede ejecutarse dos veces y producir el mismo resultado si la fuente no cambió. Una feature de UI no está terminada hasta que contempla carga, error, vacío, dato parcial y dato desactualizado.

Un adaptador de fuente está terminado cuando lee configuración desde `sources.yaml`, descarga con caché, guarda snapshot crudo, normaliza a contrato, registra metadatos, pasa tests de contrato, maneja fallo de red, documenta licencia y produce métricas de cobertura.

Un indicador está terminado cuando tiene definición, unidad, fuente, periodo, método de cálculo, normalización, política de missing data, shape SHACL si se transforma a RDF, tests y explicación en UI.

Un perfil de recomendación está terminado cuando tiene pesos configurables, score reproducible, contribuciones, explicación, confianza, tests de regresión y representación en mapa/ranking/ficha.

Un mapa está terminado cuando renderiza rápido, es accesible, tiene leyenda clara, maneja valores faltantes, sincroniza selección con ranking, muestra atribución y no bloquea la app con geometrías pesadas.

---

## 27. Plan de implementación incremental

La primera iteración debe crear el esqueleto del repositorio, CLI, configuración, caché, logging y contratos. Sin esta base, cada fuente posterior será deuda técnica. Esta iteración también debe incluir un dataset mínimo de municipios y geometrías simplificadas.

La segunda iteración debe incorporar INE, renta y población. Con esto ya se pueden crear fichas territoriales básicas. La tercera iteración debe incorporar vivienda, conectividad y servicios. Con esto ya se puede construir el primer perfil de teletrabajo. La cuarta iteración debe incorporar mapa, ranking y ficha. En ese punto existe una demo funcional.

La quinta iteración debe añadir RDF y SHACL de forma fuerte: named graphs, ontología, consultas y validación. Aunque se puede construir RDF antes, esta iteración lo convierte en eje del proyecto. La sexta iteración debe añadir explicabilidad y panel de calidad. La séptima debe añadir modo negocio con OSM y turismo. La octava debe pulir interfaz, exportación y rendimiento.

---

## 28. Arquitectura de RDFLib

RDFLib se usará para construir datasets RDF con named graphs. El builder debe recibir tablas normalizadas y producir triples. Debe evitar mezclar descarga con construcción RDF. Cada mapper debe ser pequeño: `map_municipalities_to_rdf`, `map_indicators_to_rdf`, `map_sources_to_dcat`, `map_scores_to_rdf`.

Ejemplo base:

```python
from rdflib import Dataset, Namespace, URIRef, Literal
from rdflib.namespace import RDF, RDFS, XSD, DCTERMS

VE = Namespace("https://atlashabita.local/ontology#")
ID = "https://atlashabita.local/id/"

def municipality_uri(code: str) -> URIRef:
    return URIRef(f"{ID}municipio/{code}")

def build_municipality_graph(rows) -> Dataset:
    ds = Dataset()
    g = ds.graph(URIRef("urn:ve:graph:territory:ign-cnig"))
    for row in rows:
        m = municipality_uri(row["municipality_id"])
        g.add((m, RDF.type, VE.Municipio))
        g.add((m, RDFS.label, Literal(row["municipality_name"], lang="es")))
        g.add((m, VE.codigoINE, Literal(row["municipality_id"])))
    return ds
```

El código real debe usar tipos, validación y tests. Los namespaces deben centralizarse en `knowledge_graph/namespaces.py`. Las URIs deben generarse desde `uri_policy.py`. Ningún mapper debe construir URIs manualmente con strings dispersos.

---

## 29. Integración con triplestore opcional

En MVP, RDFLib puede trabajar con ficheros TriG locales. Si el grafo crece o se desea una demo SPARQL más potente, se puede cargar el TriG en Apache Jena Fuseki. La API puede consultar Fuseki para endpoints avanzados y seguir usando tablas precomputadas para ranking por rendimiento.

La decisión de usar triplestore debe basarse en necesidades. Si las consultas RDF locales son suficientes, no se añade complejidad. Si se quieren consultas SPARQL interactivas, federación o persistencia robusta, Fuseki aporta valor. La arquitectura debe permitir ambas opciones sin reescribir mappers.

---

## 30. Calidad visual y UX técnica

El frontend debe tratar la experiencia como parte del sistema, no como una capa decorativa. Cada respuesta de API debe estar diseñada para componentes. Si la UI necesita badges, explicaciones y contribuciones, la API debe devolverlas ya estructuradas. No se debe obligar al frontend a reconstruir lógica de negocio.

Los componentes deben manejar cinco estados: cargando, listo, vacío, error y degradado. El estado degradado es importante en datos abiertos: una fuente puede estar omitida o desactualizada, pero el sistema puede seguir funcionando. La UI debe mostrar “datos parcialmente disponibles” de forma elegante.

El diseño debe ser responsive. En escritorio, mapa y ranking pueden estar lado a lado. En móvil, el ranking puede ser panel inferior y el mapa ocupar la parte superior. Aunque la demo universitaria probablemente sea escritorio, diseñar responsive mejora calidad percibida.

---

## 31. Referencias técnicas y fuentes oficiales

- RDFLib: https://rdflib.readthedocs.io/
- W3C DCAT 3: https://www.w3.org/TR/vocab-dcat-3/
- W3C SHACL: https://www.w3.org/TR/shacl/
- W3C PROV-O: https://www.w3.org/TR/prov-o/
- W3C SPARQL 1.1 Query: https://www.w3.org/TR/sparql11-query/
- OGC GeoSPARQL: https://www.ogc.org/standards/geosparql/
- datos.gob.es API: https://datos.gob.es/es/apidata
- datos.gob.es SPARQL: https://datos.gob.es/es/sparql
- INE Datos abiertos: https://www.ine.es/datosabiertos/
- INE API JSON: https://www.ine.es/dyngs/DAB/index.htm?cid=1099
- INE OGC API Features: https://www.ine.es/geoserver/ogc/features/v1/collections
- INE Atlas de Distribución de Renta de los Hogares: https://www.ine.es/dynt3/inebase/index.htm?capsel=5650&padre=12385
- CNIG límites administrativos: https://centrodedescargas.cnig.es/CentroDescargas/limites-municipales-provinciales-autonomicos
- MIVAU SERPAVI: https://www.mivau.gob.es/vivienda/alquila-bien-es-tu-derecho/serpavi
- MITECO Datos de Servicios: https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/reto-demografico/datos-servicios.html
- MITECO calidad del aire: https://catalogo.datosabiertos.miteco.gob.es/catalogo/dataset/19458583-9953-4fe7-a494-e2cc26e89e58
- AEMET OpenData: https://opendata.aemet.es/
- NAP Transporte: https://nap.transportes.gob.es/
- Renfe Data: https://data.renfe.com/dataset
- DGT en cifras: https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/
- Dataestur API: https://www.dataestur.es/apidata/
- OpenStreetMap Geofabrik Spain: https://download.geofabrik.de/europe/spain.html
- OpenStreetMap copyright/license: https://www.openstreetmap.org/copyright
- Catastro INSPIRE: https://www.catastro.hacienda.gob.es/webinspire/index.html
- SIOSE: https://www.siose.es/
- Wikidata Query Service: https://query.wikidata.org/
- GeoNames Ontology: https://www.geonames.org/ontology

---

## 32. Cierre técnico

AtlasHabita debe implementarse como un producto de datos serio, no como una colección de notebooks. La diferencia está en contratos, caché, versionado, pruebas, procedencia, validación y una interfaz que convierta datos en decisiones. El uso de RDFLib debe ser central y visible: construcción de named graphs, consultas SPARQL, serialización, exportación y validación semántica.

La arquitectura propuesta permite empezar pequeño y crecer. El MVP municipal demuestra cobertura nacional. Los perfiles demuestran utilidad. El grafo RDF demuestra profundidad académica. El mapa demuestra experiencia visual. La procedencia y SHACL demuestran rigor. La caché y el diseño orientado a datos demuestran madurez de ingeniería.


---

## 33. Patrones de implementación por adaptador

Cada adaptador de ingesta debe seguir el mismo ciclo lógico: descubrir, descargar, verificar, almacenar crudo, normalizar, validar contrato y registrar artefactos. Esta secuencia debe estar codificada en una clase base o workflow común para evitar que cada fuente resuelva el problema de forma distinta. El adaptador concreto solo debe implementar las diferencias de fuente.

La interfaz recomendada es:

```python
from typing import Protocol
from pathlib import Path

class SourceAdapter(Protocol):
    source_id: str

    def discover(self) -> list[RemoteResource]:
        ...

    def download(self, resources: list[RemoteResource]) -> list[RawArtifact]:
        ...

    def normalize(self, artifacts: list[RawArtifact]) -> list[NormalizedArtifact]:
        ...

    def validate(self, artifacts: list[NormalizedArtifact]) -> ValidationReport:
        ...
```

La implementación real puede usar clases abstractas, composición o funciones puras, pero el contrato mental debe mantenerse. Descubrir no debe normalizar. Normalizar no debe descargar. Validar no debe escribir RDF. Esta separación facilita reejecutar una fase concreta y aislar errores.

Los adaptadores deben devolver objetos de resultado, no solo escribir en disco de forma silenciosa. Un `RawArtifact` debe contener ruta, hash, tamaño, content type, fecha de descarga y URL. Un `NormalizedArtifact` debe contener ruta, esquema, número de filas, columnas, periodo y source_id. Un `ValidationReport` debe contener errores críticos, warnings y métricas.

---

## 34. Quality gates por fase

La fase de descarga falla si una fuente crítica no se puede descargar y no existe snapshot válido anterior. Si existe snapshot anterior, el sistema puede continuar en modo degradado, pero debe marcar el estado. Para fuentes no críticas, el sistema puede continuar y registrar `skipped` o `failed_non_critical`.

La fase de normalización falla si faltan columnas obligatorias, si hay tipos incompatibles, si los códigos territoriales no se pueden parsear o si el porcentaje de registros válidos cae por debajo del umbral configurado. La normalización no debe producir datos silenciosamente corruptos.

La fase geoespacial falla si las geometrías críticas no son válidas o si la unión espacial asigna menos registros de lo esperado. Para POIs, puede haber un porcentaje pequeño de elementos sin municipio, pero debe registrarse. Para municipios, no se admite geometría ausente.

La fase RDF falla si las shapes SHACL críticas no pasan. Un grafo con indicadores sin fuente no debe publicarse. Un grafo con scores sin perfil no debe publicarse. Los warnings pueden publicarse si están documentados y no afectan a funcionalidades críticas.

La fase de scoring falla si un perfil no puede calcularse para una cobertura mínima. Por ejemplo, si el perfil de teletrabajo no tiene conectividad para la mayoría de municipios, debe fallar o declararse no disponible. No debe mostrar scores engañosos.

---

## 35. Algoritmo de normalización de indicadores

Cada indicador debe declarar si valores altos son mejores o peores. Para `higher_is_better`, el valor normalizado sube con el valor. Para `lower_is_better`, el valor normalizado baja con el valor. Para indicadores con rango natural, como porcentajes, se usa el rango 0–100. Para indicadores sin rango natural, se calcula rango robusto con percentiles.

La fórmula base para `higher_is_better` es:

```text
p_low = percentile(values, 5)
p_high = percentile(values, 95)
clipped = min(max(value, p_low), p_high)
normalized = 100 * (clipped - p_low) / (p_high - p_low)
```

Para `lower_is_better`, se invierte:

```text
normalized = 100 - normalized_higher_is_better(value)
```

Esta técnica evita que outliers extremos dominen el score. Sin embargo, cada indicador debe poder sobrescribir la normalización. El tiempo a hospital puede tener umbrales interpretables: menos de 15 minutos excelente, 15–30 aceptable, más de 45 malo. La cobertura de fibra puede usar directamente porcentaje.

Los datos faltantes deben tratarse según política. `critical_penalty` reduce fuertemente score y confianza. `confidence_penalty` mantiene score con imputación conservadora pero baja confianza. `ignore_if_missing` excluye el indicador de la dimensión si no es esencial. Todas las políticas deben quedar visibles en explicación.

---

## 36. Fórmula de confianza

La confianza debe calcularse por perfil y territorio. No es una sensación subjetiva, sino una métrica basada en completitud, frescura y calidad de fuente. Una fórmula inicial puede ser:

```text
confidence = 0.50 * completeness + 0.30 * freshness + 0.20 * source_quality
```

`completeness` mide el porcentaje ponderado de indicadores disponibles. `freshness` mide si los datos están dentro de la cadencia esperada. `source_quality` mide si la fuente es oficial, comunitaria, derivada o manual. Las fuentes oficiales tienen puntuación alta, las comunitarias consolidadas como OSM también pueden ser altas para POIs, y las fuentes manuales o fallback tienen puntuación menor.

La confianza debe mostrarse con lenguaje simple: alta, media o baja. El valor numérico puede estar disponible en modo avanzado. Un score alto con confianza baja debe aparecer con advertencia.

---

## 37. Estrategia de mapas y geometrías

Las geometrías oficiales pueden ser pesadas. El sistema debe mantener al menos dos versiones: geometría de análisis y geometría de visualización. La geometría de análisis conserva precisión y CRS original o EPSG:4326 según operación. La geometría de visualización está simplificada y optimizada para mapa.

La simplificación debe preservar topología de forma razonable. Para el frontend, el objetivo es que el mapa se cargue rápido, no que sirva para medición catastral. Los cálculos de área, distancia o intersección deben usar geometrías de análisis, no geometrías simplificadas.

En MVP, la API puede servir GeoJSON simplificado por municipios. En fase avanzada, deben generarse tiles vectoriales. Los tiles permiten navegar con fluidez y evitan enviar miles de polígonos en una sola respuesta. Para una demo universitaria, GeoJSON simplificado puede ser suficiente si se cachea y comprime.

---

## 38. Diseño de base analítica

Aunque RDF es el núcleo semántico, el sistema necesita una base analítica eficiente. Los indicadores por municipio pueden almacenarse en tablas anchas para scoring y en tablas largas para trazabilidad. La tabla larga es flexible; la tabla ancha acelera ranking.

Tabla larga:

```text
territory_id | indicator_type | period | value | unit | source_id | confidence
```

Tabla ancha materializada:

```text
territory_id | income_mean | rental_ref | broadband_100 | hospital_minutes | schools_count | tourism_index | ...
```

La tabla ancha debe generarse desde la larga, nunca editarse manualmente. El grafo RDF debe generarse desde contratos normalizados, no desde respuestas de frontend. Así se mantiene una única fuente de verdad.

---

## 39. Convenciones de código

El proyecto debe usar tipado estático progresivo. Todas las funciones públicas deben tener type hints. Los modelos de configuración y payloads deben usar Pydantic o dataclasses con validación. Las funciones de normalización deben recibir y devolver dataframes o artefactos claramente tipados.

Los errores deben ser específicos. No se debe lanzar `Exception` genérico cuando falla una fuente. Deben existir errores como `SourceUnavailableError`, `SchemaMismatchError`, `GeometryValidationError`, `MissingCredentialsError` y `QualityGateFailedError`. Estos errores permiten que la CLI decida si continuar o bloquear.

El logging debe ser estructurado. En vez de `print`, se usa logger con campos. Un log de ingesta debe incluir `source_id`, `stage`, `run_id` y `artifact`. Esto permite depuración y métricas.

El código debe pasar formateo y linting. Se recomienda Ruff para lint, Black o formato de Ruff, mypy o pyright para tipado progresivo, pytest para tests y pre-commit para ejecutar checks antes de commits.

---

## 40. CI/CD y automatización

El pipeline de integración continua debe ejecutar lint, tests unitarios, tests de contrato con fixtures, validación de shapes SHACL sobre un grafo pequeño y construcción de documentación. No debe descargar datasets completos en cada commit. Las ingestas completas deben ejecutarse manualmente o en jobs programados.

El pipeline de datos debe tener stages separados. Primero se descarga. Luego se normaliza. Luego se valida. Luego se construye RDF. Luego se calculan scores. Luego se publica snapshot. Si una fase falla, no se promueve snapshot nuevo.

Un release de datos debe tener versión. Por ejemplo, `data_version=2026-04-22.1`. El frontend debe mostrar esa versión. Si la API sirve datos de una versión, todas las respuestas deben incluirla para reproducibilidad.

---

## 41. Estrategia de documentación interna

Cada fuente debe tener un documento corto en `docs/sources/{source_id}.md`. Ese documento debe explicar qué contiene la fuente, cómo se descarga, qué campos se usan, qué transformaciones se aplican, qué limitaciones tiene y qué indicadores alimenta. La documentación no debe ser un lujo; es parte del sistema porque las fuentes públicas cambian.

Cada indicador debe tener una ficha en `docs/indicators/{indicator_type}.md`. La ficha debe incluir definición, fórmula, unidad, fuente, normalización, dirección, missing policy y ejemplos. Esto evita que el scoring se convierta en una caja negra.

Cada decisión arquitectónica importante debe registrarse como ADR. Por ejemplo: “usar municipios como granularidad MVP”, “almacenar datos brutos en Parquet/GeoPackage y no todo en RDF”, “usar named graphs por fuente”, “calcular scoring fuera de SPARQL por rendimiento”. Las ADRs ayudan a defender el proyecto ante preguntas.

---

## 42. Casos límite y comportamiento esperado

Si un municipio no tiene dato de alquiler, el sistema no debe eliminarlo automáticamente. Debe calcular score con política definida y bajar confianza. La UI debe mostrar “sin dato suficiente de alquiler”. Si el usuario filtra por alquiler máximo, entonces sí puede quedar fuera porque no se puede verificar que cumpla.

Si una fuente cambia columnas, el adaptador debe fallar en contrato. No debe intentar adivinar silenciosamente. El error debe indicar columna faltante, fuente y recurso. Esto permite actualizar el adaptador de manera controlada.

Si una geometría de municipio es inválida, el sistema debe intentar reparación controlada y registrar incidencia. Si no puede repararse, la publicación debe bloquearse porque el mapa depende de esa geometría.

Si el usuario establece pesos extremos, por ejemplo 100% alquiler y 0% todo lo demás, el sistema debe permitirlo si es válido, pero la explicación debe indicar que el ranking está dominado por coste. Los pesos deben normalizarse para sumar 1.

Si la API de AEMET no tiene clave, la fuente se marca como omitida por credenciales. El pipeline continúa si AEMET no es crítica para el perfil MVP. El panel de calidad debe mostrarlo.

---

## 43. Backlog técnico recomendado

La primera épica es “base territorial reproducible”. Incluye ingesta de CNIG, códigos INE, geometrías simplificadas, contrato de municipios, API básica de territorios y mapa inicial. Sin esta épica, ninguna recomendación tiene base espacial.

La segunda épica es “indicadores mínimos nacionales”. Incluye población, renta, alquiler, conectividad y servicios. Debe producir tabla de indicadores y RDF de indicadores. Esta épica convierte el mapa en una herramienta informativa.

La tercera épica es “recomendación explicable”. Incluye perfiles, scoring, contribuciones, confianza y explicación. Esta épica transforma datos en producto.

La cuarta épica es “interfaz premium”. Incluye asistente, mapa, ranking, ficha, comparador y estados de UI. Esta épica transforma motor técnico en experiencia.

La quinta épica es “procedencia semántica”. Incluye DCAT, PROV-O, named graphs, inspector de fuentes, SPARQL y SHACL. Esta épica demuestra profundidad RDF.

La sexta épica es “modo negocio”. Incluye OSM, Dataestur, competencia, demanda, coste y tipos de negocio. Esta épica añade utilidad diferencial.

---

## 44. Definition of Done por fuente de datos

Una fuente queda terminada cuando puede ejecutarse con `atlashabita ingest --source source_id`, cuando descarga o localiza recursos según el manifiesto, cuando guarda snapshot crudo, cuando produce contrato normalizado, cuando registra metadatos, cuando tiene test con fixture, cuando documenta licencia y cuando aparece en el panel de calidad.

La fuente también debe tener política de actualización. Si es anual, no se debe descargar diariamente sin necesidad. Si es diaria, se debe cachear correctamente. Si requiere clave, debe fallar con mensaje claro cuando falta. Si tiene descarga manual, el adaptador debe buscar ficheros en una ruta estándar y validar nombre/estructura.

---

## 45. Definition of Done por pantalla

Una pantalla queda terminada cuando cumple experiencia, datos, accesibilidad y errores. Debe tener skeleton de carga, estado vacío, estado de error, estado parcial y estado listo. Debe ser usable con teclado en lo esencial. Debe no romperse con textos largos o datos faltantes. Debe tener tests de componentes o pruebas manuales documentadas.

La pantalla de mapa queda terminada cuando no bloquea la navegación, cuando la leyenda es comprensible, cuando valores faltantes tienen estilo propio, cuando el ranking se sincroniza, cuando la atribución OSM aparece si se usan datos OSM y cuando los colores cumplen contraste razonable.

La ficha queda terminada cuando todos los indicadores visibles tienen fuente. Ningún dato de ficha puede aparecer como número huérfano. Esta regla es estricta.

---

## 46. Preparación de defensa académica

La defensa debe incluir una consulta SPARQL en vivo o pregrabada. Una buena consulta recupera los municipios mejor puntuados para teletrabajo y sus fuentes de conectividad y alquiler. Otra consulta muestra todos los indicadores de un municipio agrupados por named graph. Una tercera consulta muestra datasets DCAT usados en la ingesta.

La defensa debe mostrar SHACL fallando con un ejemplo controlado. Por ejemplo, se elimina la fuente de un indicador y la validación devuelve error. Esto demuestra que la calidad no es decorativa.

La defensa debe mostrar el flujo completo de una fuente. Por ejemplo, INE ADRH: descarga, normalización, indicador, RDF, score, explicación y UI. Esta cadena de extremo a extremo es la mejor forma de demostrar profundidad.

---

## 47. Reglas definitivas de clean code para este proyecto

El código de AtlasHabita debe estar escrito para ser leído, no solo para funcionar. Cada módulo debe tener una responsabilidad clara y un vocabulario coherente con el dominio. Un archivo llamado `scoring.py` debe contener lógica de scoring, no descargas HTTP. Un archivo llamado `territories/codes.py` debe tratar identificadores territoriales, no normalización de alquiler. Esta separación reduce acoplamiento y facilita pruebas.

Los principios SOLID deben aplicarse de forma pragmática. La responsabilidad única significa que cada adaptador de fuente descarga y normaliza una fuente, pero no calcula recomendaciones. Abierto/cerrado significa que añadir una nueva fuente debe requerir un nuevo adaptador registrado, no modificar un switch gigante. Sustitución de Liskov significa que todos los adaptadores deben cumplir el mismo contrato y poder ejecutarse desde el pipeline sin excepciones especiales. Segregación de interfaces significa que un servicio que solo necesita leer indicadores no debe depender de métodos de escritura RDF. Inversión de dependencias significa que la lógica de dominio depende de interfaces, no de FastAPI, Streamlit, requests o RDFLib directamente.

DRY no debe interpretarse como crear abstracciones prematuras. Dos adaptadores pueden tener código parecido al principio si sus fuentes son distintas. La duplicación se elimina cuando aparece un patrón real. Lo que sí debe evitarse desde el primer día es duplicar reglas de negocio: pesos de perfiles, definiciones de indicadores, URIs, nombres de columnas canónicas y políticas de nulos deben estar en un único lugar. Un número mágico en scoring es una deuda técnica inmediata.

El código debe tener tipos. No es obligatorio tipar todo con perfección desde el primer commit, pero las fronteras del sistema sí deben estar tipadas: contratos de datos, configuraciones, respuestas de API, perfiles, indicadores y resultados de scoring. Pydantic o dataclasses pueden representar estas estructuras. Un adaptador que devuelve un DataFrame sin contrato explícito es frágil. Un adaptador que devuelve un objeto validado es mantenible.

---

## 48. Diseño orientado a datos aplicado de forma estricta

El diseño orientado a datos exige pensar primero en la forma, volumen y acceso de los datos. AtlasHabita no debe crear miles de objetos Python para representar filas de indicadores si una operación vectorizada en Pandas o DuckDB resuelve el problema de forma más clara y rápida. Tampoco debe meter geometrías pesadas o millones de POIs directamente en RDF si la consulta principal solo necesita agregados.

Cada pipeline debe producir artefactos intermedios en formatos adecuados. Los datos tabulares limpios deben vivir en Parquet. Las geometrías deben vivir en GeoPackage, GeoParquet o un formato geoespacial equivalente. El RDF debe vivir en TriG cuando haya named graphs. Los reportes deben vivir en JSON y Markdown. Esta separación hace que cada herramienta trabaje en su terreno natural.

La memoria debe cuidarse. Los adaptadores de fuentes grandes deben procesar por chunks cuando sea posible. OpenStreetMap no debe cargarse entero si solo se necesitan algunas etiquetas. Catastro no debe convertirse completo a triples en el MVP. Los indicadores deben calcularse de forma agregada y persistirse. Si un cálculo tarda minutos, debe tener cache por hash de entrada. Si un cálculo depende de geometrías, debe guardar índice o resultado intermedio.

El principio operativo es simple: raw se conserva, normalized se valida, analytics se optimiza, RDF se semantiza y serving se prepara para UI. Mezclar esas capas genera caos. Separarlas permite escalar.

---

## 49. Sistema de caché por capas

La caché debe existir en varios niveles. La primera capa es caché de descubrimiento. Guarda respuestas de catálogos, listados y metadatos para no consultar portales externos innecesariamente. La segunda es caché de descarga. Guarda el artefacto crudo con checksum, tamaño, fecha y URL. La tercera es caché de normalización. Si el raw no cambia, no se recalcula el Parquet normalizado. La cuarta es caché de RDF. Si los contratos normalizados no cambian, no se reconstruye el grafo. La quinta es caché de API. Si un ranking se solicita muchas veces con los mismos parámetros, se puede reutilizar durante una ventana definida.

La caché debe ser explícita y verificable. No basta con “si existe archivo, saltar”. El sistema debe comparar hashes y versiones de código/configuración. Si cambia la función de normalización o los pesos de scoring, se debe invalidar el artefacto derivado aunque el raw sea el mismo. Para conseguirlo, cada artefacto debe registrar `input_hash`, `config_hash`, `code_version`, `created_at` y `schema_version`.

Los comandos deben permitir `--force`, `--dry-run` y `--only-missing`. `--force` reconstruye aunque haya caché. `--dry-run` muestra qué haría sin descargar ni escribir. `--only-missing` completa huecos. Estos flags son esenciales para desarrollo y para defensa académica porque permiten ejecutar partes sin rehacer todo.

---

## 50. Contrato universal de adaptador de fuente

Todo adaptador debe implementar un contrato común. El método `discover()` identifica recursos disponibles. El método `fetch()` descarga o localiza artefactos. El método `validate_raw()` comprueba estructura mínima. El método `normalize()` produce contratos internos. El método `quality_report()` devuelve cobertura, errores y warnings. El método `to_rdf_metadata()` genera metadatos DCAT/PROV-O de la fuente. Este contrato permite añadir fuentes sin cambiar el pipeline principal.

El adaptador no debe esconder limitaciones. Si una fuente requiere descarga manual, debe declararlo. Si necesita API key, debe leerla de variables de entorno y fallar con error claro cuando falte. Si un portal cambia HTML y no se puede descubrir el enlace, el adaptador debe producir un error de descubrimiento, no un archivo vacío. Si una fuente ofrece varios años, el adaptador debe aceptar parámetro de año o periodo.

Cada adaptador debe tener fixtures pequeños. Un fixture puede contener diez filas representativas o una geometría mínima. Los tests deben validar que el adaptador convierte ese fixture al contrato esperado. Esto permite evolucionar el pipeline sin descargar gigabytes en CI.

---

## 51. Playbook operativo de ingesta completa

La ingesta completa debe ejecutarse por fases. Primero se ejecuta descubrimiento para todas las fuentes. El resultado es un informe que dice qué recursos existen, cuáles se pueden descargar automáticamente, cuáles requieren credenciales y cuáles requieren intervención manual. Segundo se ejecuta descarga. El sistema guarda raw inmutable y checksums. Tercero se normaliza. Cuarto se agregan indicadores. Quinto se construye RDF. Sexto se valida. Séptimo se calculan scores. Octavo se genera un snapshot publicable.

Un comando de ejecución completa puede tener esta forma:

```bash
python -m atlashabita.sources discover --sources config/sources.yaml --out data/reports/discovery.json
python -m atlashabita.sources fetch --all --cache data/raw --report data/reports/fetch.json
python -m atlashabita.pipeline normalize --all --out data/normalized
python -m atlashabita.pipeline aggregate --levels municipio,seccion_censal --out data/analytics
python -m atlashabita.knowledge_graph build --input data/analytics --out data/rdf/atlashabita.trig
python -m atlashabita.knowledge_graph validate --graph data/rdf/atlashabita.trig --shapes shapes/atlashabita-shacl.ttl
python -m atlashabita.recommendations compute --profiles config/profiles.yaml --out data/analytics/scores.parquet
python -m atlashabita.reports build-quality --out data/reports/quality.md
```

La ejecución completa no debe depender de notebooks. Los notebooks pueden existir para exploración, pero la entrega reproducible debe ser CLI. El evaluador debe poder clonar, instalar, configurar variables, ejecutar pipeline con subset o full y obtener los mismos artefactos si las fuentes no han cambiado.

---

## 52. `sources.yaml` como contrato vivo

El `sources.yaml` no es documentación decorativa. Es el contrato operativo de ingesta. Cada entrada debe declarar identificador, proveedor, homepage, tipo de acceso, formatos esperados, frecuencia de actualización, licencia, criticidad, adaptador, política de caché, quality gates y notas. Si una fuente no está en el manifiesto, no existe para el pipeline.

Una entrada madura debe tener esta forma conceptual:

```yaml
- id: seteleco_broadband
  provider: "Secretaría de Estado de Telecomunicaciones e Infraestructuras Digitales"
  adapter: "atlashabita.ingestion.seteleco.BroadbandCoverageAdapter"
  access:
    mode: "arcgis_or_manual_export"
    homepage: "https://avance.digital.gob.es/..."
  freshness:
    expected_update: "annual"
    max_age_days: 540
  criticality:
    teletrabajo: "critical"
    vivir: "important"
  cache:
    raw: "immutable_by_checksum"
    normalized: "invalidate_on_raw_or_schema_change"
  quality_gates:
    require_territory_code: true
    require_period: true
    min_municipality_coverage_pct: 90
```

El manifiesto debe poder generar documentación. Un script debe convertir `sources.yaml` en una tabla Markdown de fuentes y en un panel de calidad. Esto evita divergencia entre código y memoria.

---

## 53. Modelo RDF implementable y no ornamental

El RDF debe tener uso real en la aplicación. No se acepta construir un archivo Turtle que nadie consulta. Al menos tres funciones deben depender del grafo: inspector de fuentes, recuperación de procedencia y exportación semántica. Además, debe existir un conjunto de consultas SPARQL usadas por la API o por la demo.

La ontología propia debe ser mínima. Debe definir `ZonaTerritorial`, `Municipio`, `SeccionCensal`, `Indicador`, `FuenteDato`, `Score`, `Perfil`, `ContribucionScore` y relaciones esenciales. Los metadatos de datasets deben modelarse con DCAT y DCTERMS. La procedencia debe modelarse con PROV-O. Las categorías deben modelarse con SKOS. Las geometrías pueden modelarse con GeoSPARQL cuando se exporten en RDF, pero para mapas de alto rendimiento se servirán como tiles o GeoJSON simplificado.

Cada indicador debe poder representarse como nodo. Aunque sea tentador guardar `ve:coberturaFibra 92.5` directamente en el municipio, el modelo robusto crea un recurso indicador con valor, unidad, periodo, fuente, método, calidad y dirección. Luego el municipio se relaciona con ese indicador. Este diseño ocupa más triples, pero permite trazabilidad y validación.

---

## 54. Named graphs y procedencia granular

Los named graphs son obligatorios porque permiten separar fuentes y resultados derivados. Cada adaptador debe escribir sus metadatos de fuente en un grafo de metadatos y sus entidades principales en un grafo de fuente o grafo normalizado. Los scores deben vivir en un grafo de aplicación. Los reportes de calidad pueden vivir en otro grafo. Esta separación evita que se mezclen datos oficiales, datos derivados y resultados del sistema sin control.

Un indicador derivado debe declarar su fuente mediante `prov:wasDerivedFrom`. Un score debe declarar qué indicadores usa. Una explicación debe declarar qué contribuciones la sostienen. Esto permite responder preguntas como: “¿qué fuentes se usaron para recomendar este municipio?”, “¿qué indicadores dependen de OpenStreetMap?”, “¿qué scores quedan afectados si actualizo alquiler?” o “¿qué zonas tienen baja confianza por falta de fuente crítica?”.

La política de procedencia debe estar automatizada. Ningún desarrollador debe añadir triples de fuente a mano de forma ad hoc. El builder RDF debe recibir metadatos del contrato normalizado y generar triples de procedencia de manera uniforme.

---

## 55. Repositorio de consultas SPARQL

Las consultas SPARQL deben vivir en `queries/` y tener nombres claros. Deben existir consultas para ranking, ficha territorial, fuentes de indicador, indicadores de municipio, comparación de zonas, datasets usados por score, validación exploratoria y exportación CONSTRUCT. Cada consulta debe tener un archivo `.rq` y un test con grafo pequeño.

Las consultas parametrizadas no deben construirse concatenando strings inseguros. Debe existir una capa que valide parámetros y sustituya valores de forma controlada. Los parámetros como perfil, territorio o fuente deben validarse contra enumeraciones o URIs conocidas. Aunque el sistema sea local, mantener higiene evita errores y facilita evolucionar a API pública.

La demo debe incluir consultas legibles. Una consulta demasiado compleja puede impresionar menos que una consulta clara que recorra municipio, score, indicador, fuente y dataset. El objetivo no es demostrar oscuridad, sino dominio.

---

## 56. SHACL como puerta de publicación

La validación SHACL debe ejecutarse antes de publicar un snapshot. Un build con violaciones críticas no puede alimentar la API. Los shapes críticos deben cubrir municipios, indicadores, fuentes, scores y contribuciones. Los shapes no críticos pueden cubrir etiquetas multilingües, enlaces externos, geometrías opcionales o enriquecimientos.

La severidad debe estar pensada. Un municipio sin código INE es violación crítica. Un indicador sin unidad es violación crítica. Un indicador sin enlace externo opcional puede ser warning. Un score sin contribuciones es violación crítica porque no se puede explicar. Una fuente sin licencia documentada puede bloquear si se publica, aunque en modo académico pueda aparecer como warning hasta completarla.

El reporte SHACL debe transformarse a Markdown y JSON. El Markdown sirve para humanos y defensa. El JSON sirve para CI y panel técnico. La app puede mostrar resumen: número de violaciones, warnings, shapes afectados y último build válido.

---

## 57. API orientada a casos de uso

La API debe hablar el lenguaje del producto. No debe exponer tablas internas como `/municipal_indicator_rows`. Debe exponer `/profiles`, `/recommendations/search`, `/territories/{id}`, `/territories/{id}/sources`, `/compare`, `/quality/latest` y `/exports`. Esta orientación permite cambiar almacenamiento sin romper frontend.

Las respuestas deben tener estructura consistente:

```json
{
  "data": {},
  "meta": {
    "data_version": "2026-04-22.1",
    "profile": "teletrabajo",
    "generated_at": "2026-04-22T10:30:00Z"
  },
  "warnings": []
}
```

Los warnings son parte de la respuesta, no excepciones. Si el ranking se calculó sin turismo, eso puede ser warning. Si falta una fuente crítica, puede ser error. Esta distinción permite que la app siga funcionando con datos parciales cuando sea honesto hacerlo.

---

## 58. Frontend: estado, componentes y mapa

El frontend debe separar estado de UI, estado de datos y estado de consulta. El perfil seleccionado, pesos, filtros y ámbito forman una `RecommendationQuery`. Esa query debe ser serializable en URL o JSON para reproducibilidad. El mapa, ranking y ficha deben derivar de la misma query. Si el usuario cambia un peso, todos los componentes deben sincronizarse.

Los componentes principales son `ProfileWizard`, `MapCanvas`, `LayerControl`, `RankingPanel`, `TerritoryCard`, `TerritoryDetail`, `ComparisonDrawer`, `SourceInspector`, `QualityBadge` y `ExportButton`. Cada componente debe tener estados de loading, empty, error y ready. Los componentes no deben conocer detalles de RDF. El inspector técnico sí puede mostrar RDF, pero lo recibe ya preparado desde API.

El mapa debe consumir capas simplificadas. No se debe enviar geometría pesada completa para cada interacción. Para MVP puede bastar GeoJSON simplificado por municipio. Para versión production-ready, tiles vectoriales o precomputed map layers serán preferibles. El ranking no debe esperar a que cargue una capa pesada si ya tiene datos de score.

---

## 59. Rendimiento y presupuestos técnicos

El sistema debe definir presupuestos de rendimiento. La carga inicial de la app con datos precalculados debe estar por debajo de dos o tres segundos en máquina razonable para MVP local. El ranking debe responder en menos de un segundo si usa scores precalculados. La ficha territorial debe cargar en menos de un segundo salvo que incluya consultas RDF avanzadas. Las exportaciones pueden tardar más, pero deben mostrar progreso.

El pipeline completo puede tardar mucho más, especialmente con OSM, Catastro o SIOSE. Por eso debe poder ejecutarse por fuente y por subset. Un modo `--sample` debe permitir probar con una comunidad autónoma o diez municipios. CI debe usar fixtures pequeños. La ingesta full se reserva para ejecuciones manuales o programadas.

La memoria máxima debe controlarse. Si un proceso supera límites razonables, debe dividirse en chunks. Los logs deben mostrar conteos de filas, tamaño de artefactos, tiempo por fase y cache hits. Sin métricas, no hay optimización seria.

---

## 60. Seguridad, privacidad y cumplimiento

El MVP no necesita cuentas de usuario ni datos personales. Las preferencias pueden guardarse localmente en el navegador si se desea. Si en el futuro se guardan escenarios en servidor, se deberá diseñar privacidad desde el inicio. El sistema no debe recolectar ubicación precisa del usuario salvo consentimiento explícito. Para una entrega universitaria, lo más limpio es no almacenar datos personales.

Las API keys, como AEMET, deben ir en variables de entorno. Nunca en repositorio. El `.env.example` debe mostrar nombres de variables sin valores reales. Los logs no deben imprimir claves. Si falta una clave, el adaptador debe marcar fuente omitida por credenciales y continuar si no es crítica.

Las licencias deben respetarse. OpenStreetMap requiere atribución. Fuentes oficiales pueden tener condiciones de reutilización o citación. El panel de fuentes debe incluir licencias o enlaces. La exportación debe conservar atribuciones necesarias. La aplicación no debe redistribuir datos de forma contraria a sus condiciones.

---

## 61. Testing exhaustivo

Los tests unitarios deben cubrir normalización de códigos, cálculo de scores, inversión de indicadores, tratamiento de nulos, generación de explicaciones y construcción de URIs. Los tests de contrato deben cubrir adaptadores de fuentes con fixtures. Los tests de integración deben construir un grafo pequeño completo, ejecutar SPARQL y validar SHACL. Los tests de API deben verificar respuestas, warnings y errores.

Los tests de UI deben cubrir flujos principales. Aunque no se implemente una suite E2E completa desde el principio, debe existir al menos una checklist manual reproducible: elegir perfil, obtener ranking, abrir ficha, comparar, abrir fuente y exportar. Cada release debe pasar esa checklist.

Los tests de regresión de scoring son importantes. Si se cambia un peso o una fórmula, debe saberse qué rankings cambian. Un fixture con diez municipios sintéticos puede comprobar que una zona con mejor conectividad sube en teletrabajo y que una zona con alquiler más bajo sube cuando el usuario prioriza coste.

---

## 62. Observabilidad y depuración

El sistema debe producir logs estructurados. Cada fase debe registrar `run_id`, fuente, fase, duración, filas leídas, filas escritas, warnings, errores y hashes. Los logs permiten responder preguntas como “qué falló”, “cuándo cambió esta fuente”, “por qué este indicador desapareció” o “qué versión de datos está usando la API”.

Los reportes deben existir para humanos. Después de cada pipeline debe generarse un `quality_report.md` con resumen de fuentes, cobertura, errores, warnings, shapes SHACL y cambios frente a versión anterior. Este reporte es útil para desarrollo y para la defensa del proyecto.

La API debe tener health checks. `/health` comprueba que el servicio vive. `/health/data` comprueba que hay snapshot cargado. `/quality/latest` devuelve estado del último build. Si la app no tiene datos, debe decirlo claramente.

---

## 63. Playbook granular por fuente crítica

La fuente de límites territoriales debe ejecutarse primero porque todo depende de ella. El adaptador debe descargar o localizar geometrías, simplificarlas para mapa, conservar geometría original para análisis y producir entidades de municipio, provincia y comunidad autónoma. Sin esta fuente no se publican mapas.

La fuente INE de secciones censales debe ejecutarse después si se activa granularidad fina. Debe respetar códigos, CRS y formatos de la OGC API Features. El pipeline debe poder limitar por año y por ámbito. La salida debe relacionar sección con municipio.

La fuente de renta debe normalizarse con mucho cuidado porque sus niveles territoriales pueden variar. El adaptador debe conservar periodo, nivel, indicador concreto y metodología. No se debe mezclar renta media, mediana o por unidad de consumo sin etiqueta clara.

La fuente de alquiler debe tratarse como crítica para perfiles de vivienda. Si no hay descarga automática estable, el sistema debe soportar `manual_fallback`: el usuario coloca un archivo oficial descargado en una ruta conocida, el adaptador valida estructura y calcula checksum. Esto es mejor que escribir scraping frágil.

La fuente de conectividad debe ser crítica para teletrabajo. Debe conservar tecnología, velocidad, año y territorio. Si hay varias tecnologías, el scoring debe declarar cuál usa. No es lo mismo cobertura de fibra que cobertura móvil.

OpenStreetMap debe procesarse de forma selectiva. El adaptador debe definir categorías en configuración: supermercados, farmacias, gimnasios, parques, bibliotecas, cafeterías, restaurantes, estaciones, colegios y hospitales cuando se usen como POI complementario. Cada etiqueta OSM usada debe documentarse. Los conteos deben normalizarse por población, superficie o contexto según el indicador.

Transporte debe empezar por estaciones y paradas principales. GTFS completo puede ser complejo. El MVP puede calcular presencia de estación, número de paradas y conectividad básica. Después se puede evolucionar a frecuencia, rutas y tiempos.

Calidad del aire y clima deben agregarse con prudencia. Las estaciones no cubren todos los municipios. Si se asigna por estación cercana o interpolación, el método debe documentarse y la confianza debe reflejarlo.

---

## 64. Definition of Done técnico final

Una feature técnica queda terminada cuando tiene código, tests, documentación, logs, errores controlados y datos de ejemplo. No basta con que funcione una vez. Debe funcionar de forma repetible. Debe fallar de forma comprensible. Debe poder mantenerse por otra persona.

Un adaptador queda terminado cuando descubre o localiza recursos, descarga o valida archivo manual, guarda raw con checksum, normaliza a contrato, produce reporte de calidad, genera metadatos de fuente, tiene fixture, tiene test y está documentado. Si una de estas piezas falta, la fuente está en estado parcial.

Un indicador queda terminado cuando tiene definición, fórmula, unidad, dirección, fuente, periodo, normalización, política de nulos, calidad y test. Si un indicador no declara si un valor alto es bueno o malo, no puede entrar en scoring.

Un score queda terminado cuando es reproducible, configurable, explicable y trazable. Debe guardar contribuciones y fuentes. Si solo produce un número, no está terminado.

Una pantalla queda terminada cuando tiene diseño, estados, accesibilidad básica, responsive, errores y fuentes. Si solo funciona con datos perfectos, no está terminada.

---

## 65. Criterio final de excelencia técnica

La excelencia técnica de AtlasHabita se mide por la continuidad entre capas. El mismo dato debe poder seguirse desde archivo raw hasta UI. Por ejemplo: cobertura de fibra de un municipio. Debe existir el raw descargado, el hash, la fila normalizada, el indicador Parquet, el nodo RDF, el named graph, el shape SHACL, la contribución al score, la explicación en la ficha y la fuente visible en la interfaz. Si esa cadena existe, el sistema está bien diseñado.

La segunda medida de excelencia es la capacidad de cambio. Añadir una nueva fuente no debe requerir tocar scoring, API y frontend de forma caótica. Añadir un nuevo perfil no debe duplicar lógica. Cambiar una fórmula debe invalidar caches correctas. Sustituir Streamlit por React o RDFLib local por Jena Fuseki no debe destruir el dominio. Esta capacidad de evolución es lo que diferencia una práctica universitaria fuerte de un prototipo improvisado.

La tercera medida de excelencia es la honestidad. El sistema debe decir lo que sabe, lo que no sabe y de dónde lo sabe. Esta honestidad debe estar implementada en código, UI y documentación. Una aplicación territorial con datos públicos nunca será perfecta, pero puede ser rigurosa, útil y transparente.
