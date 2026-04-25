"""Cache utilitaria con expiración.

Ofrece un decorador ``cached`` tipado genéricamente para envolver funciones con
argumentos hashables. La caché combina LRU con TTL para evitar devolver datos
rancios sin recalcular constantemente. Es intencionadamente minimalista: para
estados compartidos entre procesos se debe usar un backend externo.
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Hashable
from functools import wraps
from typing import Any, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


class _TTLCache:
    """Implementación interna de cache LRU con expiración por entrada."""

    __slots__ = ("_items", "_lock", "_maxsize", "_ttl", "hits", "misses")

    def __init__(self, maxsize: int, ttl_seconds: float) -> None:
        if maxsize < 1:
            raise ValueError("maxsize debe ser >= 1")
        if ttl_seconds < 0:
            raise ValueError("ttl_seconds no puede ser negativo")
        self._maxsize = maxsize
        self._ttl = ttl_seconds
        self._items: OrderedDict[Hashable, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: Hashable) -> tuple[bool, Any]:
        now = time.monotonic()
        with self._lock:
            entry = self._items.get(key)
            if entry is None:
                self.misses += 1
                return False, None
            expires_at, value = entry
            if self._ttl > 0 and expires_at <= now:
                self._items.pop(key, None)
                self.misses += 1
                return False, None
            self._items.move_to_end(key)
            self.hits += 1
            return True, value

    def set(self, key: Hashable, value: Any) -> None:
        now = time.monotonic()
        expires_at = now + self._ttl if self._ttl > 0 else float("inf")
        with self._lock:
            if key in self._items:
                self._items.move_to_end(key)
            self._items[key] = (expires_at, value)
            while len(self._items) > self._maxsize:
                self._items.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
            self.hits = 0
            self.misses = 0


class _CachedCallable:
    """Wrapper que expone introspección sobre una función cacheada."""

    __slots__ = ("_cache", "_func")

    def __init__(self, func: Callable[..., Any], cache: _TTLCache) -> None:
        self._func = func
        self._cache = cache

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        key = _make_key(args, kwargs)
        found, value = self._cache.get(key)
        if found:
            return value
        result = self._func(*args, **kwargs)
        self._cache.set(key, result)
        return result

    def cache_clear(self) -> None:
        self._cache.clear()

    def cache_info(self) -> dict[str, int]:
        return {"hits": self._cache.hits, "misses": self._cache.misses}


def cached(
    *, ttl_seconds: float = 60.0, maxsize: int = 128
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Devuelve un decorador que aplica LRU + TTL sobre ``func``.

    Ejemplo::

        @cached(ttl_seconds=300.0, maxsize=64)
        def resolve_dataset(settings: Settings) -> SeedDataset:
            ...
    """

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        cache = _TTLCache(maxsize=maxsize, ttl_seconds=ttl_seconds)
        wrapper = _CachedCallable(func, cache)

        @wraps(func)
        def inner(*args: P.args, **kwargs: P.kwargs) -> R:
            return wrapper(*args, **kwargs)  # type: ignore[no-any-return]

        inner.cache_clear = wrapper.cache_clear  # type: ignore[attr-defined]
        inner.cache_info = wrapper.cache_info  # type: ignore[attr-defined]
        return inner

    return decorator


def _make_key(args: tuple[Any, ...], kwargs: dict[str, Any]) -> Hashable:
    """Construye una clave hashable a partir de argumentos de llamada.

    El formato siempre es ``(args, frozen_kwargs)`` para que dos llamadas con
    la misma firma produzcan la misma clave aunque los kwargs lleguen vacíos
    (antes ``args`` y ``(args, ())`` podían convivir en la cache provocando
    misses falsos).

    Si algún argumento no es hashable (``dict``, ``list``...), se eleva
    ``TypeError`` con un mensaje explícito que identifica el primer culpable
    en lugar de propagar el ``TypeError`` opaco que generaría más tarde el
    ``OrderedDict`` interno.
    """
    frozen_kwargs: tuple[tuple[str, Any], ...] = tuple(sorted(kwargs.items())) if kwargs else ()
    candidate: tuple[tuple[Any, ...], tuple[tuple[str, Any], ...]] = (args, frozen_kwargs)
    try:
        hash(candidate)
    except TypeError as exc:  # pragma: no cover — defensivo, branchea según runtime
        raise TypeError(
            "cached() requiere argumentos hashables; revisa los parámetros pasados"
            f" a la función cacheada (args={args!r}, kwargs={kwargs!r})."
        ) from exc
    return candidate


__all__ = ["cached"]
