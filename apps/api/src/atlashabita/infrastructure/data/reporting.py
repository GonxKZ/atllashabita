"""Serialización de :class:`QualityReport` a disco en la zona ``reports``."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path

from atlashabita.config import Settings
from atlashabita.infrastructure.data.quality_gates import QualityReport

_SAFE_NAME = re.compile(r"[^a-z0-9_-]+")


def write_quality_report(report: QualityReport, settings: Settings, name: str) -> Path:
    """Escribe el informe como JSON UTF-8 y devuelve la ruta creada.

    El nombre se sanea para evitar rutas relativas inesperadas; el timestamp
    se añade en formato compacto ``YYYYMMDDTHHMMSSZ`` para que los ficheros
    ordenen cronológicamente y no se sobrescriban entre ejecuciones.
    """
    safe_name = _sanitize_name(name)
    reports_dir = settings.data_zone("reports")
    reports_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(tz=UTC).strftime("%Y%m%dT%H%M%SZ")
    destination = reports_dir / f"{safe_name}_{timestamp}.json"
    payload = json.dumps(report.to_dict(), ensure_ascii=False, indent=2, sort_keys=True)
    destination.write_text(payload, encoding="utf-8")
    return destination


def _sanitize_name(name: str) -> str:
    """Devuelve un nombre de fichero seguro: minúsculas, ``[a-z0-9_-]``."""
    if not name.strip():
        raise ValueError("El nombre del informe no puede estar vacío.")
    candidate = _SAFE_NAME.sub("-", name.strip().lower()).strip("-")
    if not candidate:
        raise ValueError(f"Nombre de informe no serializable: {name!r}")
    return candidate
