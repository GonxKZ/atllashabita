# 05 — Requisitos funcionales

**Proyecto:** AtlasHabita  
**Versión:** 1.0  
**Objetivo:** definir qué debe hacer el sistema de forma observable, verificable y trazable.

## 1. Criterios de redacción

Cada requisito funcional se ha escrito con identificador estable, descripción, prioridad y criterio de aceptación. Un requisito se considera válido si puede verificarse con una prueba manual, una prueba automatizada o una revisión de artefacto.

## 2. Tabla de requisitos funcionales

| ID | Nombre | Descripción | Prioridad | Criterio de aceptación |
|---|---|---|---|---|
| RF-001 | Gestión de perfil de decisión | El sistema debe permitir elegir un perfil inicial: estudiante, familia, teletrabajador, emprendedor o explorador general. | Alta | Dado un usuario en la pantalla inicial, cuando selecciona un perfil, el sistema carga pesos y variables por defecto. |
| RF-002 | Configuración de prioridades | El sistema debe permitir ajustar pesos de variables mediante controles sencillos. | Alta | Al modificar un peso, el ranking y la explicación se recalculan de forma coherente. |
| RF-003 | Selección de ámbito territorial | El usuario debe poder limitar la búsqueda a España completa, comunidad autónoma, provincia o conjunto de municipios. | Alta | El ranking no muestra territorios fuera del ámbito seleccionado. |
| RF-004 | Mapa interactivo | El sistema debe mostrar un mapa con geometrías territoriales coloreadas por score o indicador. | Alta | El mapa permite zoom, desplazamiento, selección y cambio de capa sin bloquear la interfaz. |
| RF-005 | Ranking de territorios | El sistema debe mostrar una lista ordenada de territorios según el perfil y los pesos activos. | Alta | El ranking muestra posición, nombre, score, provincia, comunidad y factores destacados. |
| RF-006 | Ficha territorial | El sistema debe mostrar una ficha detallada de cada territorio. | Alta | La ficha incluye indicadores, explicación, fuentes, fecha de actualización y advertencias de calidad. |
| RF-007 | Comparación de territorios | El usuario debe poder comparar entre dos y cuatro territorios. | Media | La comparación muestra diferencias de score, indicadores y fortalezas/debilidades. |
| RF-008 | Modo estudiante | El sistema debe valorar alquiler, transporte, servicios, conectividad y entorno universitario. | Alta | Al elegir estudiante, el ranking prioriza coste, movilidad y servicios cotidianos. |
| RF-009 | Modo familia | El sistema debe valorar colegios, sanidad, seguridad, renta, servicios y coste de vida. | Alta | Al elegir familia, la explicación destaca servicios educativos y sanitarios. |
| RF-010 | Modo teletrabajo | El sistema debe valorar conectividad, vivienda, entorno, servicios y movilidad ocasional. | Alta | Al elegir teletrabajo, las zonas sin conectividad suficiente quedan penalizadas. |
| RF-011 | Modo emprendimiento | El sistema debe valorar demanda potencial, competencia, renta, turismo, movilidad y coste. | Alta | Al elegir un tipo de negocio, el sistema adapta variables y explicación. |
| RF-012 | Explicación de score | El sistema debe descomponer cada score en factores y contribuciones. | Alta | Cada recomendación muestra al menos tres motivos positivos y tres riesgos o penalizaciones si existen. |
| RF-013 | Inspector de fuentes | Cada indicador visible debe enlazar con su fuente, periodo, licencia y fecha de ingesta. | Alta | El usuario puede abrir un panel de fuente desde cualquier indicador. |
| RF-014 | Tratamiento de datos faltantes | El sistema debe mostrar si un indicador falta, se imputa o se excluye. | Alta | Los datos faltantes no se ocultan; aparecen como advertencia o penalización configurable. |
| RF-015 | Carga de fuentes | El sistema debe disponer de conectores de ingesta para fuentes oficiales y abiertas. | Alta | Cada conector produce un artefacto raw y un reporte de ingesta. |
| RF-016 | Normalización territorial | El sistema debe normalizar códigos INE, nombres y jerarquías administrativas. | Alta | Cada municipio tiene código, nombre, provincia y comunidad autónoma. |
| RF-017 | Normalización geoespacial | El sistema debe transformar geometrías a un CRS común y simplificarlas para mapa. | Alta | Las geometrías se pueden renderizar y validar sin errores topológicos graves. |
| RF-018 | Construcción RDF | El sistema debe construir un Knowledge Graph RDF con territorios, indicadores, fuentes y scores. | Alta | El grafo contiene URIs estables y se serializa como Turtle/TriG/JSON-LD. |
| RF-019 | Named graphs de procedencia | El sistema debe separar información por fuente o dominio mediante grafos nombrados. | Media | Cada dataset importante puede identificarse por named graph. |
| RF-020 | Consultas SPARQL predefinidas | El sistema debe incluir consultas SPARQL de demostración. | Alta | Las consultas devuelven municipios, indicadores, fuentes y scores verificables. |
| RF-021 | Validación SHACL | El sistema debe validar el grafo RDF mediante shapes. | Alta | Un grafo inválido produce reporte y bloquea la promoción a zona publicada. |
| RF-022 | Quality gates tabulares | El sistema debe validar columnas, tipos, rangos, nulos y duplicados. | Alta | Cada dataset normalizado tiene informe de calidad. |
| RF-023 | Exportación de informe | El usuario debe poder exportar una comparación o ficha en formato legible. | Media | El informe contiene ranking, factores, fuentes y fecha. |
| RF-024 | Búsqueda de municipio | El usuario debe poder buscar un municipio por nombre. | Alta | La búsqueda tolera mayúsculas, tildes y coincidencias parciales. |
| RF-025 | Filtros duros | El usuario debe poder exigir condiciones mínimas como precio máximo o conectividad mínima. | Alta | Los territorios que incumplen filtros duros quedan fuera del ranking. |
| RF-026 | Capas de indicadores | El usuario debe poder activar capas de alquiler, renta, servicios, movilidad, conectividad y ambiente. | Media | Cada capa cambia leyenda, colores y tooltip. |
| RF-027 | Leyenda interpretable | El mapa debe mostrar leyendas comprensibles para scores e indicadores. | Media | La leyenda indica rango, unidad y significado de colores. |
| RF-028 | Historial de ejecución | El sistema debe registrar versión de scoring y versión de datasets usados. | Media | Cada resultado puede asociarse a una ejecución reproducible. |
| RF-029 | Panel técnico | Debe existir un modo técnico para inspeccionar RDF, consultas y calidad. | Media | El panel muestra triples de ejemplo, shapes y reportes de ingesta. |
| RF-030 | API de rankings | El backend debe exponer rankings parametrizados. | Alta | La API devuelve resultados ordenados con explicación y metadatos. |
| RF-031 | API de territorios | El backend debe exponer ficha territorial por identificador. | Alta | La API devuelve indicadores, geometría resumida, jerarquía y fuentes. |
| RF-032 | API de fuentes | El backend debe exponer estado y metadatos de fuentes. | Media | La API devuelve fecha de ingesta, cobertura, licencia y calidad. |
| RF-033 | Cache de resultados | El sistema debe cachear rankings frecuentes. | Media | Consultas repetidas responden sin recalcular todo el pipeline. |
| RF-034 | Internacionalización mínima | El sistema debe mantener etiquetas y textos principales en español. | Baja | Los textos de UI y metadatos principales son legibles en español. |
| RF-035 | Modo demo académico | El sistema debe incluir escenarios de demo reproducibles. | Alta | La demo puede ejecutarse con datos de ejemplo aunque falte alguna fuente externa. |

## 3. Requisitos funcionales críticos del MVP

Para una primera entrega evaluable, el conjunto mínimo debe incluir `RF-001`, `RF-002`, `RF-003`, `RF-004`, `RF-005`, `RF-006`, `RF-012`, `RF-013`, `RF-015`, `RF-016`, `RF-018`, `RF-020`, `RF-021`, `RF-022`, `RF-030`, `RF-031` y `RF-035`.

## 4. Criterio de cierre funcional

El producto alcanza cierre funcional cuando un usuario puede entrar, seleccionar un perfil, ajustar prioridades, ver un mapa, consultar un ranking, abrir una ficha territorial, entender el motivo de una recomendación y verificar la fuente de los indicadores utilizados.
