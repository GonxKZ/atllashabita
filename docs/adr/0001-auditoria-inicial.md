# ADR 0001 · Auditoría inicial y alcance del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-04-24
- **Contexto relacionado:** documentación `docs/00_INDICE_GENERAL.md` a `docs/23_GLOSARIO.md`

## Contexto

AtlasHabita (antes ViveEspaña RDF) es una aplicación web académica para la asignatura Complementos de Bases de Datos que integra datos territoriales de España, un grafo RDF, un motor de scoring explicable y una interfaz cartográfica. La documentación de partida define 35 requisitos funcionales (RF-001 a RF-035) y una lista cerrada de requisitos críticos para un primer entregable.

## Decisión

Se aborda un MVP que cubre **los 17 requisitos marcados como críticos** por `05_REQUISITOS_FUNCIONALES.md` § 3:

| RF | Área |
|---|---|
| RF-001, RF-002, RF-003 | Perfil, prioridades, ámbito |
| RF-004, RF-005, RF-006 | Mapa, ranking y ficha |
| RF-012, RF-013 | Explicación y fuentes |
| RF-015, RF-016 | Ingesta y normalización territorial |
| RF-018, RF-020, RF-021, RF-022 | RDF, SPARQL, SHACL y quality gates |
| RF-030, RF-031 | API de rankings y territorios |
| RF-035 | Modo demo reproducible |

El resto de requisitos quedan como **roadmap** y se reflejan como issues en el milestone correspondiente sin bloquear la release.

## Alcance

- Aplicación web única en dos capas (backend Python + frontend React).
- Pipeline de datos reproducible offline con dataset demo.
- Grafo RDF serializable (Turtle y JSON-LD) con named graphs por dominio.
- Scoring explicable por suma ponderada normalizada.
- Interfaz que reproduce el lenguaje visual de la captura de referencia.

## Fuera de alcance del MVP

- Ingesta masiva en tiempo real.
- Cuentas de usuario, autenticación y multi-tenant.
- Modelos de machine learning opacos.
- Data warehouse empresarial.

## Consecuencias

- Se reducen dependencias externas y riesgo operativo.
- El pipeline y el grafo deben ser reproducibles con un comando.
- La UX queda alineada con un único flujo principal (`Inicio → Perfil → Mapa/Ranking → Ficha`).

## Seguimiento

- Los requisitos no cubiertos quedan registrados en issues con label `estado:ready` y milestone posterior a M7.
- Al cierre de cada fase se actualiza este ADR con aprendizajes relevantes.
