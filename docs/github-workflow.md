# Flujo GitHub del proyecto

Este documento recoge las reglas operativas del repositorio `atllashabita`. Todo el equipo las respeta sin excepciones.

## Ramas

| Rama | Propósito |
|---|---|
| `main` | Historial estable, protegida y etiquetada. Solo recibe PR de release. |
| `develop` | Integración continua. Acepta PR de ramas feature, fix, refactor, etc. |
| `feat/issue-<n>-<slug>` | Rama de trabajo para una issue de funcionalidad. |
| `fix/issue-<n>-<slug>` | Corrección. |
| `refactor/issue-<n>-<slug>` | Reestructura sin cambio de comportamiento. |
| `docs/issue-<n>-<slug>` | Documentación. |
| `test/issue-<n>-<slug>` | Pruebas. |
| `ci/issue-<n>-<slug>` | Pipeline o tooling. |
| `chore/issue-<n>-<slug>` | Mantenimiento. |

Las ramas **no se borran** al mergear. Actúan como registro histórico del trabajo.

## Regla de oro para PRs

1. Partir siempre de `develop` (excepto la release final que integra `develop` sobre `main`).
2. Cada PR cierra al menos una issue con `Closes #N`.
3. Toda PR pasa por **CI obligatoria**: calidad, seguridad, lint, typecheck, tests y build.
4. La PR no se fusiona si CI está roja.
5. Tras mergear, la rama permanece intacta (`delete branch = OFF`).

## Pipeline de CI

Los workflows de `.github/workflows/` ejecutan en cada push y PR:

| Workflow | Qué comprueba |
|---|---|
| `ci-quality.yml` | Conventional Commits, tamaño de diff y linters genéricos. |
| `ci-backend.yml` | ruff, mypy y pytest con cobertura del backend Python. |
| `ci-frontend.yml` | ESLint, tsc y Vitest del frontend React. |
| `ci-build.yml` | Build de producción frontend y paquete backend. |
| `ci-security.yml` | `bandit`, `pip-audit`, `npm audit` y secret-scan. |
| `ci-rdf.yml` | Validación SHACL del grafo RDF generado. |
| `ci-e2e.yml` | Playwright smoke del flujo principal. |

## Commits

- Conventional Commits (`feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build`).
- Atómicos: un commit = una idea.
- Sin coautores automáticos, sin firmas de asistentes, sin mención a modelos de IA.

## Ciclo completo de una issue

```
1. Crear issue con labels, milestone y tamaño.
2. Crear rama desde develop: git switch -c feat/issue-18-api-rest.
3. Implementar y commitear.
4. Push y abrir PR hacia develop.
5. Esperar a que pase la CI completa.
6. Revisar cambios y comentarios.
7. Merge (merge commit) sin borrar la rama.
8. La issue se cierra automáticamente por la referencia Closes #N.
```

## Release final

El último paso es una PR `develop → main` con release notes, tag SemVer y checklist de verificación E2E completo.
