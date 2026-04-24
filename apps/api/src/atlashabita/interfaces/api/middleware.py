"""Middlewares HTTP: cabeceras de seguridad y rate limiting básico.

El objetivo es aplicar una primera línea de defensa estándar sin depender de
un gateway externo. El rate limiter está implementado en memoria por simplicidad;
para producción debe reemplazarse por un store compartido (Redis, etc.).
"""

from __future__ import annotations

import time
from collections import deque
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass, field
from typing import Final

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

_DEFAULT_SECURITY_HEADERS: Final[Mapping[str, str]] = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": (
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
        "magnetometer=(), microphone=(), payment=(), usb=()"
    ),
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Frame-Options": "DENY",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inyecta cabeceras de seguridad en todas las respuestas."""

    def __init__(self, app: ASGIApp, *, extra_headers: Mapping[str, str] | None = None) -> None:
        super().__init__(app)
        merged = dict(_DEFAULT_SECURITY_HEADERS)
        if extra_headers:
            merged.update(extra_headers)
        self._headers = merged

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        for name, value in self._headers.items():
            response.headers.setdefault(name, value)
        return response


@dataclass(slots=True)
class _Bucket:
    """Ventana deslizante de timestamps para un cliente identificado por IP."""

    hits: deque[float] = field(default_factory=deque)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limit simple por IP basado en ventana deslizante en memoria."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        requests_per_minute: int = 60,
        window_seconds: float = 60.0,
    ) -> None:
        super().__init__(app)
        if requests_per_minute < 1:
            raise ValueError("requests_per_minute debe ser >= 1")
        if window_seconds <= 0:
            raise ValueError("window_seconds debe ser > 0")
        self._limit = requests_per_minute
        self._window = window_seconds
        self._buckets: dict[str, _Bucket] = {}

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        client_ip = self._client_ip(request)
        now = time.monotonic()
        bucket = self._buckets.setdefault(client_ip, _Bucket())
        self._evict_old(bucket, now)
        if len(bucket.hits) >= self._limit:
            retry_after = max(1, int(self._window - (now - bucket.hits[0])))
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMITED",
                    "message": "Demasiadas peticiones, intente de nuevo más tarde.",
                    "details": {"retry_after_seconds": retry_after},
                },
                headers={"Retry-After": str(retry_after)},
            )
        bucket.hits.append(now)
        response = await call_next(request)
        remaining = max(0, self._limit - len(bucket.hits))
        response.headers.setdefault("X-RateLimit-Limit", str(self._limit))
        response.headers.setdefault("X-RateLimit-Remaining", str(remaining))
        return response

    def _evict_old(self, bucket: _Bucket, now: float) -> None:
        threshold = now - self._window
        while bucket.hits and bucket.hits[0] < threshold:
            bucket.hits.popleft()

    @staticmethod
    def _client_ip(request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client is not None:
            return request.client.host
        return "anonymous"


__all__ = ["RateLimitMiddleware", "SecurityHeadersMiddleware"]
