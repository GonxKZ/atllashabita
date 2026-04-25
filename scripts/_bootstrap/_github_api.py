"""Helpers compartidos para los scripts de bootstrap de issues/milestones.

Los scripts ``create_m{8,9,11,12}_issues.py`` repetian de forma identica las
mismas tres funciones (``call``, ``find_milestone`` y ``existing_titles``).
Centralizarlas aqui elimina ~120 lineas duplicadas y deja un unico punto en el
que aplicar correcciones (timeouts, paginacion, manejo de errores...).

El modulo es deliberadamente minimo y stdlib-only para que cualquier script de
bootstrap pueda importarlo sin instalar dependencias adicionales: usa
``urllib`` y ``json`` igual que los scripts originales.

Modo de uso desde un script:

    from _github_api import GithubApi

    api = GithubApi(repo="GonxKZ/atllashabita")
    api.call("GET", "/issues?state=open")
    api.find_milestone("M9 Pulido v0.3.0")
    api.existing_titles()

El token se toma de ``GH_TOKEN`` por defecto, lo que respeta el contrato
historico de los scripts.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GithubApi:
    """Cliente minimo de la API REST de GitHub para los scripts bootstrap.

    Atributos:
        repo: ``owner/name`` del repositorio destino.
        token: PAT con permisos de ``repo``. Por defecto lee ``GH_TOKEN``.
    """

    repo: str
    token: str = ""

    def _resolved_token(self) -> str:
        return self.token or os.environ["GH_TOKEN"]

    def _api_root(self) -> str:
        return f"https://api.github.com/repos/{self.repo}"

    def call(self, method: str, path: str, body: dict | None = None) -> dict | list:
        """Realiza una peticion HTTP a ``{API}{path}``.

        Devuelve el JSON parseado. Si el servidor responde con error HTTP,
        devuelve ``{"error": status, "body": <texto truncado>}`` para que el
        script pueda continuar reportando fallos sin abortar la ejecucion.
        """
        url = f"{self._api_root()}{path}"
        data = json.dumps(body).encode("utf-8") if body else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"token {self._resolved_token()}")
        req.add_header("Accept", "application/vnd.github+json")
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req) as response:  # noqa: S310 - URL fija a github.
                return json.loads(response.read() or b"null")
        except urllib.error.HTTPError as exc:
            return {
                "error": exc.code,
                "body": exc.read().decode("utf-8", "replace")[:400],
            }

    def find_milestone(self, title: str) -> int | None:
        """Devuelve el numero del milestone con ``title`` o ``None``."""
        milestones = self.call("GET", "/milestones?state=all&per_page=100")
        assert isinstance(milestones, list)
        for milestone in milestones:
            if milestone.get("title") == title:
                return int(milestone["number"])
        return None

    def existing_titles(self) -> set[str]:
        """Devuelve los titulos de todas las issues (excluye PRs) paginando."""
        titles: set[str] = set()
        page = 1
        while True:
            items = self.call("GET", f"/issues?state=all&per_page=100&page={page}")
            assert isinstance(items, list)
            if not items:
                break
            for item in items:
                if "pull_request" not in item:
                    titles.add(item["title"])
            page += 1
        return titles


__all__ = ["GithubApi"]
