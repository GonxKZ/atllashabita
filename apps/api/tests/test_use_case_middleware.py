"""Pruebas del middleware ASGI de contexto de request."""

from __future__ import annotations

from collections.abc import Awaitable, Callable, MutableMapping
from typing import Any

import pytest

from atlashabita.observability.middleware import RequestContextMiddleware

_Scope = MutableMapping[str, Any]
_Message = MutableMapping[str, Any]


async def _dummy_app(
    scope: _Scope,
    receive: Callable[[], Awaitable[_Message]],
    send: Callable[[_Message], Awaitable[None]],
) -> None:
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok", "more_body": False})


@pytest.mark.asyncio
async def test_middleware_agrega_header_x_request_id() -> None:
    mw = RequestContextMiddleware(_dummy_app)
    messages: list[_Message] = []

    async def send(message: _Message) -> None:
        messages.append(message)

    async def receive() -> _Message:
        return {"type": "http.request", "body": b""}

    scope: _Scope = {"type": "http", "headers": []}
    await mw(scope, receive, send)

    start = next(message for message in messages if message["type"] == "http.response.start")
    headers = dict(start["headers"])
    assert b"x-request-id" in headers
    assert len(headers[b"x-request-id"]) > 0


@pytest.mark.asyncio
async def test_middleware_preserva_request_id_entrante() -> None:
    mw = RequestContextMiddleware(_dummy_app)
    messages: list[_Message] = []

    async def send(message: _Message) -> None:
        messages.append(message)

    async def receive() -> _Message:
        return {"type": "http.request", "body": b""}

    scope: _Scope = {
        "type": "http",
        "headers": [(b"x-request-id", b"deadbeef")],
    }
    await mw(scope, receive, send)

    start = next(message for message in messages if message["type"] == "http.response.start")
    headers = dict(start["headers"])
    assert headers[b"x-request-id"] == b"deadbeef"


@pytest.mark.asyncio
async def test_middleware_ignora_scope_no_http() -> None:
    mw = RequestContextMiddleware(_dummy_app)

    async def send(_: _Message) -> None:
        return None

    async def receive() -> _Message:
        return {"type": "lifespan.startup"}

    scope: _Scope = {"type": "lifespan"}
    await mw(scope, receive, send)  # no explota
