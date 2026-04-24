"""Helpers de sondeo y binding de contexto de request para structlog.

Este módulo es *complementario* al middleware HTTP: expone funciones puras
para generar identificadores de request, adjuntar contexto al logger y limpiar
el estado al final del ciclo. La intención es que cualquier capa (CLI,
workers, tareas programadas, tests) pueda enriquecer los logs con la misma
semántica que usa la API, sin depender de Starlette.

La integración con structlog se hace mediante :mod:`structlog.contextvars`,
que ya está configurado en :func:`atlashabita.observability.logging.configure_logging`.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator, Mapping
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any

import structlog

_REQUEST_ID_HEADER = "x-request-id"
_CURRENT_REQUEST_ID: ContextVar[str | None] = ContextVar("atlashabita_request_id", default=None)


def generate_request_id() -> str:
    """Crea un identificador opaco y único por request.

    Se usa UUID4 (128 bits de entropía) y se formatea como cadena hexadecimal
    sin guiones para facilitar búsqueda en sistemas de logs tolerantes a
    tokens cortos.
    """
    return uuid.uuid4().hex


def extract_request_id(headers: Mapping[str, str] | None) -> str:
    """Obtiene el ``X-Request-ID`` de los headers o genera uno nuevo.

    Se comprueba la cabecera de forma case-insensitive y se valida que el
    valor entrante sea razonable (<=128 caracteres, ASCII imprimible) para
    evitar que un cliente malicioso contamine los logs con caracteres de
    control o payloads gigantes.
    """
    if not headers:
        return generate_request_id()

    for key, value in headers.items():
        if key.lower() != _REQUEST_ID_HEADER:
            continue
        candidate = str(value).strip()
        if 0 < len(candidate) <= 128 and candidate.isprintable():
            return candidate
        break
    return generate_request_id()


def bind_request_context(**context: Any) -> str:
    """Vincula ``request_id`` (y contexto extra) al logger estructurado.

    Devuelve el ``request_id`` efectivo (ya sea el que se ha pasado como
    argumento o uno generado). Si el llamador ya tiene un id activo, se
    reutiliza para evitar dobles contadores en middlewares anidados.
    """
    request_id = (
        context.pop("request_id", None) or _CURRENT_REQUEST_ID.get() or generate_request_id()
    )
    _CURRENT_REQUEST_ID.set(request_id)

    structlog.contextvars.bind_contextvars(request_id=request_id, **context)
    return request_id


def clear_request_context() -> None:
    """Limpia el contexto tras finalizar el request."""
    _CURRENT_REQUEST_ID.set(None)
    structlog.contextvars.clear_contextvars()


def current_request_id() -> str | None:
    """Devuelve el ``request_id`` del contexto actual, si existe."""
    return _CURRENT_REQUEST_ID.get()


@contextmanager
def request_context(**context: Any) -> Iterator[str]:
    """Context manager que enlaza y desenlaza contexto de request.

    Útil en tests, scripts y workers:

    >>> with request_context(use_case="score_territory") as rid:
    ...     ...  # logging enriquecido con rid

    El contexto previo se restablece al salir, incluso si el bloque levanta.
    """
    previous = _CURRENT_REQUEST_ID.get()
    request_id = context.pop("request_id", None) or previous or generate_request_id()
    merged: dict[str, Any] = {"request_id": request_id, **context}
    with structlog.contextvars.bound_contextvars(**merged):
        token = _CURRENT_REQUEST_ID.set(request_id)
        try:
            yield request_id
        finally:
            _CURRENT_REQUEST_ID.reset(token)
