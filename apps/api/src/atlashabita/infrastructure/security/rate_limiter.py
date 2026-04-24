"""Limitador por token bucket seguro ante concurrencia.

Exponemos dos variantes para cubrir los dos modos de ejecución del backend:

* :class:`TokenBucket` — usa ``threading.Lock`` y es ideal para middlewares
  síncronos, tareas programadas y tests unitarios deterministas.
* :class:`AsyncTokenBucket` — usa ``asyncio.Lock`` y no toca el GIL más de lo
  necesario; pensado para integrarse en dependencias asíncronas de FastAPI.

Ambas variantes comparten el algoritmo clásico de token bucket:

1. Se asignan ``capacity`` tokens al crear el bucket.
2. Se rellenan ``refill_per_second`` tokens por segundo hasta ``capacity``.
3. ``acquire(key)`` resta un token del bucket asociado a ``key`` si hay stock;
   devuelve ``False`` si no hay tokens, de modo que el caller pueda responder
   con ``HTTP 429 Too Many Requests`` sin levantar una excepción.

El estado se almacena en memoria, pensado para despliegues monolíticos; para
despliegues horizontales conviene migrar a Redis o a un ``SlidingWindow``
centralizado, manteniendo esta interfaz.
"""

from __future__ import annotations

import asyncio
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass


def _validate_params(capacity: int, refill_per_second: float) -> None:
    if capacity <= 0:
        raise ValueError("capacity debe ser mayor que 0")
    if refill_per_second <= 0:
        raise ValueError("refill_per_second debe ser mayor que 0")


@dataclass(slots=True)
class _BucketState:
    """Estado mutable de un bucket individual."""

    tokens: float
    updated_at: float


class TokenBucket:
    """Token bucket síncrono y thread-safe.

    Los buckets por ``key`` se crean perezosamente y se guardan en memoria. La
    función :func:`time.monotonic` se inyecta como ``clock`` para poder
    escribir tests deterministas sin monkeypatching global.
    """

    def __init__(
        self,
        capacity: int,
        refill_per_second: float,
        *,
        clock: Callable[[], float] | None = None,
    ) -> None:
        _validate_params(capacity, refill_per_second)
        self._capacity = float(capacity)
        self._refill = float(refill_per_second)
        self._clock = clock or time.monotonic
        self._lock = threading.Lock()
        self._buckets: dict[str, _BucketState] = {}

    @property
    def capacity(self) -> int:
        return int(self._capacity)

    @property
    def refill_per_second(self) -> float:
        return self._refill

    def available_tokens(self, key: str) -> float:
        """Devuelve los tokens disponibles tras aplicar el refill."""
        with self._lock:
            bucket = self._get_or_create(key)
            self._refill_locked(bucket)
            return bucket.tokens

    def acquire(self, key: str, *, cost: float = 1.0) -> bool:
        """Intenta consumir ``cost`` tokens del bucket asociado a ``key``."""
        if cost <= 0:
            raise ValueError("cost debe ser mayor que 0")
        with self._lock:
            bucket = self._get_or_create(key)
            self._refill_locked(bucket)
            if bucket.tokens + 1e-9 < cost:
                return False
            bucket.tokens -= cost
            return True

    def reset(self, key: str | None = None) -> None:
        """Elimina el estado almacenado (útil en tests)."""
        with self._lock:
            if key is None:
                self._buckets.clear()
            else:
                self._buckets.pop(key, None)

    def _get_or_create(self, key: str) -> _BucketState:
        bucket = self._buckets.get(key)
        if bucket is None:
            bucket = _BucketState(tokens=self._capacity, updated_at=self._clock())
            self._buckets[key] = bucket
        return bucket

    def _refill_locked(self, bucket: _BucketState) -> None:
        now = self._clock()
        elapsed = max(0.0, now - bucket.updated_at)
        if elapsed > 0:
            bucket.tokens = min(self._capacity, bucket.tokens + elapsed * self._refill)
            bucket.updated_at = now


class AsyncTokenBucket:
    """Variante asíncrona con la misma semántica que :class:`TokenBucket`."""

    def __init__(
        self,
        capacity: int,
        refill_per_second: float,
        *,
        clock: Callable[[], float] | None = None,
    ) -> None:
        _validate_params(capacity, refill_per_second)
        self._capacity = float(capacity)
        self._refill = float(refill_per_second)
        self._clock = clock or time.monotonic
        self._lock = asyncio.Lock()
        self._buckets: dict[str, _BucketState] = {}

    @property
    def capacity(self) -> int:
        return int(self._capacity)

    @property
    def refill_per_second(self) -> float:
        return self._refill

    async def available_tokens(self, key: str) -> float:
        async with self._lock:
            bucket = self._get_or_create(key)
            self._refill_locked(bucket)
            return bucket.tokens

    async def acquire(self, key: str, *, cost: float = 1.0) -> bool:
        if cost <= 0:
            raise ValueError("cost debe ser mayor que 0")
        async with self._lock:
            bucket = self._get_or_create(key)
            self._refill_locked(bucket)
            if bucket.tokens + 1e-9 < cost:
                return False
            bucket.tokens -= cost
            return True

    async def reset(self, key: str | None = None) -> None:
        async with self._lock:
            if key is None:
                self._buckets.clear()
            else:
                self._buckets.pop(key, None)

    def _get_or_create(self, key: str) -> _BucketState:
        bucket = self._buckets.get(key)
        if bucket is None:
            bucket = _BucketState(tokens=self._capacity, updated_at=self._clock())
            self._buckets[key] = bucket
        return bucket

    def _refill_locked(self, bucket: _BucketState) -> None:
        now = self._clock()
        elapsed = max(0.0, now - bucket.updated_at)
        if elapsed > 0:
            bucket.tokens = min(self._capacity, bucket.tokens + elapsed * self._refill)
            bucket.updated_at = now
