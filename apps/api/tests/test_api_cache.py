"""Tests del decorador ``cached`` con TTL y LRU."""

from __future__ import annotations

import time

import pytest

from atlashabita.interfaces.api.cache import cached


def test_cached_devuelve_el_valor_memoizado() -> None:
    calls = {"count": 0}

    @cached(ttl_seconds=60.0, maxsize=8)
    def fibo(value: int) -> int:
        calls["count"] += 1
        return value * 2

    assert fibo(3) == 6
    assert fibo(3) == 6
    assert calls["count"] == 1
    assert fibo(4) == 8
    assert calls["count"] == 2


def test_cached_respeta_ttl() -> None:
    calls = {"count": 0}

    @cached(ttl_seconds=0.05, maxsize=4)
    def expensive(value: int) -> int:
        calls["count"] += 1
        return value

    expensive(1)
    expensive(1)
    assert calls["count"] == 1
    time.sleep(0.1)
    expensive(1)
    assert calls["count"] == 2


def test_cached_aplica_lru_al_llegar_al_maxsize() -> None:
    calls = {"count": 0}

    @cached(ttl_seconds=60.0, maxsize=2)
    def square(value: int) -> int:
        calls["count"] += 1
        return value * value

    square(1)
    square(2)
    square(3)  # expulsa 1
    square(1)  # recalcula
    assert calls["count"] == 4
    info = square.cache_info()  # type: ignore[attr-defined]
    assert info["hits"] + info["misses"] > 0


def test_cached_cache_clear_resetea_el_estado() -> None:
    calls = {"count": 0}

    @cached(ttl_seconds=60.0, maxsize=2)
    def identity(value: int) -> int:
        calls["count"] += 1
        return value

    identity(1)
    identity(1)
    assert calls["count"] == 1
    identity.cache_clear()  # type: ignore[attr-defined]
    identity(1)
    assert calls["count"] == 2


def test_cached_rechaza_parametros_invalidos() -> None:
    with pytest.raises(ValueError):

        @cached(ttl_seconds=0.0, maxsize=0)
        def _bad() -> int:
            return 0


def test_cached_soporta_kwargs_como_parte_de_la_clave() -> None:
    calls = {"count": 0}

    @cached(ttl_seconds=60.0, maxsize=4)
    def build(label: str, repeat: int = 1) -> str:
        calls["count"] += 1
        return label * repeat

    assert build("a", repeat=2) == "aa"
    assert build("a", repeat=2) == "aa"
    assert build("a", repeat=3) == "aaa"
    assert calls["count"] == 2
