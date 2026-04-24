"""Middlewares HTTP: cabeceras de seguridad y rate limiting básico.

El objetivo es aplicar una primera línea de defensa estándar sin depender de
un gateway externo. El rate limiter está implementado en memoria por simplicidad;
para producción debe reemplazarse por un store compartido (Redis, etc.).
"""

from __future__ import annotations

import time
from collections import OrderedDict, deque
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
    """Rate limit por IP con ventana deslizante y LRU acotada.

    Se aplica una segunda barrera: además de caducar marcas antiguas dentro
    de cada bucket, la tabla global de buckets se acota con un
    ``OrderedDict`` y expulsa el menos usado cuando se alcanza
    ``max_buckets``. Así se mitiga un ataque que generase millones de IPs
    distintas para agotar memoria.
    """

    _DEFAULT_MAX_BUCKETS: Final[int] = 10_000

    def __init__(
        self,
        app: ASGIApp,
        *,
        requests_per_minute: int = 60,
        window_seconds: float = 60.0,
        max_buckets: int | None = None,
    ) -> None:
        super().__init__(app)
        if requests_per_minute < 1:
            raise ValueError("requests_per_minute debe ser >= 1")
        if window_seconds <= 0:
            raise ValueError("window_seconds debe ser > 0")
        limit_value = max_buckets if max_buckets is not None else self._DEFAULT_MAX_BUCKETS
        if limit_value < 1:
            raise ValueError("max_buckets debe ser >= 1")
        self._limit = requests_per_minute
        self._window = window_seconds
        self._max_buckets = limit_value
        self._buckets: OrderedDict[str, _Bucket] = OrderedDict()

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        client_ip = self._client_ip(request)
        now = time.monotonic()
        bucket = self._touch_bucket(client_ip)
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

    def _touch_bucket(self, client_ip: str) -> _Bucket:
        """Obtiene el bucket del cliente y lo marca como el usado más recientemente."""
        bucket = self._buckets.get(client_ip)
        if bucket is None:
            bucket = _Bucket()
            self._buckets[client_ip] = bucket
            if len(self._buckets) > self._max_buckets:
                self._buckets.popitem(last=False)
        else:
            self._buckets.move_to_end(client_ip, last=True)
        return bucket

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
