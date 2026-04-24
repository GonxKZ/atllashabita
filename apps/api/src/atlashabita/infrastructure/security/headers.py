"""Generadores de cabeceras HTTP con valores por defecto conservadores.

El objetivo es que *cualquier* respuesta del backend (JSON, redirecciones,
errores) se emita con una postura de seguridad por defecto endurecida sin
romper los clientes legítimos. La función principal devuelve un ``dict`` para
que el llamador decida cómo aplicarla (middleware, dependencia, test…).

Las cabeceras incluidas y las amenazas que mitigan:

* ``Content-Security-Policy: default-src 'self'`` — reduce superficie de XSS y
  data exfiltration al permitir sólo recursos del mismo origen.
* ``Referrer-Policy: strict-origin-when-cross-origin`` — evita fugas de URLs
  internas a terceros.
* ``Strict-Transport-Security: max-age=31536000; includeSubDomains`` — fuerza
  HTTPS durante un año, incluidos subdominios.
* ``X-Content-Type-Options: nosniff`` — inhibe el MIME-sniffing del navegador.
* ``Permissions-Policy: geolocation=(), microphone=()`` — bloquea APIs
  sensibles salvo que el negocio las necesite (AtlasHabita expone datos
  territoriales públicos, no requiere geolocalización del cliente).
* ``X-Frame-Options: DENY`` — evita clickjacking por iframe en navegadores
  antiguos que no soportan CSP ``frame-ancestors``.
* ``Cross-Origin-Opener-Policy`` y ``Cross-Origin-Resource-Policy`` — aislan
  el contexto de navegación para blindar ataques Spectre-like.
"""

from __future__ import annotations

from collections.abc import Mapping
from types import MappingProxyType

_DEFAULTS: Mapping[str, str] = MappingProxyType(
    {
        "Content-Security-Policy": (
            "default-src 'self'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "img-src 'self' data:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self'"
        ),
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
    }
)


def default_security_headers() -> dict[str, str]:
    """Devuelve una copia mutable de las cabeceras recomendadas.

    Se retorna una copia en cada llamada para que el consumidor pueda
    extenderla o sobrescribir valores específicos (por ejemplo, permitir
    ``img-src`` adicional para un CDN) sin alterar el estado global.
    """
    return dict(_DEFAULTS)


def merge_security_headers(overrides: Mapping[str, str] | None = None) -> dict[str, str]:
    """Combina :func:`default_security_headers` con ``overrides`` del caller.

    Las claves vacías (``""``) se eliminan del resultado: así el caller puede
    suprimir una cabecera concreta pasando ``{"X-Frame-Options": ""}`` sin
    recurrir a APIs adicionales.
    """
    headers = default_security_headers()
    if overrides:
        for key, value in overrides.items():
            if value == "":
                headers.pop(key, None)
            else:
                headers[key] = value
    return headers
