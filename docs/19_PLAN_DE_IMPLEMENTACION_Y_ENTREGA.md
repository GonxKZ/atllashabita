# 19 — Plan de implementación y entrega

**Proyecto:** AtlasHabita

## 1. Enfoque

La implementación debe hacerse por incrementos funcionales. Cada incremento debe producir algo demostrable: primero datos mínimos, después grafo, después scoring, después API, después mapa y finalmente trazabilidad avanzada.

## 2. Fases

| Fase | Nombre | Resultado |
|---:|---|---|
| 0 | Preparación | Estructura del proyecto, configuración y dataset demo. |
| 1 | Territorios base | Municipios, provincias, CCAA y geometrías simplificadas. |
| 2 | Indicadores mínimos | Vivienda, renta, población y conectividad demo/real. |
| 3 | Grafo RDF | URIs, clases, indicadores y fuentes serializadas. |
| 4 | Validación | Quality gates y SHACL. |
| 5 | Scoring | Perfiles, pesos, ranking y explicación. |
| 6 | API | Endpoints de ranking, ficha, fuentes y mapa. |
| 7 | Frontend | Mapa, ranking, ficha y comparador. |
| 8 | Modo técnico | SPARQL, RDF export y reportes. |
| 9 | Memoria y defensa | Documentación final, capturas, demo y presentación. |

## 3. Entregables por fase

### Fase 0 — Preparación

- Configuración del entorno.
- Estructura de carpetas.
- Dataset demo.
- Comandos de ejecución.

### Fase 1 — Territorios base

- Tabla de municipios.
- Tabla de provincias y comunidades.
- Geometrías simplificadas.
- Validación de jerarquía.

### Fase 2 — Indicadores mínimos

- Contratos de indicadores.
- Al menos 5 indicadores funcionales.
- Reporte de cobertura.

### Fase 3 — Grafo RDF

- Ontología mínima.
- Grafo serializado.
- Consultas SPARQL.

### Fase 4 — Validación

- Validaciones tabulares.
- Shapes SHACL.
- Reportes de calidad.

### Fase 5 — Scoring

- Perfiles.
- Fórmula de scoring.
- Contribuciones.
- Ranking reproducible.

### Fase 6 — API

- `/profiles`.
- `/rankings`.
- `/territories/{id}`.
- `/sources`.
- `/map/layers`.

### Fase 7 — Frontend

- Pantalla inicial.
- Mapa.
- Ranking.
- Ficha.
- Comparador.

### Fase 8 — Modo técnico

- Inspector de fuentes.
- Export RDF.
- Consultas SPARQL demo.
- Reporte de calidad.

### Fase 9 — Memoria

- Memoria final.
- Guion de defensa.
- Capturas.
- Escenarios demo.

## 4. Priorización MVP

El MVP no debe intentar cubrir todas las fuentes desde el principio. Debe demostrar arquitectura completa con pocas fuentes bien integradas. Es mejor tener 5 indicadores trazables que 30 indicadores sin calidad.

## 5. Riesgos de planificación

| Riesgo | Mitigación |
|---|---|
| Fuentes difíciles de automatizar | Dataset demo y fallback manual documentado. |
| Geometrías pesadas | Simplificación temprana. |
| Exceso de alcance | MVP con indicadores críticos. |
| RDF complejo | Ontología mínima y evolutiva. |
| Frontend consume demasiado tiempo | Usar componentes simples y mapa funcional. |

## 6. Criterio de entrega final

La entrega final debe poder demostrarse de principio a fin: seleccionar perfil, ver ranking, abrir ficha, explicar score, consultar fuente y mostrar una consulta SPARQL sobre el grafo.
