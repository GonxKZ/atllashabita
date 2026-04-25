"""Rankings parametrizados por perfil, ámbito y pesos (RF-003, RF-005, RF-030)."""

from __future__ import annotations

from collections import OrderedDict
from collections.abc import Mapping
from typing import Any

from atlashabita.application.scoring import ScoringService
from atlashabita.config import Settings
from atlashabita.domain.scoring import TerritoryScore
from atlashabita.domain.territories import Territory, TerritoryKind
from atlashabita.infrastructure.ingestion import SeedDataset
from atlashabita.observability.errors import InvalidProfileError, InvalidScopeError

_DEFAULT_LIMIT = 20
_SCOPE_SEPARATOR = ":"
_SCOPE_ALL = "es"
_ALLOWED_SCOPE_PREFIXES = {"autonomous_community", "province"}

_CacheKey = tuple[str, str, tuple[tuple[str, float], ...], str]


class ComputeRankingsUseCase:
    """Calcula y cachea rankings para un perfil dado.

    El cache es **LRU acotado** con ``settings.cache_max_entries`` para evitar
    que combinaciones distintas de pesos personalizados hagan crecer la memoria
    del proceso sin control. Al superar el umbral se expulsa la entrada menos
    usada, de forma que las consultas más repetidas se conservan "calientes".

    Indexación O(1):

    - ``_territories_by_code`` permite resolver el nombre de provincia/CCAA de
      cualquier resultado sin recorrer ``dataset.territories``.
    - ``_municipalities_by_province`` y ``_municipalities_by_community`` permiten
      resolver el ámbito sin filtrar la lista entera en cada petición.

    Estos índices son inmutables y se construyen con un único recorrido del
    dataset al instanciar el caso de uso.
    """

    def __init__(
        self,
        dataset: SeedDataset,
        scoring_service: ScoringService,
        settings: Settings,
        data_version: str,
    ) -> None:
        self._dataset = dataset
        self._scoring_service = scoring_service
        self._settings = settings
        self._data_version = data_version
        self._cache: OrderedDict[_CacheKey, tuple[TerritoryScore, ...]] = OrderedDict()
        self._cache_max = max(1, settings.cache_max_entries)
        self._territories_by_code, municipalities_by_p, municipalities_by_c = _build_indices(
            dataset
        )
        self._all_municipalities: tuple[Territory, ...] = tuple(
            t for t in dataset.territories if t.kind is TerritoryKind.MUNICIPALITY
        )
        self._municipalities_by_province: dict[str, tuple[Territory, ...]] = {
            code: tuple(items) for code, items in municipalities_by_p.items()
        }
        self._municipalities_by_community: dict[str, tuple[Territory, ...]] = {
            code: tuple(items) for code, items in municipalities_by_c.items()
        }

    def execute(
        self,
        profile_id: str,
        scope: str | None = None,
        weights: Mapping[str, float] | None = None,
        limit: int = _DEFAULT_LIMIT,
    ) -> dict[str, Any]:
        """Produce un ranking ordenado con metadatos reproducibles.

        Args:
            profile_id: identificador del perfil.
            scope: ``"es"``, ``"autonomous_community:XX"``, ``"province:YY"``
                o ``None`` (equivalente a ``"es"``).
            weights: pesos opcionales que sustituyen a los del perfil.
            limit: número máximo de resultados a devolver.

        Returns:
            Diccionario JSON-serializable con resultados y metadatos.
        """
        if profile_id not in {profile.id for profile in self._dataset.profiles}:
            raise InvalidProfileError(profile_id)

        resolved_scope = (scope or _SCOPE_ALL).strip().lower() or _SCOPE_ALL
        territories = self._resolve_scope(resolved_scope)
        bounded_limit = max(1, int(limit))
        cache_key = self._build_cache_key(profile_id, resolved_scope, weights)
        cached = self._cache.get(cache_key)
        if cached is None:
            cached = tuple(
                self._scoring_service.compute(profile_id, scope=territories, weights=weights)
            )
            self._cache[cache_key] = cached
            if len(self._cache) > self._cache_max:
                self._cache.popitem(last=False)
        else:
            self._cache.move_to_end(cache_key, last=True)
        scores = list(cached)
        limited = scores[:bounded_limit]

        return {
            "profile": profile_id,
            "scope": resolved_scope,
            "scoring_version": self._settings.scoring_version,
            "data_version": self._data_version,
            "results": [
                self._serialize_result(rank=index + 1, score=score)
                for index, score in enumerate(limited)
            ],
        }

    def _resolve_scope(self, scope: str) -> tuple[Territory, ...]:
        if scope == _SCOPE_ALL:
            return self._all_municipalities
        if _SCOPE_SEPARATOR not in scope:
            raise InvalidScopeError(scope)
        prefix, _, code = scope.partition(_SCOPE_SEPARATOR)
        if prefix not in _ALLOWED_SCOPE_PREFIXES or not code:
            raise InvalidScopeError(scope)
        # Lookup O(1) sobre los índices precomputados; evita recorrer
        # ``dataset.territories`` en cada petición.
        index = (
            self._municipalities_by_community
            if prefix == "autonomous_community"
            else self._municipalities_by_province
        )
        municipalities = index.get(code, ())
        if not municipalities:
            raise InvalidScopeError(scope)
        return municipalities

    def _build_cache_key(
        self,
        profile_id: str,
        scope: str,
        weights: Mapping[str, float] | None,
    ) -> tuple[str, str, tuple[tuple[str, float], ...], str]:
        frozen_weights = (
            tuple(sorted((str(k), float(v)) for k, v in weights.items()))
            if weights is not None
            else ()
        )
        return (profile_id, scope, frozen_weights, self._data_version)

    def _serialize_result(self, rank: int, score: TerritoryScore) -> dict[str, Any]:
        territory = self._dataset.get_territory(score.territory_id)
        province = None
        community = None
        if territory is not None:
            province = self._lookup_name(territory.province_code, TerritoryKind.PROVINCE)
            community = self._lookup_name(
                territory.autonomous_community_code, TerritoryKind.AUTONOMOUS_COMMUNITY
            )
        top_contributions = [
            {
                "factor": contribution.indicator_code,
                "label": contribution.label,
                "weight": contribution.weight,
                "normalized": contribution.normalized_value,
                "impact": contribution.impact,
            }
            for contribution in score.contributions[:3]
        ]
        return {
            "rank": rank,
            "territory_id": score.territory_id,
            "name": score.territory_name,
            "province": province,
            "autonomous_community": community,
            "score": score.score,
            "confidence": score.confidence,
            "highlights": list(score.highlights),
            "warnings": list(score.warnings),
            "top_contributions": top_contributions,
        }

    def _lookup_name(self, code: str | None, kind: TerritoryKind) -> str | None:
        if code is None:
            return None
        # Lookup O(1) sobre el índice precomputado: evita recorrer todos los
        # territorios para cada fila del ranking serializado (era O(n*m)).
        candidate = self._territories_by_code.get((kind, code))
        return candidate.name if candidate is not None else None


def _build_indices(
    dataset: SeedDataset,
) -> tuple[
    dict[tuple[TerritoryKind, str], Territory],
    dict[str, list[Territory]],
    dict[str, list[Territory]],
]:
    """Construye los índices auxiliares en una única pasada por el dataset.

    Devuelve:

    * ``territories_by_code``: ``(kind, code) -> Territory`` para lookup O(1)
      por código administrativo (provincia, comunidad autónoma, municipio).
    * ``municipalities_by_province``: ``province_code -> [Territory]`` con los
      municipios pertenecientes a cada provincia.
    * ``municipalities_by_community``: análogo a nivel de comunidad autónoma.

    Mantener la construcción aquí (función libre) facilita cubrirla con tests
    aislados sin instanciar el caso de uso completo.
    """
    territories_by_code: dict[tuple[TerritoryKind, str], Territory] = {}
    by_province: dict[str, list[Territory]] = {}
    by_community: dict[str, list[Territory]] = {}
    for territory in dataset.territories:
        territories_by_code[(territory.kind, territory.code)] = territory
        if territory.kind is not TerritoryKind.MUNICIPALITY:
            continue
        if territory.province_code:
            by_province.setdefault(territory.province_code, []).append(territory)
        if territory.autonomous_community_code:
            by_community.setdefault(territory.autonomous_community_code, []).append(territory)
    return territories_by_code, by_province, by_community
