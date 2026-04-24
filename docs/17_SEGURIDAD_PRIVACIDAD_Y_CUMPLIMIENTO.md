# 17 — Seguridad, privacidad y cumplimiento

**Proyecto:** AtlasHabita

## 1. Principio de seguridad

El MVP debe minimizar riesgos evitando almacenar datos personales. Los perfiles de decisión pueden calcularse sin identidad real del usuario. La seguridad se centra en proteger la integridad de datos, evitar entradas maliciosas, controlar endpoints técnicos y respetar licencias de fuentes.

## 2. Activos a proteger

| Activo | Riesgo |
|---|---|
| Datos normalizados | Corrupción o uso de versiones incorrectas. |
| Grafo RDF | Triples inválidos o procedencia falsa. |
| API | Abuso de endpoints, parámetros maliciosos. |
| Cache | Datos obsoletos usados sin advertencia. |
| Configuración de scoring | Manipulación que produzca rankings engañosos. |
| Licencias y atribución | Incumplimiento de condiciones de uso. |

## 3. Amenazas principales

| Amenaza | Mitigación |
|---|---|
| Parámetros inválidos en API | Validación estricta de tipos, rangos y enums. |
| Consulta SPARQL arbitraria costosa | Consultas predefinidas o límites de ejecución. |
| Datos externos corruptos | Validación de contratos y checksums cuando sea posible. |
| Obsolescencia de fuentes | Fecha de ingesta visible y política de actualización. |
| Exposición de rutas internas | API no devuelve paths internos. |
| Pérdida de reproducibilidad | Versionado de datos, fórmulas y configuración. |

## 4. Privacidad

El sistema no necesita almacenar nombre, correo, ubicación exacta personal ni historial de preferencias para el MVP. Si en una versión futura se guardan perfiles, deberán tratarse como datos personales o pseudopersonales y requerir medidas adicionales.

## 5. Licencias y atribución

Cada fuente debe registrar licencia, propietario y atribución. La UI debe mostrar atribuciones cuando los datos aparezcan en mapa o fichas. Los datos derivados deben conservar referencia a fuentes originales.

## 6. Roles internos

| Rol | Permisos |
|---|---|
| Usuario público | Consultar mapa, ranking y fichas. |
| Usuario técnico | Consultar panel técnico y reportes públicos. |
| Administrador de datos | Ejecutar ingestas, revisar calidad, publicar datasets. |
| Administrador del sistema | Configurar despliegue, cache y seguridad. |

## 7. Controles mínimos

- Validación de entrada en API.
- Límites de paginación.
- Logs de errores sin secretos.
- Separación de configuración sensible.
- Reportes de calidad antes de publicar.
- Control de endpoints técnicos.
- Copias de seguridad de artefactos estables.

## 8. Criterio de aceptación

La aplicación cumple seguridad mínima si no almacena datos personales innecesarios, valida entradas, conserva procedencia, muestra licencias y evita publicar datos que no superen calidad.
