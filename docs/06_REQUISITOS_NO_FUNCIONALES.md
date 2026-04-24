# 06 — Requisitos no funcionales

**Proyecto:** AtlasHabita  
**Objetivo:** definir las propiedades de calidad que el sistema debe cumplir.

## 1. Enfoque

Los requisitos no funcionales son esenciales en AtlasHabita porque el riesgo principal no es solo construir pantallas, sino construir una plataforma confiable con datos heterogéneos. La recomendación territorial será útil solo si el sistema es trazable, reproducible, mantenible, usable y explicable.

## 2. Tabla de requisitos no funcionales

| ID | Categoría | Requisito | Prioridad | Criterio de verificación |
|---|---|---|---|---|
| RNF-001 | Rendimiento de mapa | El mapa inicial debe ser usable con geometrías simplificadas y carga progresiva. | Alta | El mapa no debe bloquearse al cambiar de capa o seleccionar un territorio. |
| RNF-002 | Tiempo de respuesta API | Los endpoints principales deben responder en tiempos aceptables para uso interactivo. | Alta | Ranking y ficha deben servirse desde cache o agregados precomputados cuando sea posible. |
| RNF-003 | Reproducibilidad | Cada ingesta y scoring debe poder repetirse con configuración versionada. | Alta | Un resultado debe asociarse a versión de datasets, configuración y fórmula. |
| RNF-004 | Trazabilidad | Cada indicador debe conservar fuente, periodo, fecha de ingesta y transformación. | Alta | No se publica indicador sin metadatos mínimos. |
| RNF-005 | Calidad de datos | Los datos deben pasar validaciones antes de alimentar el grafo o el scoring. | Alta | Errores críticos bloquean la publicación. |
| RNF-006 | Mantenibilidad | El código debe estar organizado por dominios y responsabilidades. | Alta | No deben existir módulos genéricos masivos que mezclen lógica no relacionada. |
| RNF-007 | Testabilidad | La lógica de scoring, normalización y RDF debe poder probarse sin frontend. | Alta | Cada módulo crítico tiene pruebas unitarias o de integración. |
| RNF-008 | Interoperabilidad semántica | El RDF debe usar vocabularios estándar cuando sea razonable. | Alta | Se usan URIs estables y prefijos documentados. |
| RNF-009 | Accesibilidad | La interfaz debe poder usarse con textos claros, contraste suficiente y navegación básica por teclado. | Media | Las pantallas principales evitan depender exclusivamente del color. |
| RNF-010 | Usabilidad | El usuario no técnico debe entender ranking y explicación sin conocer RDF. | Alta | Los términos técnicos quedan en modo avanzado o glosario. |
| RNF-011 | Seguridad | El sistema debe minimizar superficies de ataque y validar entradas. | Alta | No se ejecutan consultas arbitrarias peligrosas en endpoints públicos. |
| RNF-012 | Privacidad | El sistema no debe requerir datos personales para el MVP. | Alta | Los perfiles se calculan localmente o sin persistir identidad personal. |
| RNF-013 | Disponibilidad | La demo debe funcionar aunque algunas fuentes externas estén caídas. | Alta | El sistema usa datos cacheados o dataset de demostración. |
| RNF-014 | Escalabilidad | El diseño debe permitir pasar de municipios a secciones censales sin reescribir todo. | Media | Los contratos de datos separan entidad territorial y granularidad. |
| RNF-015 | Observabilidad | Las ingestas y API deben generar logs y métricas útiles. | Media | Hay reportes de ejecución, errores y cobertura. |
| RNF-016 | Portabilidad | La ejecución local debe ser posible en un entorno reproducible. | Media | La documentación define dependencias y comandos principales. |
| RNF-017 | Licencias y atribución | Las fuentes deben conservar licencia y atribución en UI/exportaciones. | Alta | OpenStreetMap y fuentes públicas muestran atribución cuando se usan. |
| RNF-018 | Robustez ante nulos | El sistema debe manejar ausencias sin romper ranking o UI. | Alta | Los nulos se explican y no producen errores silenciosos. |
| RNF-019 | Consistencia territorial | Los códigos y jerarquías administrativas deben mantenerse coherentes. | Alta | Un municipio no puede pertenecer a dos provincias simultáneas en la misma versión. |
| RNF-020 | Evolutividad | Debe poder añadirse una nueva fuente sin modificar todas las capas. | Media | Cada fuente usa adaptador y contrato propio. |
| RNF-021 | Claridad documental | La documentación debe permitir implementar y defender el proyecto. | Alta | Cada módulo tiene propósito, entradas, salidas y criterios de validación. |

## 3. Quality gates no funcionales

Antes de considerar una versión como entregable, deben cumplirse estos mínimos:

1. No hay indicador publicado sin fuente.
2. No hay score publicado sin versión de fórmula.
3. No hay grafo RDF publicado sin validación SHACL mínima.
4. No hay ranking que oculte datos faltantes relevantes.
5. No hay geometría final sin simplificación o validación básica para renderizado.
6. No hay endpoint público que acepte parámetros sin validación.
7. No hay pantalla principal que use tecnicismos sin explicación.

## 4. Relación con la evaluación académica

Estos requisitos permiten demostrar madurez de ingeniería. En una defensa, los RNF deben presentarse como decisiones de calidad: por qué se usa cache, por qué se separa raw/normalized/rdf, por qué se valida con SHACL, por qué se explica el score y por qué el mapa no carga geometrías pesadas directamente.
