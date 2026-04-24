# 20 — Operación, mantenimiento y observabilidad

**Proyecto:** AtlasHabita

## 1. Objetivo

Aunque el proyecto sea académico, debe diseñarse como si pudiera mantenerse. La operación incluye ejecución de ingestas, actualización de fuentes, revisión de calidad, backups de artefactos y monitorización de errores.

## 2. Artefactos operativos

| Artefacto | Uso |
|---|---|
| Datos raw | Reproducir ingesta. |
| Datos normalizados | Alimentar indicadores. |
| Grafo RDF | Consultas semánticas y exportación. |
| Reportes de calidad | Auditar datos. |
| Configuración de scoring | Reproducir rankings. |
| Logs de API | Diagnóstico. |
| Dataset demo | Garantizar demostración. |

## 3. Observabilidad

| Métrica | Propósito |
|---|---|
| Tiempo de ingesta por fuente | Detectar cuellos de botella. |
| Filas procesadas | Verificar cambios anómalos. |
| Cobertura territorial | Detectar pérdida de datos. |
| Violaciones SHACL | Controlar validez RDF. |
| Tiempo de respuesta API | Mantener UX. |
| Fallos por endpoint | Detectar errores funcionales. |
| Fuentes obsoletas | Planificar actualización. |

## 4. Mantenimiento de fuentes

Cada fuente debe tener política de revisión. Fuentes críticas como límites territoriales, renta, alquiler y servicios deben revisarse con mayor frecuencia que fuentes opcionales.

## 5. Backups

Se recomienda conservar:

- Última versión raw válida.
- Última versión normalizada válida.
- Última versión RDF válida.
- Último reporte de calidad.
- Configuración de scoring usada en la demo.

## 6. Gestión de errores

| Error | Acción |
|---|---|
| Fuente no responde | Usar cache anterior y marcar advertencia. |
| Cambio de esquema | Bloquear ingesta y generar reporte. |
| Geometría inválida | Intentar reparación; si falla, excluir y reportar. |
| SHACL crítico | No publicar grafo. |
| API lenta | Revisar cache y precomputación. |

## 7. Evolución futura

- Añadir triplestore externo.
- Añadir más granularidad por sección censal.
- Añadir modelos de recomendación avanzados.
- Añadir panel de administración.
- Añadir actualización programada de fuentes.
- Añadir teselas vectoriales para mapa.

## 8. Criterio de operación mínima

La operación mínima queda satisfecha si existe un comando reproducible para generar datos, un reporte de calidad, un grafo válido, un dataset demo y una forma de restaurar la última versión válida.
