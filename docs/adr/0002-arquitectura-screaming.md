# ADR 0002 · Arquitectura screaming por dominios

- **Estado:** Aceptado
- **Fecha:** 2026-04-24
- **Reemplaza a:** —

## Contexto

El documento `10_ARQUITECTURA_DE_SOFTWARE.md` propone una arquitectura por capas separando ingesta, normalización, RDF, scoring, API y frontend. La experiencia previa indica que aplicar esta separación desde el primer commit evita acoplar lógica de negocio a frameworks (FastAPI, RDFLib, Vite) y facilita testing y refactor.

## Decisión

Se adopta una **arquitectura screaming** cuyo árbol de carpetas refleja el dominio del problema (territorios, indicadores, grafo, scoring, fuentes) y no únicamente los frameworks técnicos.

```
apps/
  api/                 # Backend Python
    src/atlashabita/
      domain/          # Entidades, valores y políticas puras
      application/     # Casos de uso orquestando el dominio
      infrastructure/  # Adaptadores (RDFLib, filesystem, HTTP)
      interfaces/      # API FastAPI
      config/          # Configuración tipada
      observability/   # Logging, métricas, errores
  web/                 # Frontend React
    src/
      features/        # Dashboard, mapa, ranking, ficha, comparador
      components/      # Primitivas reutilizables (ui/)
      services/        # Cliente API tipado
      hooks/           # Hooks transversales
      state/           # Zustand stores
      routes/          # Rutas y layout
      styles/          # Tokens y utilidades
ontology/              # Vocabulario RDF y shapes SHACL
data/                  # Raw, interim, processed y RDF
scripts/               # Utilidades reproducibles
docs/                  # PRD, SRS, arquitectura, ADR
```

## Alternativas evaluadas

| Opción | Motivo descartado |
|---|---|
| Monolito por capas técnicas (controllers, services, models) | Oculta el dominio y favorece Transaction Script. |
| Microservicios | Innecesario para un MVP académico y añade complejidad operativa. |
| Single-package Python+Jinja | Limita la UX del frontend. |

## Consecuencias

- El dominio no depende de FastAPI ni RDFLib. Los tests unitarios corren sin levantar servidor.
- El frontend se organiza por *features*, lo que facilita borrar código cuando una pantalla deja de existir.
- Los datasets y el grafo tienen carpetas propias auditables.
