# 00 — Índice general de documentación

**Proyecto:** AtlasHabita  
**Versión documental:** 1.0  
**Fecha:** 2026-04-24

## Propósito del paquete documental

Este conjunto de documentos define de forma completa el producto, los requisitos, la arquitectura, los datos, la experiencia de usuario, la validación y la estrategia de entrega de AtlasHabita. El objetivo es que el proyecto pueda presentarse como una obra de ingeniería de software y de bases de datos, no como una simple aplicación de mapa con datos pegados.

AtlasHabita es una aplicación web que recomienda zonas de España para vivir, estudiar, teletrabajar o emprender. Lo hace integrando datos públicos, transformándolos mediante una canalización de ingesta reproducible, construyendo un Knowledge Graph RDF y presentando resultados explicables sobre un mapa interactivo.

## Documentos incluidos

| Documento | Finalidad | Lectura prioritaria |
|---|---|---:|
| `01_NOMBRES_DEL_PROYECTO.md` | Naming, alternativas y recomendación de marca | Alta |
| `02_CONTEXTO_ACADEMICO_Y_OBJETIVOS.md` | Encaje con la asignatura y objetivos evaluables | Alta |
| `03_PRD_PRODUCT_REQUIREMENTS_DOCUMENT.md` | Visión de producto, usuarios, experiencia y alcance | Alta |
| `04_SRS_SOFTWARE_REQUIREMENTS_SPECIFICATION.md` | Especificación técnica completa | Alta |
| `05_REQUISITOS_FUNCIONALES.md` | Requisitos funcionales trazables y verificables | Alta |
| `06_REQUISITOS_NO_FUNCIONALES.md` | Calidad, seguridad, rendimiento, mantenibilidad | Alta |
| `07_REGLAS_DE_NEGOCIO_Y_CRITERIOS_ACEPTACION.md` | Reglas del dominio y criterios de aceptación | Alta |
| `08_CASOS_DE_USO_E_HISTORIAS_DE_USUARIO.md` | Actores, casos de uso, historias y flujos | Alta |
| `09_MODELO_CONCEPTUAL_DEL_DOMINIO.md` | Entidades, relaciones y modelo conceptual | Media |
| `10_ARQUITECTURA_DE_SOFTWARE.md` | Capas, componentes, decisiones y módulos | Alta |
| `11_MODELO_DE_DATOS_RDF_Y_ONTOLOGIA.md` | Ontología RDF, URIs, vocabularios y consultas | Alta |
| `12_INGESTA_ETL_ELT_Y_CALIDAD_DE_DATOS.md` | Pipeline de datos, fuentes, validación y calidad | Alta |
| `13_SIG_MAPA_CAPAS_Y_CONSULTAS_ESPACIALES.md` | Diseño SIG, capas, operaciones espaciales | Alta |
| `14_MOTOR_DE_RECOMENDACION_Y_DATA_MINING.md` | Scoring, perfiles, normalización y explicabilidad | Alta |
| `15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md` | Endpoints, contratos JSON, errores y servicios | Media |
| `16_FRONTEND_UX_UI_Y_FLUJOS.md` | Pantallas, interacción, mapa y UX | Media |
| `17_SEGURIDAD_PRIVACIDAD_Y_CUMPLIMIENTO.md` | Amenazas, permisos, privacidad, licencias | Media |
| `18_PLAN_DE_PRUEBAS_VALIDACION_Y_CALIDAD.md` | Estrategia de pruebas y quality gates | Alta |
| `19_PLAN_DE_IMPLEMENTACION_Y_ENTREGA.md` | Fases, entregables y dependencias | Media |
| `20_OPERACION_MANTENIMIENTO_Y_OBSERVABILIDAD.md` | Operación, monitorización, backups y evolución | Media |
| `21_TRAZABILIDAD_REQUISITOS_MODULOS_PRUEBAS.md` | Matriz de trazabilidad | Alta |
| `22_MEMORIA_ACADEMICA_Y_DEFENSA.md` | Guía para memoria y presentación | Alta |
| `23_GLOSARIO.md` | Conceptos técnicos y de dominio | Media |

## Resultado esperado del proyecto

El resultado esperado es una aplicación capaz de:

1. Integrar datos heterogéneos de territorio, vivienda, renta, movilidad, servicios, medio ambiente y actividad económica.
2. Representar entidades y relaciones en un grafo RDF consultable con SPARQL.
3. Mostrar un mapa interactivo con capas geográficas útiles.
4. Recomendar zonas según perfiles configurables.
5. Explicar cada recomendación mediante factores, pesos, fuentes y calidad del dato.
6. Exportar o inspeccionar información técnica para demostrar trazabilidad.

## Criterio de éxito global

El proyecto se considera correctamente definido cuando cualquier persona puede responder, leyendo esta documentación, a estas preguntas:

- Qué problema resuelve.
- Para quién lo resuelve.
- Qué funcionalidades debe tener.
- Qué calidad mínima debe cumplir.
- Qué datos necesita.
- Cómo se modelan los datos.
- Cómo se transforma la información.
- Cómo se consulta el grafo RDF.
- Cómo se calcula una recomendación.
- Cómo se valida el resultado.
- Cómo se defenderá académicamente.
