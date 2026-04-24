"""Dependencias FastAPI reutilizables.

Mantener las dependencias en un módulo separado evita que los routers toquen
``app.state`` directamente. Además permite sustituirlas con ``app.dependency_overrides``
en pruebas sin necesidad de monkeypatching global.
"""

from __future__ import annotations

from fastapi import Request

from atlashabita.application.container import Container
from atlashabita.config import Settings


def get_container(request: Request) -> Container:
    """Devuelve el ``Container`` construido en el ``lifespan`` de la app."""
    container = getattr(request.app.state, "container", None)
    if container is None:
        raise RuntimeError(
            "Container no inicializado: comprueba que ``create_app`` haya configurado "
            "``app.state.container`` durante el lifespan."
        )
    assert isinstance(container, Container)
    return container


def get_settings(request: Request) -> Settings:
    """Devuelve la configuración activa asociada a la aplicación."""
    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        raise RuntimeError("Settings no inicializados en la aplicación.")
    assert isinstance(settings, Settings)
    return settings


__all__ = ["get_container", "get_settings"]
