"""Cliente HTTP común para los conectores de ingesta.

Centraliza tres preocupaciones transversales para que cada conector de fuente
no las reimplemente:

1. **Modo offline por defecto**: cuando ``ATLASHABITA_INGESTION_ONLINE`` no
   esté activado, el cliente sirve el fichero cacheado bajo ``data/raw`` o el
   ``fixture_path`` explícito. Esto garantiza tests deterministas sin red.
2. **Reintentos con retroceso exponencial** vía ``tenacity`` para tolerar
   fallos transitorios de las APIs oficiales.
3. **Integridad por SHA-256**: cada descarga se almacena acompañada de su
   ``checksum`` y el mismo ``Downloader`` valida el contenido al leer.

El cliente es ``stateless`` salvo por su directorio cache; pensado para ser
compartido entre conectores a través de inyección explícita.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import httpx
from tenacity import (
    RetryError,
    Retrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

_ENV_ONLINE = "ATLASHABITA_INGESTION_ONLINE"


class _HasGet(Protocol):  # pragma: no cover — interfaz estructural.
    def get(self, url: str, *, timeout: float | None = None) -> httpx.Response: ...


@dataclass(frozen=True, slots=True)
class DownloadedPayload:
    """Representa la respuesta binaria y su checksum asociado."""

    url: str
    path: Path
    sha256: str
    from_cache: bool

    def read_bytes(self) -> bytes:
        return self.path.read_bytes()

    def read_text(self, encoding: str = "utf-8") -> str:
        return self.path.read_text(encoding=encoding)


class IntegrityError(RuntimeError):
    """Se lanza cuando el contenido cacheado no coincide con el checksum."""


class OfflineResourceMissingError(FileNotFoundError):
    """Se lanza cuando el modo offline no encuentra el fichero cacheado."""


class Downloader:
    """Cliente HTTP reutilizable con cache, reintentos y checksum.

    Args:
        cache_dir: raíz donde se guardan los ficheros descargados. Debe existir
            o ser creado por el caller; el downloader no intentará crearlo por
            sí solo hasta la primera escritura.
        client_factory: callable que construye un cliente HTTP para poder
            inyectar ``httpx.MockTransport`` en tests.
        timeout: segundos máximos por intento.
        max_attempts: número de intentos antes de fallar definitivamente.
    """

    def __init__(
        self,
        cache_dir: Path,
        *,
        client_factory: type[httpx.Client] = httpx.Client,
        timeout: float = 30.0,
        max_attempts: int = 3,
    ) -> None:
        self._cache_dir = cache_dir
        self._client_factory = client_factory
        self._timeout = timeout
        self._max_attempts = max(1, max_attempts)

    @property
    def cache_dir(self) -> Path:
        return self._cache_dir

    @staticmethod
    def online_enabled() -> bool:
        """Indica si el modo online está habilitado por variable de entorno."""
        return os.environ.get(_ENV_ONLINE, "0").strip().lower() in {"1", "true", "yes"}

    def fetch(
        self,
        url: str,
        *,
        filename: str,
        fixture_path: Path | None = None,
    ) -> DownloadedPayload:
        """Obtiene ``url`` respetando el modo offline.

        Resolución en orden:

        1. Si existe un fichero en ``cache_dir/filename`` se usa (modo offline o
           online, siempre se prioriza la cache local).
        2. Si no hay cache y el modo online está desactivado pero hay
           ``fixture_path``, se sirve ese fichero y se considera ``from_cache``.
        3. Si el modo online está habilitado, se descarga vía HTTP con
           reintentos y se escribe en la cache.
        4. En cualquier otro caso se lanza :class:`OfflineResourceMissingError`.
        """
        target = self._cache_dir / filename
        if target.exists():
            sha = _sha256(target.read_bytes())
            return DownloadedPayload(url=url, path=target, sha256=sha, from_cache=True)

        if not self.online_enabled():
            if fixture_path is not None and fixture_path.exists():
                return self._materialize_from_fixture(url, fixture_path, target)
            raise OfflineResourceMissingError(
                f"No hay cache ni fixture para {url!r} (modo offline activo)."
            )

        return self._download_with_retry(url, target)

    def verify(self, payload: DownloadedPayload, *, expected_sha256: str) -> None:
        """Verifica que ``payload`` coincide con el hash esperado."""
        if payload.sha256 != expected_sha256:
            raise IntegrityError(
                f"SHA-256 inválido para {payload.url!r}: "
                f"esperado {expected_sha256!r}, obtenido {payload.sha256!r}."
            )

    # ------------------------------------------------------------------
    # Internos
    # ------------------------------------------------------------------

    def _materialize_from_fixture(
        self, url: str, fixture_path: Path, target: Path
    ) -> DownloadedPayload:
        content = fixture_path.read_bytes()
        self._write_cached(target, content)
        return DownloadedPayload(
            url=url,
            path=target,
            sha256=_sha256(content),
            from_cache=True,
        )

    def _download_with_retry(self, url: str, target: Path) -> DownloadedPayload:
        retrying = Retrying(
            stop=stop_after_attempt(self._max_attempts),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=5.0),
            retry=retry_if_exception_type((httpx.HTTPError,)),
            reraise=True,
        )
        try:
            content = retrying(self._do_download, url)
        except RetryError as exc:  # pragma: no cover — Retrying reraise=True.
            raise httpx.HTTPError(str(exc)) from exc
        self._write_cached(target, content)
        return DownloadedPayload(
            url=url,
            path=target,
            sha256=_sha256(content),
            from_cache=False,
        )

    def _do_download(self, url: str) -> bytes:
        with self._client_factory(timeout=self._timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.content

    def _write_cached(self, target: Path, content: bytes) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)


def _sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


__all__ = [
    "DownloadedPayload",
    "Downloader",
    "IntegrityError",
    "OfflineResourceMissingError",
]
