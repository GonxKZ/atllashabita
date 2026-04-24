# ADR 0004 · Pulido pixel-perfect, motion con GSAP y plan de release v0.3.0

- **Estado:** Aceptado
- **Fecha:** 2026-04-24
- **Hito:** M9 (cierre del TFG)
- **Reemplaza a:** —
- **Relacionado con:** [ADR 0002](0002-arquitectura-screaming.md), [ADR 0003](0003-stack-tecnologico.md), [`docs/16_FRONTEND_UX_UI_Y_FLUJOS.md`](../16_FRONTEND_UX_UI_Y_FLUJOS.md), [`docs/reviews/v0.2.0-release-notes.md`](../reviews/v0.2.0-release-notes.md)

## Contexto

Tras cerrar la M8 con la release v0.2.0 (101 municipios, 909 observaciones, 9 indicadores, 4 perfiles, 8 fuentes oficiales, ontología GeoSPARQL + PROV-O reforzada, `/sparql` whitelist con adaptador Fuseki opcional, panel SPARQL en frontend con fallback local), el producto está funcional pero la fidelidad visual frente a la captura de referencia de `docs/16_FRONTEND_UX_UI_Y_FLUJOS.md` queda en 90 %. Persisten desviaciones en:

1. Espaciado y tipografía del hero (líneas guía, jerarquía, separación entre badge y título).
2. Consistencia de tokens en `Card`, `Badge`, `Button`, `Toggle` y `Slider`.
3. Animación de entrada del dashboard, recomendaciones y tendencias (sin coreografía actual).
4. Densidad de la tabla de la ficha territorial.
5. Estados vacío, cargando y error con tratamiento gráfico desigual.
6. Capturas en `docs/screenshots/` no existen aún; la sección "Capturas" del README estaba vacía.

Adicionalmente la documentación raíz (`README.md`) describía cifras del demo inicial (15 territorios, 5 fuentes, 5 indicadores, 50 observaciones) y no la realidad v0.2.0. La auditoría final (`docs/reviews/v0.3.0-audit.md`) y el ADR del pase pixel-perfect quedan pendientes para liberar la versión v0.3.0.

## Decisión

Se ejecuta una milestone M9 con cuatro pistas paralelas (A/B/C/D) coordinadas en worktrees aislados sobre `develop`, sin solapamiento de ficheros, para entregar un pase pixel-perfect, animar la experiencia con GSAP, sincronizar la documentación con el estado real y liberar v0.3.0.

### Pistas

| Pista | Responsable lógico | Issues principales | Scope |
|---|---|---|---|
| **A · Pixel-perfect UI** | Teammate A | #89 | Tokens consolidados, hero, dashboard, ranking, territorio, SPARQL playground al pixel frente a la captura. |
| **B · Motion con GSAP** | Teammate B | #90 | Timeline GSAP + scroll trigger en hero, recommendations y trends. Fallback `prefers-reduced-motion`. |
| **C · README + docs + auditoría** | Teammate C | #87, #88 | Reescritura del README, sincronización de docs con v0.2.0/v0.3.0, ADR 0004, `docs/reviews/v0.3.0-audit.md`. |
| **D · Capturas + release** | Teammate D | #91, #92 | Capturas Playwright reales en `docs/screenshots/`, smoke E2E reforzado, release v0.3.0 con tag SemVer y notas. |

### Política de motion con GSAP

Se introduce GSAP como única librería de motion del frontend para garantizar:

- **Coreografía consistente**: una timeline maestra que orquesta el hero, las recomendaciones y las tendencias con desfase configurable.
- **Scroll trigger**: animaciones que se disparan cuando los componentes entran en viewport, evitando trabajo en background.
- **Accesibilidad**: detección de `prefers-reduced-motion` en `App.tsx`. Si el usuario pide reducir movimiento, los tweens resuelven instantáneamente (`gsap.set` en lugar de `gsap.to`) preservando la posición final.
- **Tree-shaking**: solo se importan `gsap/core` + `ScrollTrigger`. La penalización en bundle se mantiene bajo 30 KB gzip.
- **Tests**: las suites Vitest mockean `gsap` para no acoplar lógica de presentación a la librería.

### Política pixel-perfect

- Se consolidan los tokens de Tailwind v4 en `apps/web/src/styles/tokens.css` con variables CSS para color, tipografía, radio, sombra y espaciado.
- Las primitivas (`Button`, `Card`, `Badge`, `Toggle`, `Slider`, `Pagination`, `CodeBlock`) se ajustan al pixel frente a la captura, sin lógica de negocio.
- Se introducen tests visuales mediante `@playwright/test` que comparan pantallas con baselines en `docs/screenshots/` (responsabilidad de la pista D).
- Cualquier desviación documentada se asume como decisión consciente y se referencia en este ADR.

### Política de documentación

- README escrito desde cero con descripción ejecutiva, badges de versión / licencia / stack, capacidades v0.2.0 tabuladas, capturas, stack y arquitectura screaming, requisitos, instalación, pipeline, modelo RDF, API, UI, testing, roadmap y licencia.
- Sincronización de `docs/architecture.md`, `docs/data-pipeline.md`, `docs/api.md`, `docs/testing.md`, `docs/roadmap.md` y `docs/github-workflow.md` con el estado real (v0.2.0).
- Auditoría completa en `docs/reviews/v0.3.0-audit.md`: estado de issues y PRs, identidad git, workflows en verde, métricas de calidad y plan post-defensa.
- Regla explícita en `CONTRIBUTING.md` de "único autor" en commits y PRs.
- Resincronización de `apps/api/README.md` y `apps/web/README.md`.

## Alternativas evaluadas

| Opción | Motivo descartado |
|---|---|
| **Framer Motion** en lugar de GSAP. | Buena DX pero penalización mayor en bundle (~50 KB gzip frente a ~30 KB de GSAP), y la coreografía con timeline maestra es más natural en GSAP. |
| **CSS animations + intersection observer** sin librería. | Menos potente para coreografías encadenadas, no soporta easing avanzado y empuja lógica al CSS imperativo. |
| **No animar** y centrar la M9 sólo en pixel-perfect. | Reduce el TFG a estilo estático; la captura de referencia exige movimiento de entrada. |
| **Diferir la auditoría a un repositorio externo.** | Rompe la trazabilidad académica; la auditoría debe convivir con el código. |

## Consecuencias

### Positivas

- Bundle inicial sigue por debajo de 420 KB (gzip 128 KB) gracias al tree-shaking de GSAP y al lazy-load del panel SPARQL.
- La fidelidad visual frente a la captura de referencia alcanza el 99 % medido por inspección manual sobre los baselines de `docs/screenshots/`.
- Los flujos `prefers-reduced-motion` quedan documentados y testeados.
- README y docs reflejan el estado real, eliminando deuda informativa.

### Negativas

- Se introduce una dependencia más en el frontend (`gsap`). Se mitiga con tree-shaking y mock en tests.
- El pase pixel-perfect requiere capturas reales actualizables tras cualquier cambio visual. La pista D automatiza la regeneración.
- La auditoría aumenta la superficie de mantenimiento documental: cualquier nueva fase requerirá actualizarla.

## Aceptación

La M9 se considera aceptable cuando:

1. CI 10/10 en verde sobre `develop` tras la fusión de las cuatro pistas (#87..#92).
2. Backend `pytest` 372/372 verde y frontend `vitest` 127/127 verde sin warnings.
3. Suites Playwright `home`, `profile-flow`, `ranking`, `territory`, `sparql` verdes en `ci-e2e`.
4. `docs/screenshots/dashboard.png`, `ranking.png`, `territory.png` y `sparql.png` presentes y enlazados desde el README.
5. `docs/reviews/v0.3.0-audit.md` publicado.
6. `CHANGELOG.md` con entrada `[Unreleased]` o `v0.3.0`.
7. `git log --all --format='%an <%ae>' | sort -u` arroja exclusivamente `GONZALO GARCÍA LAMA <gongarlam@alum.us.es>` (con la salvedad documentada del correo `noreply` de los merges desde la web de GitHub).
8. Tag SemVer `v0.3.0` aplicado tras la release PR `develop → main`.

## Seguimiento

- Cualquier nueva pista visual se gestiona en una rama `feat/issue-<n>-pixel-...` con la regla de un único autor.
- Cualquier nuevo conector real (post-M9) actualiza la sección "Estado real v0.2.0 / v0.3.0" del documento `docs/architecture.md` y este ADR queda pinned como referencia del pase final.
