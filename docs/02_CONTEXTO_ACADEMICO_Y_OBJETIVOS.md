# 02 — Contexto académico y objetivos del proyecto

**Proyecto:** AtlasHabita  
**Área:** Complementos de Bases de Datos, ingeniería de datos, SIG, Web Semántica y recomendación explicable.

## 1. Encaje académico

AtlasHabita está diseñado para cubrir de forma integrada varios bloques clásicos de una asignatura avanzada de bases de datos: datos geográficos, bases de datos NoSQL y grafos, Web Semántica, RDF, SPARQL, minería de datos, data warehouse, ETL/ELT, calidad de datos y arquitectura de aplicaciones orientadas a datos.

La idea central es construir una aplicación que no sea únicamente visual, sino que demuestre dominio de modelos de datos diferentes. El usuario ve un mapa y recomendaciones, pero debajo existe una arquitectura donde conviven datos tabulares, datos espaciales, grafos RDF, consultas SPARQL, procesos de transformación y validación.

## 2. Relación con Sistemas de Información Geográfica

El proyecto utiliza un mapa como interfaz principal y trata datos con componente espacial y temática. La componente espacial responde al “dónde”: municipio, provincia, comunidad autónoma, sección censal, punto de interés, geometría y coordenadas. La componente temática responde al “qué”: renta, alquiler, población, servicios, transporte, calidad ambiental, turismo o competencia comercial.

El diseño debe permitir capas vectoriales y, cuando convenga, capas ráster o agregaciones derivadas. Los municipios y secciones censales son geometrías vectoriales. Las capas de intensidad, calor, cobertura o accesibilidad pueden representarse como agregados o teselas. El sistema debe soportar consultas espaciales como “dentro de”, “interseca”, “cerca de”, “contiene”, “distancia a” y “agregación por polígono”.

## 3. Relación con Web Semántica y RDF

El proyecto utiliza RDF para representar relaciones semánticas entre entidades. Un municipio no es solo una fila: es un recurso con URI. Ese recurso pertenece a una provincia, tiene geometría, indicadores, fuentes, periodos, puntuaciones y equivalencias externas. RDF permite representar esta red de relaciones mediante tripletas y consultarla con SPARQL.

El grafo de conocimiento no debe ser un adorno. Debe servir para responder preguntas reales: qué municipios pertenecen a una provincia, qué indicadores existen para un territorio, qué fuentes respaldan un score, qué territorios tienen equivalencias externas, qué datasets alimentan una métrica y qué relaciones administrativas existen.

## 4. Relación con NoSQL y grafos

Aunque RDF no es Neo4j, el proyecto aprovecha la idea fundamental de las bases de datos orientadas a grafos: representar relaciones como ciudadanos de primera clase. Las relaciones entre territorios, fuentes, indicadores y perfiles pueden consultarse de forma más natural como grafo que como un conjunto excesivo de tablas con joins.

El proyecto puede explicar la diferencia entre usar un grafo RDF para interoperabilidad semántica y usar un grafo de propiedades para recorridos operacionales. RDF se prioriza porque encaja con Web Semántica, URIs, vocabularios y SPARQL.

## 5. Relación con Data Warehouse y ETL/ELT

El sistema necesita transformar fuentes heterogéneas en datasets normalizados y comparables. Esa transformación recuerda al proceso de construcción de un almacén de datos: extracción, transformación, validación y carga. Las entidades territoriales funcionan como dimensiones; los indicadores funcionan como hechos medibles; el tiempo funciona como dimensión temporal; la fuente funciona como dimensión de procedencia.

No se exige construir un data warehouse empresarial completo para el MVP, pero sí una arquitectura con zona raw, zona normalizada, zona analítica y zona RDF. Esta separación permite explicar el flujo de datos, reproducir ingestas y auditar resultados.

## 6. Relación con minería de datos y recomendación

El motor de recomendación combina indicadores normalizados y pesos configurables por perfil. No necesita usar un modelo opaco para ser valioso. Para la primera versión, un scoring explicable basado en reglas, normalización y ponderación ofrece más valor académico que una caja negra difícil de justificar.

La parte de minería de datos aparece en la selección de variables, normalización, detección de valores atípicos, tratamiento de nulos, agrupación de perfiles, ranking, evaluación de calidad y explicación de resultados.

## 7. Objetivo general

Diseñar e implementar una plataforma web que integre datos territoriales de España, los modele mediante un Knowledge Graph RDF y permita recomendar zonas mediante un mapa interactivo y un motor de scoring explicable.

## 8. Objetivos específicos

1. Definir un modelo conceptual del dominio territorial.
2. Diseñar una ontología RDF mínima, coherente y consultable.
3. Implementar una política de URIs estable para territorios, indicadores y fuentes.
4. Ingerir datos heterogéneos con un pipeline reproducible.
5. Validar datos tabulares, geográficos y RDF.
6. Calcular indicadores agregados por territorio.
7. Definir perfiles de recomendación configurables.
8. Mostrar resultados en mapa, ranking y ficha territorial.
9. Explicar cada score mediante contribuciones y fuentes.
10. Documentar la trazabilidad entre requisitos, módulos y pruebas.

## 9. Entregables académicos recomendados

| Entregable | Contenido |
|---|---|
| Memoria técnica | Problema, estado del arte, requisitos, arquitectura, datos, RDF, implementación y resultados. |
| Demostración funcional | Mapa, ranking, perfiles, ficha, comparación y explicación. |
| Grafo RDF exportable | Fichero Turtle/TriG/JSON-LD con entidades y relaciones. |
| Consultas SPARQL | Consultas de ejemplo para demostrar explotación semántica. |
| Validación | Pruebas, SHACL, quality gates y métricas de datos. |
| Documentación modular | Este paquete de documentos. |

## 10. Criterio de éxito académico

El proyecto debe demostrar que se ha usado una arquitectura de bases de datos avanzada para resolver un problema real. La nota fuerte no debe estar solo en la interfaz, sino en la integración de modelos: geoespacial, semántico, analítico y explicable.
