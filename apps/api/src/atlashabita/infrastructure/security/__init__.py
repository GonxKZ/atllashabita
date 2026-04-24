"""Adaptadores de seguridad reutilizables por la capa de interfaz HTTP.

El paquete agrupa tres familias de utilidades aisladas de FastAPI para poder
testearlas como funciones puras:

* :mod:`sanitization` — coerción y saneado de valores que llegan desde la red
  (path traversal, XSS, inyección en CSV, listas blancas de IPs, etc.).
* :mod:`rate_limiter` — limitador por token bucket, con variante síncrona y
  asíncrona, seguro ante concurrencia.
* :mod:`headers` — cabeceras de seguridad conservadoras (CSP, HSTS,
  ``Permissions-Policy``, etc.) listas para cualquier respuesta.

Los módulos no dependen entre sí y no importan FastAPI ni Starlette para que
puedan ejecutarse en tareas programadas, workers o scripts de verificación.
"""

from atlashabita.infrastructure.security.headers import default_security_headers
from atlashabita.infrastructure.security.rate_limiter import (
    AsyncTokenBucket,
    TokenBucket,
)
from atlashabita.infrastructure.security.sanitization import (
    clamp_int,
    is_ip_allowed,
    normalize_search,
    safe_filename,
)

__all__ = [
    "AsyncTokenBucket",
    "TokenBucket",
    "clamp_int",
    "default_security_headers",
    "is_ip_allowed",
    "normalize_search",
    "safe_filename",
]
