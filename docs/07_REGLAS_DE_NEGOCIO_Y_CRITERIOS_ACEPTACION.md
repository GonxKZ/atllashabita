# 07 — Reglas de negocio y criterios de aceptación

**Proyecto:** AtlasHabita

## 1. Principios de reglas de negocio

Las reglas de negocio son restricciones y decisiones del dominio que no dependen de la tecnología concreta. En AtlasHabita, las reglas principales tienen que ver con territorios, indicadores, fuentes, scores, datos faltantes y explicación.

## 2. Reglas sobre territorios

| ID | Regla | Explicación | Criterio de aceptación |
|---|---|---|---|
| RN-TER-001 | Todo territorio debe tener identificador estable. | El sistema no debe depender solo del nombre textual porque puede repetirse o variar. | Cada territorio tiene URI y código normalizado. |
| RN-TER-002 | Todo municipio debe pertenecer a una provincia y una comunidad autónoma. | La jerarquía administrativa es necesaria para filtros y agregaciones. | Un municipio sin jerarquía queda en error de calidad. |
| RN-TER-003 | Las geometrías deben estar en CRS común para el frontend. | Evita errores de renderizado y operaciones espaciales incorrectas. | Todas las geometrías publicadas se transforman a WGS84 para mapa. |
| RN-TER-004 | La sección censal solo se usa si su fuente y año están claros. | La granularidad fina cambia con el tiempo. | Cada sección tiene periodo y fuente. |

## 3. Reglas sobre indicadores

| ID | Regla | Explicación | Criterio de aceptación |
|---|---|---|---|
| RN-IND-001 | Un indicador debe tener valor, unidad, periodo y fuente. | Sin esos campos no es interpretable. | La validación bloquea indicadores incompletos. |
| RN-IND-002 | Los indicadores comparables deben normalizarse antes del scoring. | Mezclar euros, porcentajes y conteos sin normalizar sería incorrecto. | Cada indicador usado en score tiene rango normalizado. |
| RN-IND-003 | Los indicadores de coste pueden invertirse. | Menor alquiler puede ser mejor que mayor alquiler. | El scoring define dirección: mayor-mejor o menor-mejor. |
| RN-IND-004 | Los valores extremos deben revisarse. | Outliers pueden distorsionar rankings. | Se aplica winsorización, clipping o reporte de outliers. |
| RN-IND-005 | Los indicadores agregados deben explicar método de agregación. | Contar POIs por municipio no es lo mismo que medir distancia media. | Cada indicador derivado documenta fórmula. |

## 4. Reglas sobre datos faltantes

| ID | Regla | Decisión |
|---|---|---|
| RN-MISS-001 | Un dato faltante no se convierte automáticamente en cero. | Cero significa ausencia real; faltante significa desconocido. |
| RN-MISS-002 | Si una variable crítica falta, el territorio recibe advertencia. | La interfaz debe mostrar incertidumbre. |
| RN-MISS-003 | La imputación solo se permite si queda marcada. | Se debe registrar método y nivel de confianza. |
| RN-MISS-004 | Un perfil puede excluir territorios con demasiados datos faltantes. | Especialmente para rankings comparativos. |

## 5. Reglas sobre scoring

| ID | Regla | Explicación |
|---|---|---|
| RN-SCO-001 | El score global se calcula como suma ponderada de sub-scores normalizados. | Fórmula inicial simple, explicable y reproducible. |
| RN-SCO-002 | Cada perfil tiene pesos por defecto. | Estudiante, familia, teletrabajo y negocio valoran cosas distintas. |
| RN-SCO-003 | El usuario puede modificar pesos dentro de límites razonables. | Evita configuraciones absurdas sin impedir exploración. |
| RN-SCO-004 | El score debe guardar contribuciones por factor. | Necesario para explicación. |
| RN-SCO-005 | Los filtros duros se aplican antes del ranking. | Si el usuario exige alquiler máximo, no basta con penalizar. |
| RN-SCO-006 | La recomendación no debe formularse como verdad absoluta. | Debe aparecer como encaje relativo con prioridades. |

## 6. Reglas sobre fuentes y procedencia

| ID | Regla | Explicación |
|---|---|---|
| RN-FUE-001 | Toda fuente debe tener propietario, URL o referencia, fecha de ingesta y licencia si está disponible. | Permite auditoría. |
| RN-FUE-002 | Cada transformación debe tener versión. | Permite reproducibilidad. |
| RN-FUE-003 | Las fuentes externas no deben consultarse en tiempo real para cada usuario si existe cache. | Mejora rendimiento y evita dependencia externa. |
| RN-FUE-004 | Los datos con actualización vencida deben marcarse como obsoletos o pendientes de revisión. | Evita dar confianza falsa. |

## 7. Criterios de aceptación globales

Una versión cumple criterios de aceptación si:

- Un usuario puede obtener un ranking y entenderlo.
- Un evaluador puede inspeccionar la procedencia de un indicador.
- Un desarrollador puede reproducir el pipeline con comandos documentados.
- Un grafo RDF puede consultarse con SPARQL.
- Una validación SHACL detecta errores estructurales.
- La interfaz comunica incertidumbre cuando faltan datos.
