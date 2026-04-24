# 21 — Trazabilidad requisitos, módulos y pruebas

**Proyecto:** AtlasHabita

## 1. Objetivo

La trazabilidad permite demostrar que cada requisito importante se implementa en un módulo y se valida mediante pruebas. Es especialmente útil en una defensa académica porque conecta análisis, diseño, implementación y verificación.

## 2. Matriz de trazabilidad principal

| Requisito | Caso de uso | Módulos responsables | Pruebas |
|---|---|---|---|
| RF-001 | UC-001 | frontend/profile, scoring/profiles | E2E-001 |
| RF-004 | UC-001 | map/layers, frontend/map | E2E-001 |
| RF-005 | UC-001 | scoring/ranking, api/rankings | API-001, E2E-001 |
| RF-006 | UC-001 | territories/service, api/territories | API-002, E2E-002 |
| RF-007 | UC-002 | frontend/comparator, api/territories | E2E-003 |
| RF-012 | UC-001 | scoring/explainability | TU-005, E2E-002 |
| RF-013 | UC-003 | sources/service, provenance | E2E-004 |
| RF-015 | UC-004 | ingestion/* | TD-001..TD-006 |
| RF-016 | UC-004 | territories/codes | TU-001, TD-001 |
| RF-018 | UC-003 | knowledge_graph/builder | TRDF-001, TRDF-005 |
| RF-020 | UC-003 | knowledge_graph/sparql | TRDF-002..TRDF-004 |
| RF-021 | UC-004 | validation/shacl | TRDF-001 |
| RF-022 | UC-004 | validation/data_quality | TD-001..TD-006 |
| RF-030 | UC-001 | api/rankings | API-001 |
| RF-031 | UC-001 | api/territories | API-002 |
| RF-035 | UC-001 | demo/scenarios | E2E-001..E2E-005 |

## 3. Trazabilidad por capas

| Capa | Requisitos cubiertos | Evidencias |
|---|---|---|
| Ingesta | RF-015, RF-022 | Reportes raw/normalized y quality gates. |
| Territorios | RF-016, RF-017 | Tablas normalizadas y geometrías válidas. |
| RDF | RF-018, RF-019, RF-020, RF-021 | Ficheros RDF, shapes y consultas SPARQL. |
| Scoring | RF-002, RF-010, RF-011, RF-012 | Fórmulas, contribuciones y tests. |
| API | RF-030, RF-031, RF-032 | Contratos JSON y pruebas de endpoint. |
| Frontend | RF-001, RF-004, RF-005, RF-006, RF-007 | Capturas, demo y pruebas E2E. |

## 4. Evidencias recomendadas para la memoria

- Captura del mapa.
- Captura del ranking.
- Captura de ficha con fuentes.
- Consulta SPARQL ejecutada.
- Reporte SHACL.
- Reporte de calidad de una fuente.
- Tabla de requisitos y pruebas.
- Diagrama de arquitectura.

## 5. Criterio de cierre documental

Un requisito de prioridad alta no debe quedar sin módulo responsable ni prueba asociada. Si no se implementa en el MVP, debe aparecer como alcance futuro y no como funcionalidad entregada.
