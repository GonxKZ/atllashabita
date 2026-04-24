# Guía de contribución · AtlasHabita

Esta guía resume el flujo de trabajo para mantener el repositorio saludable y trazable. El objetivo es que cada cambio sea auditable, pequeño y revisable.

## Ramas

- `main` contiene siempre una versión estable y etiquetada.
- `develop` es la rama de integración. Nadie trabaja directamente sobre ella.
- Cada tarea parte de una rama hija con prefijo semántico:
  - `feat/issue-<n>-<slug>` para funcionalidades.
  - `fix/issue-<n>-<slug>` para correcciones.
  - `refactor/issue-<n>-<slug>` para reestructuraciones.
  - `test/issue-<n>-<slug>`, `docs/issue-<n>-<slug>`, `ci/issue-<n>-<slug>`, `chore/issue-<n>-<slug>` para el resto.

## Commits

Se usan [Conventional Commits](https://www.conventionalcommits.org/). El tipo refleja la intención y el alcance identifica el módulo:

```
feat(rdf): generar grafo semántico desde datasets limpios
fix(api): evitar respuesta 500 si falta indicador
refactor(scoring): extraer normalización a función pura
test(api): cubrir /rankings con dataset demo
docs(arquitectura): añadir ADR sobre named graphs
chore(ci): cachear dependencias pip en Actions
```

Los commits deben ser atómicos, describir el **porqué** en el cuerpo cuando no sea obvio y nunca incluir coautores automáticos ni firmas de asistentes.

## Pull requests

Cada PR se dirige a `develop` salvo la release final hacia `main`. La descripción debe incluir:

1. Resumen breve.
2. Referencia a las issues que cierra (`Closes #N`).
3. Cambios realizados y decisiones técnicas.
4. Comandos de verificación ejecutados con su resultado.
5. Capturas en caso de cambios visibles.
6. Riesgos, mitigación y procedimiento de rollback.
7. Checklist de la plantilla marcada íntegramente.

Una PR no se fusiona sin que pase lint, typecheck y tests de las áreas afectadas.

## Calidad técnica

- Aplicar SOLID y Clean Architecture con criterio.
- Funciones pequeñas, nombres explícitos y capas desacopladas.
- Validar entradas en los bordes del sistema.
- Tests junto al código crítico.
- Sin TODOs sin resolver en `develop`.

## Seguridad

- Nunca subir `.env`, tokens, credenciales ni datasets con datos personales.
- Revisar dependencias nuevas y su licencia.
- Respetar los límites de SPARQL y las políticas de fuentes documentadas.

## Flujo resumido

```
main ←───────── release PR ────────── develop
                                       │
                                       ├─ feat/issue-18-...
                                       ├─ feat/issue-23-...
                                       ├─ test/issue-31-...
                                       └─ docs/issue-34-...
```
