# 22 — Memoria académica y defensa

**Proyecto:** AtlasHabita

## 1. Título recomendado

**AtlasHabita: plataforma SIG-semántica para recomendación territorial explicable mediante Knowledge Graph RDF**

## 2. Estructura de memoria recomendada

1. Introducción.
2. Motivación y problema.
3. Objetivos.
4. Relación con Complementos de Bases de Datos.
5. Análisis de requisitos.
6. Modelo conceptual.
7. Arquitectura del sistema.
8. Fuentes de datos e ingesta ETL/ELT.
9. Modelo RDF y ontología.
10. Consultas SPARQL y validación SHACL.
11. Motor de recomendación.
12. Diseño SIG e interfaz de mapa.
13. Implementación.
14. Pruebas y validación.
15. Resultados.
16. Conclusiones y trabajo futuro.

## 3. Mensaje central para defensa

El proyecto no es solo una web de mapas. Es una plataforma de integración de datos territoriales que combina SIG, ETL, RDF, SPARQL, validación semántica y recomendación explicable para ayudar a tomar decisiones de localización.

## 4. Demo recomendada

1. Mostrar pantalla inicial y perfil de teletrabajo.
2. Ajustar pesos de conectividad y alquiler.
3. Ver ranking y mapa.
4. Abrir ficha de un municipio.
5. Explicar contribuciones del score.
6. Abrir fuente de un indicador.
7. Mostrar consulta SPARQL sobre el grafo.
8. Mostrar reporte de calidad/SHACL.
9. Comparar dos territorios.
10. Cerrar con arquitectura.

## 5. Diapositivas sugeridas

| Nº | Título | Contenido |
|---:|---|---|
| 1 | Problema | Decidir dónde vivir/emprender exige integrar datos dispersos. |
| 2 | Idea | Recomendador territorial con mapa y explicación. |
| 3 | Usuarios | Estudiante, familia, teletrabajador, emprendedor. |
| 4 | Arquitectura | Ingesta, normalización, RDF, scoring, API, frontend. |
| 5 | Datos | Fuentes, indicadores y territorio. |
| 6 | Ontología | Clases, relaciones y URIs. |
| 7 | SPARQL | Consultas de ejemplo. |
| 8 | Scoring | Fórmula y explicabilidad. |
| 9 | Interfaz | Mapa, ranking, ficha. |
| 10 | Validación | Quality gates y SHACL. |
| 11 | Demo | Flujo completo. |
| 12 | Conclusión | Valor técnico y evolución futura. |

## 6. Preguntas probables del tribunal

### ¿Por qué RDF y no solo una base relacional?

Porque el dominio tiene relaciones semánticas entre territorios, indicadores, fuentes, periodos y equivalencias externas. RDF aporta URIs, interoperabilidad, SPARQL y procedencia explícita.

### ¿Por qué no meter todos los datos en RDF?

Porque algunos datos son masivos o geométricamente pesados. El diseño separa almacenamiento analítico eficiente y grafo semántico para relaciones, procedencia e indicadores agregados.

### ¿Cómo se valida la calidad?

Con validaciones tabulares, geoespaciales y SHACL. No se publican indicadores sin fuente ni grafo con violaciones críticas.

### ¿El score es subjetivo?

Los pesos reflejan preferencias del perfil, pero la fórmula es transparente y modificable. La aplicación no impone una verdad, muestra encaje relativo.

### ¿Qué aporta frente a un mapa normal?

Aporta integración de datos, ranking, explicación, trazabilidad y consultas semánticas.

## 7. Conclusión preparada

AtlasHabita demuestra cómo los datos abiertos pueden convertirse en conocimiento útil mediante ingeniería de datos, SIG y Web Semántica. La aportación principal es integrar fuentes heterogéneas en un modelo trazable y explotarlas con una experiencia orientada a decisiones reales.
