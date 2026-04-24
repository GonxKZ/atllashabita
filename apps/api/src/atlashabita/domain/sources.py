"""Modelo de fuentes de datos y procedencia."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class DataSource:
    """Fuente oficial o abierta que alimenta uno o varios indicadores."""

    id: str
    title: str
    publisher: str
    url: str
    license: str
    periodicity: str
    description: str = ""
    coverage: str = "ES"
    last_ingested: str | None = None
    checksum: str | None = None
    indicators: tuple[str, ...] = field(default_factory=tuple)
    quality: str = "ok"
