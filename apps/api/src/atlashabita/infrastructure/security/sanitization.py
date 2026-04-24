"""Funciones puras de saneado y coerción a tipos seguros.

Cada función encapsula una única decisión de seguridad y es deliberadamente
aburrida: recibe valores primitivos y devuelve valores primitivos, sin efectos
laterales ni acoplamiento con FastAPI. Eso permite componerlas en cualquier
capa (interfaz HTTP, workers, CLI) y testearlas exhaustivamente.

Las amenazas cubiertas son las habituales en un backend que expone datos
geoespaciales públicos:

* **Path traversal** — :func:`safe_filename` bloquea cualquier intento de
  escapar del directorio permitido mediante ``..``, rutas absolutas o
  separadores del sistema de ficheros.
* **XSS almacenado y reflejado** — :func:`normalize_search` elimina caracteres
  de control y etiquetas HTML antes de usar el texto en respuestas JSON o en
  plantillas del frontend.
* **CSV injection / inyección en fórmulas** — :func:`normalize_search` escapa
  los prefijos ``= + - @ |`` que Excel y LibreOffice interpretan como
  fórmulas si el texto acaba serializado en un CSV.
* **Enteros fuera de rango** — :func:`clamp_int` coerce valores recibidos como
  ``str`` o ``int`` al rango permitido, evitando integer overflow y consultas
  con ``LIMIT`` desmesurados.
* **Spoofing de IP en allowlists** — :func:`is_ip_allowed` se apoya en
  :mod:`ipaddress` para normalizar la comparación entre direcciones IPv4/IPv6
  y redes CIDR.
"""

from __future__ import annotations

import ipaddress
import re
import unicodedata
from collections.abc import Iterable

_FILENAME_MAX_LENGTH = 120
_FILENAME_ALLOWED = re.compile(r"[^A-Za-z0-9._-]+")
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_HTML_TAG = re.compile(r"<[^>]*?>")
_CSV_INJECTION_PREFIXES = ("=", "+", "-", "@", "|")


def safe_filename(candidate: str, *, fallback: str = "archivo") -> str:
    """Normaliza ``candidate`` para usarlo como nombre de fichero seguro.

    Mitiga path traversal (``../`` o ``C:\\``) y caracteres no imprimibles.
    El resultado siempre es una cadena no vacía compuesta por letras,
    dígitos, puntos, guiones y guiones bajos; si la entrada no contiene
    ningún carácter válido se devuelve ``fallback``.

    Raises:
        TypeError: si ``candidate`` no es ``str``.
    """
    if not isinstance(candidate, str):  # defensa ante entradas inesperadas
        raise TypeError("safe_filename espera un str")

    normalized = unicodedata.normalize("NFKD", candidate)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_only = ascii_only.replace("\\", "/")
    base = ascii_only.rsplit("/", 1)[-1]  # descarta segmentos de ruta
    base = base.strip().strip(".")
    base = _FILENAME_ALLOWED.sub("_", base)
    base = base.strip("._-")

    if not base:
        return fallback

    if len(base) > _FILENAME_MAX_LENGTH:
        base = base[:_FILENAME_MAX_LENGTH].rstrip("._-") or fallback

    return base


def normalize_search(value: str, *, max_length: int = 200) -> str:
    """Prepara texto libre para búsqueda, logging o exportación.

    - Elimina etiquetas HTML y caracteres de control que habilitan XSS.
    - Colapsa espacios en blanco contiguos.
    - Antepone ``'`` a los caracteres ``= + - @ |`` cuando aparecen al inicio
      para neutralizar inyección en hojas de cálculo.

    Raises:
        TypeError: si ``value`` no es ``str``.
    """
    if not isinstance(value, str):
        raise TypeError("normalize_search espera un str")

    cleaned = _HTML_TAG.sub(" ", value)
    cleaned = _CONTROL_CHARS.sub(" ", cleaned)
    cleaned = unicodedata.normalize("NFKC", cleaned)
    cleaned = " ".join(cleaned.split())
    cleaned = cleaned[:max_length].strip()

    if cleaned and cleaned[0] in _CSV_INJECTION_PREFIXES:
        cleaned = "'" + cleaned

    return cleaned


def clamp_int(value: object, *, minimum: int, maximum: int, default: int | None = None) -> int:
    """Coerce ``value`` a ``int`` y lo restringe a ``[minimum, maximum]``.

    Acepta ``int`` o cadenas numéricas razonables. Si ``value`` es ``None`` y se
    proporciona ``default`` dentro del rango, se devuelve el valor por defecto.

    Raises:
        ValueError: si ``minimum > maximum`` o la entrada no es convertible.
    """
    if minimum > maximum:
        raise ValueError("minimum no puede ser mayor que maximum")

    if value is None:
        if default is None:
            raise ValueError("valor requerido")
        parsed = default
    elif isinstance(value, bool):  # bool es subtipo de int: tratamos aparte
        parsed = int(value)
    elif isinstance(value, int):
        parsed = value
    elif isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            raise ValueError("valor vacío")
        try:
            parsed = int(stripped, 10)
        except ValueError as exc:
            raise ValueError(f"no es un entero válido: {value!r}") from exc
    else:
        raise ValueError(f"tipo no soportado: {type(value).__name__}")

    return max(minimum, min(maximum, parsed))


def is_ip_allowed(candidate: str, allowlist: Iterable[str]) -> bool:
    """Comprueba si ``candidate`` pertenece a alguna red CIDR de ``allowlist``.

    Los elementos de ``allowlist`` pueden ser IPs individuales (``203.0.113.7``)
    o redes CIDR (``10.0.0.0/8``). Entradas inválidas se ignoran silenciosamente
    para que un fichero de configuración corrupto no abra el backend a todo el
    mundo por accidente.

    Returns:
        ``True`` sólo si ``candidate`` es una IP válida y encaja en la lista.
    """
    try:
        ip = ipaddress.ip_address(candidate.strip())
    except (AttributeError, ValueError):
        return False

    for entry in allowlist:
        try:
            network = ipaddress.ip_network(entry, strict=False)
        except ValueError:
            continue
        if ip.version != network.version:
            continue
        if ip in network:
            return True
    return False
