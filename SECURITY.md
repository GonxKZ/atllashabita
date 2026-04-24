# Política de seguridad de AtlasHabita

AtlasHabita procesa datos territoriales públicos y no almacena información
personal, pero tomamos la seguridad en serio: cualquier fallo en ingesta,
scoring o en la API puede distorsionar decisiones de política pública. Este
documento describe cómo reportar vulnerabilidades, qué alcance cubrimos y qué
puedes esperar como investigador.

## Versiones soportadas

| Versión | Estado         | Recibe parches de seguridad |
| ------- | -------------- | --------------------------- |
| `main`  | Producción     | Sí                          |
| `develop` | Integración continua | Sí                    |
| Ramas `feat/*`, `fix/*`, `chore/*` | Temporales | No (descartadas al mergear) |

## Cómo reportar una vulnerabilidad

Preferimos divulgación responsable por canales privados. Usa **uno** de los
siguientes:

1. **Correo electrónico (recomendado)**: `licitaciones@gpic.es` con el asunto
   `[SECURITY] AtlasHabita — <resumen breve>`. Si el problema es sensible,
   cifra el mensaje con nuestra clave PGP (disponible a petición).
2. **GitHub Security Advisories**: usa el botón _Report a vulnerability_ en
   la página de seguridad del repositorio
   (`https://github.com/GonxKZ/atllashabita/security/advisories/new`). El
   borrador es privado hasta que se publica.

**No abras issues públicos** para reportar vulnerabilidades activas. Si lo
haces por error, avisaremos y migraremos el reporte a un canal privado.

### Qué incluir en el reporte

Para acelerar la triaje:

- Descripción del problema y del impacto (confidencialidad, integridad,
  disponibilidad).
- Pasos reproducibles, incluyendo commit o versión afectada.
- Entorno (sistema operativo, Python, navegador).
- Prueba de concepto mínima (scripts, peticiones curl, capturas).
- Mitigaciones o parches propuestos, si los tienes.

## Qué puedes esperar

| Fase                | Plazo objetivo                               |
| ------------------- | -------------------------------------------- |
| Acuse de recibo     | 48 horas laborables                          |
| Evaluación inicial  | 5 días laborables                            |
| Plan de mitigación  | 10 días laborables                           |
| Parche coordinado   | 30 días (crítica/alta) · 90 días (media/baja) |

Publicaremos un aviso en GitHub Security Advisories cuando el parche esté
disponible y reconoceremos tu autoría si así lo prefieres.

## Alcance

### En alcance

- Backend Python (`apps/api/`): vulnerabilidades en la API REST, parsers RDF,
  scoring, ingestión de fuentes o dependencias.
- Frontend web (`apps/web/`): XSS, CSRF, exposición de secretos o
  configuración insegura.
- Infraestructura declarada en el repositorio (Docker Compose, workflows de
  CI, scripts de despliegue).
- Datos y ontologías versionados (`data/`, `ontology/`).

### Fuera de alcance

- Ataques que requieren acceso físico o credenciales filtradas por
  terceros.
- Ataques de ingeniería social contra mantenedores.
- Denegación de servicio por tráfico volumétrico no amplificado.
- Versiones desplegadas por terceros a partir de forks sin soporte.
- Hallazgos automáticos sin prueba de explotabilidad (por ejemplo, reportes
  crudos de escáneres sin validar).

## Buenas prácticas al colaborar

- No interactúes con datos reales de usuarios: AtlasHabita sólo publica
  agregados, pero una prueba destructiva podría corromper un dataset de
  investigación.
- No extraigas ni persistas datos sensibles más allá del mínimo necesario
  para demostrar el fallo.
- Respeta la Ley Orgánica 3/2018 (España) y el RGPD.

## Controles internos automatizados

El repositorio ejecuta de forma periódica:

- **CodeQL** (Python y JavaScript) con el conjunto `security-and-quality`.
- **Trivy filesystem scan** con publicación SARIF en GitHub Security.
- **pip-audit** y **bandit** sobre el backend.
- **pnpm audit** sobre el frontend.
- **Dependabot** para actualizaciones semanales agrupadas.

## Contacto

Para cualquier consulta adicional sobre esta política: `licitaciones@gpic.es`.
