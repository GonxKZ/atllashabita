"""Entrada ASGI de AtlasHabita para Vercel Functions."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
API_SRC = REPO_ROOT / "apps" / "api" / "src"

if str(API_SRC) not in sys.path:
    sys.path.insert(0, str(API_SRC))

from atlashabita.config import Settings
from atlashabita.interfaces.api.app import create_app

api_app = create_app(
    Settings(
        env="production",
        cors_allow_origins=(
            "https://atlashabita.vercel.app",
            "https://www.atlashabita.vercel.app",
        ),
        data_root=REPO_ROOT / "data",
        ontology_root=REPO_ROOT / "ontology",
    )
)


class StripApiPrefix:
    """Adapta las rutas `/api/*` de Vercel al contrato interno FastAPI."""

    def __init__(self, wrapped_app):
        self._wrapped_app = wrapped_app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            path = scope.get("path", "")
            if path == "/api":
                scope = {**scope, "path": "/"}
            elif path.startswith("/api/"):
                scope = {**scope, "path": path.removeprefix("/api")}
        await self._wrapped_app(scope, receive, send)


app = StripApiPrefix(api_app)
