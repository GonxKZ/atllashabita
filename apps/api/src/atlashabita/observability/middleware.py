"""Middleware ASGI para trazabilidad de peticiones.

Cada petición HTTP recibe un ``request_id`` propio que se inyecta en el
contexto de ``structlog`` y se devuelve al cliente mediante el header
``X-Request-ID``. Esto habilita observabilidad end-to-end sin acoplar la
capa de dominio al framework.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, MutableMapping
from typing import Any
from uuid import uuid4

import structlog

_REQUEST_ID_HEADER = b"x-request-id"
_REQUEST_ID_HEADER_STR = "X-Request-ID"

_Scope = MutableMapping[str, Any]
_Message = MutableMapping[str, Any]
_Receive = Callable[[], Awaitable[_Message]]
_Send = Callable[[_Message], Awaitable[None]]
_ASGIApp = Callable[[_Scope, _Receive, _Send], Awaitable[None]]


class RequestContextMiddleware:
    """Middleware ASGI que asigna ``request_id`` a cada petición HTTP.

    Si el cliente envía ``X-Request-ID`` se preserva; en caso contrario se
    genera uno nuevo con ``uuid4().hex``. El identificador se expone en el
    contexto de structlog y se devuelve al cliente como header.
    """

    def __init__(self, app: _ASGIApp) -> None:
        self._app = app

    async def __call__(self, scope: _Scope, receive: _Receive, send: _Send) -> None:
        if scope.get("type") != "http":
            await self._app(scope, receive, send)
            return

        request_id = _extract_or_create_request_id(scope)
        structlog.contextvars.bind_contextvars(request_id=request_id)

        async def send_with_request_id(message: _Message) -> None:
            if message.get("type") == "http.response.start":
                headers = list(message.get("headers", []))
                headers = [
                    (name, value) for (name, value) in headers if name.lower() != _REQUEST_ID_HEADER
                ]
                headers.append((_REQUEST_ID_HEADER, request_id.encode("latin-1")))
                message["headers"] = headers
            await send(message)

        try:
            await self._app(scope, receive, send_with_request_id)
        finally:
            structlog.contextvars.unbind_contextvars("request_id")


def _extract_or_create_request_id(scope: _Scope) -> str:
    for name, value in scope.get("headers", []):
        if name.lower() == _REQUEST_ID_HEADER:
            decoded = value.decode("latin-1").strip()
            if decoded:
                return decoded
    return uuid4().hex


__all__ = ["_REQUEST_ID_HEADER_STR", "RequestContextMiddleware"]
