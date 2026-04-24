"""Configuración de logging estructurado basado en structlog.

Se emite JSON en producción para facilitar la ingesta por herramientas externas
y un render legible durante el desarrollo. El objetivo es que cada log lleve
contexto (request_id, caso de uso, versión de datos) sin acoplar la capa de
dominio al framework HTTP.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog


def configure_logging(*, env: str, level: str = "INFO") -> None:
    """Inicializa structlog y el logging estándar una sola vez."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(level=log_level, stream=sys.stdout, format="%(message)s")

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
    ]

    renderer: structlog.types.Processor
    if env.lower() in {"development", "test"}:
        renderer = structlog.dev.ConsoleRenderer(colors=sys.stdout.isatty())
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None, **initial: Any) -> structlog.stdlib.BoundLogger:
    """Devuelve un logger con contexto inicial."""
    logger = structlog.get_logger(name)
    if initial:
        logger = logger.bind(**initial)
    return logger
