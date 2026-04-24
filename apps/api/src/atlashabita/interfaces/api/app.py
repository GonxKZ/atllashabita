"""Factory de la aplicación FastAPI.

Separar la creación en una función evita acoplar el punto de entrada a una
instancia global. Facilita inyectar configuración distinta en tests y permite
levantar varios entornos (docs, integración) desde el mismo código.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from atlashabita.application.container import Container
from atlashabita.config import Settings, get_settings
from atlashabita.interfaces.api.middleware import (
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from atlashabita.interfaces.api.routers import (
    health,
    map_layers,
    profiles,
    quality,
    rankings,
    rdf_export,
    sources,
    sparql,
    territories,
)
from atlashabita.observability import configure_logging, get_logger
from atlashabita.observability.errors import DomainError

logger = get_logger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    configure_logging(env=settings.env)
    app.state.container = Container(settings=settings)
    logger.info("api.startup", env=settings.env, version=settings.app_version)
    yield
    logger.info("api.shutdown")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Construye la aplicación FastAPI con middlewares y routers esenciales."""
    settings = settings or get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        summary="API de AtlasHabita: territorios, indicadores, grafo RDF y scoring explicable.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=_lifespan,
    )
    app.state.settings = settings

    _register_middlewares(app, settings)
    _register_exception_handlers(app)
    _register_routers(app)
    return app


def _register_middlewares(app: FastAPI, settings: Settings) -> None:
    # Orden importa: los middlewares se ejecutan en LIFO sobre la respuesta.
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_rpm)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_allow_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
        allow_credentials=False,
    )


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
        payload = {"error": exc.code, "message": exc.message, "details": exc.details or {}}
        return JSONResponse(status_code=exc.status_code, content=payload)


def _register_routers(app: FastAPI) -> None:
    app.include_router(health.router)
    app.include_router(profiles.router)
    app.include_router(territories.router)
    app.include_router(rankings.router)
    app.include_router(map_layers.router)
    app.include_router(sources.router)
    app.include_router(quality.router)
    app.include_router(sparql.router)
    app.include_router(rdf_export.router)
