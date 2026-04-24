"""Pruebas del cliente HTTP compartido (cache, reintentos, checksum)."""

from __future__ import annotations

import hashlib
from pathlib import Path

import httpx
import pytest

from atlashabita.infrastructure.ingestion.downloader import (
    Downloader,
    IntegrityError,
    OfflineResourceMissingError,
)


def _client_factory_from_transport(
    transport: httpx.MockTransport,
) -> type[httpx.Client]:
    class _Client(httpx.Client):
        def __init__(self, *, timeout: float, follow_redirects: bool) -> None:
            super().__init__(
                transport=transport,
                timeout=timeout,
                follow_redirects=follow_redirects,
            )

    return _Client


def test_fetch_usa_fixture_en_modo_offline(tmp_path: Path) -> None:
    fixture = tmp_path / "fixture.json"
    fixture.write_bytes(b'{"ok": true}')
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    downloader = Downloader(cache_dir=cache_dir)

    payload = downloader.fetch(
        "https://example.com/fake",
        filename="source.json",
        fixture_path=fixture,
    )
    assert payload.from_cache is True
    assert payload.path.read_bytes() == b'{"ok": true}'
    assert payload.sha256 == hashlib.sha256(b'{"ok": true}').hexdigest()
    # Segunda llamada sirve la cache ya materializada sin fixture.
    payload2 = downloader.fetch(
        "https://example.com/fake",
        filename="source.json",
        fixture_path=tmp_path / "no-existe.json",
    )
    assert payload2.from_cache is True
    assert payload2.sha256 == payload.sha256


def test_fetch_offline_sin_fixture_lanza(tmp_path: Path) -> None:
    downloader = Downloader(cache_dir=tmp_path / "cache")
    with pytest.raises(OfflineResourceMissingError):
        downloader.fetch(
            "https://example.com/missing",
            filename="ghost.json",
            fixture_path=tmp_path / "no-hay.json",
        )


def test_fetch_reintenta_hasta_exito(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        if len(attempts) < 3:
            raise httpx.ConnectError("boom", request=request)
        return httpx.Response(200, content=b"hola")

    transport = httpx.MockTransport(handler)
    monkeypatch.setenv("ATLASHABITA_INGESTION_ONLINE", "1")
    downloader = Downloader(
        cache_dir=tmp_path / "cache",
        client_factory=_client_factory_from_transport(transport),
        max_attempts=3,
        timeout=1.0,
    )
    payload = downloader.fetch(
        "https://example.com/ok",
        filename="ok.txt",
    )
    assert payload.read_bytes() == b"hola"
    assert len(attempts) == 3
    assert payload.from_cache is False


def test_fetch_falla_tras_maximos_reintentos(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("nope", request=request)

    monkeypatch.setenv("ATLASHABITA_INGESTION_ONLINE", "1")
    downloader = Downloader(
        cache_dir=tmp_path / "cache",
        client_factory=_client_factory_from_transport(httpx.MockTransport(handler)),
        max_attempts=2,
        timeout=0.5,
    )
    with pytest.raises(httpx.HTTPError):
        downloader.fetch("https://example.com/fail", filename="fail.txt")


def test_verify_rechaza_checksum_incorrecto(tmp_path: Path) -> None:
    fixture = tmp_path / "fx.json"
    fixture.write_bytes(b"abcd")
    downloader = Downloader(cache_dir=tmp_path / "cache")
    payload = downloader.fetch(
        "https://example.com/a",
        filename="a.json",
        fixture_path=fixture,
    )
    with pytest.raises(IntegrityError):
        downloader.verify(payload, expected_sha256="0" * 64)
    downloader.verify(payload, expected_sha256=payload.sha256)


def test_online_enabled_respeta_variable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ATLASHABITA_INGESTION_ONLINE", raising=False)
    assert Downloader.online_enabled() is False
    monkeypatch.setenv("ATLASHABITA_INGESTION_ONLINE", "1")
    assert Downloader.online_enabled() is True
    monkeypatch.setenv("ATLASHABITA_INGESTION_ONLINE", "yes")
    assert Downloader.online_enabled() is True
    monkeypatch.setenv("ATLASHABITA_INGESTION_ONLINE", "0")
    assert Downloader.online_enabled() is False
