"""Shim transitorio de la capa de aplicación.

Este módulo provee implementaciones mínimas de ``Container`` y de los casos de
uso que la capa HTTP espera mientras Teammate C materializa la capa real en
``application/``. Se apoya exclusivamente en ``SeedLoader`` + ``SeedDataset``
para evitar acoplar la capa HTTP a infraestructura RDF u otras capas que
todavía no están estabilizadas.

Cuando la rama de Teammate C se mergee, este shim será eliminado y
``application.container`` re-exportará la implementación canónica.
"""

from __future__ import annotations

import math
import unicodedata
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from functools import cached_property
from types import MappingProxyType

from atlashabita.config import Settings
from atlashabita.domain.indicators import (
    Indicator,
    IndicatorDirection,
    IndicatorObservation,
)
from atlashabita.domain.profiles import DecisionProfile
from atlashabita.domain.scoring import ScoreContribution, TerritoryScore
from atlashabita.domain.sources import DataSource
from atlashabita.domain.territories import Territory, TerritoryKind
from atlashabita.infrastructure.ingestion.seed_loader import (
    SeedDataset,
    SeedLoader,
)
from atlashabita.observability.errors import (
    InvalidProfileError,
    InvalidScopeError,
    TerritoryNotFoundError,
)

# ---------------------------------------------------------------------------
# Servicio de scoring
# ---------------------------------------------------------------------------


def _normalize(value: float, indicator: Indicator) -> float:
    """Normaliza ``value`` al rango [0, 1] respetando la dirección del indicador."""
    if indicator.min_value is None or indicator.max_value is None:
        return 0.5
    low, high = indicator.min_value, indicator.max_value
    if math.isclose(high, low):
        return 0.5
    normalized = (value - low) / (high - low)
    normalized = max(0.0, min(1.0, normalized))
    if indicator.direction is IndicatorDirection.LOWER_IS_BETTER:
        normalized = 1.0 - normalized
    return normalized


@dataclass(frozen=True, slots=True)
class ScoringService:
    """Calcula scores territoriales explicables a partir de un dataset seed."""

    dataset: SeedDataset
    scoring_version: str

    def score_territory(
        self,
        territory: Territory,
        profile: DecisionProfile,
        weight_overrides: Mapping[str, float] | None = None,
    ) -> TerritoryScore | None:
        """Devuelve el score de ``territory`` para ``profile`` o ``None`` si no hay datos."""
        weights = dict(profile.weights)
        if weight_overrides:
            for key, value in weight_overrides.items():
                if key in weights:
                    weights[key] = float(value)
        total_weight = sum(weights.values())
        if total_weight <= 0:
            return None
        indicators_by_code: dict[str, Indicator] = {i.code: i for i in self.dataset.indicators}
        observations: dict[str, IndicatorObservation] = {}
        for raw_observation in self.dataset.observations:
            if raw_observation.territory_id != territory.identifier:
                continue
            observations[raw_observation.indicator_code] = raw_observation

        contributions: list[ScoreContribution] = []
        score_accum = 0.0
        covered_weight = 0.0
        for code, weight in weights.items():
            indicator = indicators_by_code.get(code)
            observation_for_code = observations.get(code)
            if indicator is None or observation_for_code is None:
                continue
            normalized = _normalize(observation_for_code.value, indicator)
            impact = normalized * weight * 100.0
            contributions.append(
                ScoreContribution(
                    indicator_code=code,
                    label=indicator.label,
                    weight=weight / total_weight,
                    normalized_value=normalized,
                    raw_value=observation_for_code.value,
                    unit=indicator.unit,
                    impact=impact,
                    direction=indicator.direction.value,
                )
            )
            score_accum += normalized * weight
            covered_weight += weight

        if covered_weight <= 0 or not contributions:
            return None

        score = (score_accum / covered_weight) * 100.0
        confidence = covered_weight / total_weight
        highlights = tuple(f"{c.label} alta" for c in contributions if c.normalized_value >= 0.7)[
            :3
        ]
        warnings = tuple(f"{c.label} baja" for c in contributions if c.is_risk)[:3]
        return TerritoryScore(
            territory_id=territory.identifier,
            territory_name=territory.name,
            profile_id=profile.id,
            score=round(score, 2),
            confidence=round(confidence, 3),
            contributions=tuple(contributions),
            highlights=highlights,
            warnings=warnings,
            version=self.scoring_version,
        )


# ---------------------------------------------------------------------------
# Utilidades comunes
# ---------------------------------------------------------------------------


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _match_query(query: str, territory: Territory) -> bool:
    if not query:
        return True
    needle = _strip_accents(query).lower().strip()
    if not needle:
        return True
    haystacks = [territory.name, territory.code, territory.identifier]
    haystacks.extend(territory.aliases)
    return any(needle in _strip_accents(value).lower() for value in haystacks)


def _parse_scope(dataset: SeedDataset, scope: str | None) -> tuple[Territory, ...]:
    """Filtra municipios según el ámbito ``scope``.

    Acepta:
    - ``None`` o vacío → todos los municipios.
    - ``spain`` → todos los municipios.
    - ``province:<code>`` → municipios de la provincia.
    - ``autonomous_community:<code>`` → municipios de la comunidad autónoma.
    - ``municipality:<code>`` → un único municipio (utilidad puntual).
    """
    municipalities = dataset.municipalities
    if not scope or scope.lower() == "spain":
        return municipalities
    if ":" not in scope:
        raise InvalidScopeError(scope)
    kind, _, code = scope.partition(":")
    kind = kind.strip().lower()
    code = code.strip()
    if not code:
        raise InvalidScopeError(scope)
    if kind == TerritoryKind.PROVINCE.value:
        return tuple(t for t in municipalities if t.province_code == code)
    if kind == TerritoryKind.AUTONOMOUS_COMMUNITY.value:
        return tuple(t for t in municipalities if t.autonomous_community_code == code)
    if kind == TerritoryKind.MUNICIPALITY.value:
        return tuple(t for t in municipalities if t.code == code)
    raise InvalidScopeError(scope)


# ---------------------------------------------------------------------------
# Casos de uso
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class SearchTerritoriesUseCase:
    dataset: SeedDataset

    def execute(
        self,
        query: str | None = None,
        kind: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Territory, ...]:
        candidates: Sequence[Territory] = self.dataset.territories
        if kind:
            try:
                target_kind = TerritoryKind(kind)
            except ValueError as exc:
                raise InvalidScopeError(kind) from exc
            candidates = [t for t in candidates if t.kind is target_kind]
        if query:
            candidates = [t for t in candidates if _match_query(query, t)]
        ordered = sorted(candidates, key=lambda t: (t.kind.value, t.name.lower()))
        return tuple(ordered[offset : offset + limit])


@dataclass(frozen=True, slots=True)
class TerritoryDetail:
    territory: Territory
    indicators: tuple[tuple[Indicator, IndicatorObservation], ...]
    province: Territory | None
    autonomous_community: Territory | None
    scores: tuple[TerritoryScore, ...]


@dataclass(frozen=True, slots=True)
class GetTerritoryDetailUseCase:
    dataset: SeedDataset
    scoring_service: ScoringService

    def execute(self, territory_id: str) -> TerritoryDetail:
        territory = self.dataset.get_territory(territory_id)
        if territory is None:
            raise TerritoryNotFoundError(territory_id)
        indicators_by_code = {i.code: i for i in self.dataset.indicators}
        pairs: list[tuple[Indicator, IndicatorObservation]] = []
        for observation in self.dataset.observations:
            if observation.territory_id != territory.identifier:
                continue
            indicator = indicators_by_code.get(observation.indicator_code)
            if indicator is None:
                continue
            pairs.append((indicator, observation))
        pairs.sort(key=lambda p: p[0].code)
        province = self._lookup(territory.province_code, TerritoryKind.PROVINCE)
        community = self._lookup(
            territory.autonomous_community_code, TerritoryKind.AUTONOMOUS_COMMUNITY
        )
        scores: list[TerritoryScore] = []
        for profile in self.dataset.profiles:
            score = self.scoring_service.score_territory(territory, profile)
            if score is not None:
                scores.append(score)
        return TerritoryDetail(
            territory=territory,
            indicators=tuple(pairs),
            province=province,
            autonomous_community=community,
            scores=tuple(scores),
        )

    def _lookup(self, code: str | None, kind: TerritoryKind) -> Territory | None:
        if code is None:
            return None
        for territory in self.dataset.territories:
            if territory.kind is kind and territory.code == code:
                return territory
        return None


@dataclass(frozen=True, slots=True)
class RankingEntry:
    rank: int
    score: TerritoryScore
    territory: Territory
    province: Territory | None


@dataclass(frozen=True, slots=True)
class RankingResult:
    profile_id: str
    scope: str
    scoring_version: str
    data_version: str
    entries: tuple[RankingEntry, ...]


@dataclass(frozen=True, slots=True)
class ComputeRankingsUseCase:
    dataset: SeedDataset
    scoring_service: ScoringService
    data_version: str

    def execute(
        self,
        profile_id: str,
        scope: str | None = None,
        limit: int = 20,
        weight_overrides: Mapping[str, float] | None = None,
    ) -> RankingResult:
        profile = self._find_profile(profile_id)
        municipalities = _parse_scope(self.dataset, scope)
        scores: list[tuple[Territory, TerritoryScore]] = []
        for territory in municipalities:
            score = self.scoring_service.score_territory(territory, profile, weight_overrides)
            if score is not None:
                scores.append((territory, score))
        scores.sort(key=lambda pair: pair[1].score, reverse=True)
        entries: list[RankingEntry] = []
        for index, (territory, score) in enumerate(scores[:limit], start=1):
            entries.append(
                RankingEntry(
                    rank=index,
                    score=score,
                    territory=territory,
                    province=self._province_of(territory),
                )
            )
        return RankingResult(
            profile_id=profile.id,
            scope=scope or "spain",
            scoring_version=self.scoring_service.scoring_version,
            data_version=self.data_version,
            entries=tuple(entries),
        )

    def _find_profile(self, profile_id: str) -> DecisionProfile:
        for profile in self.dataset.profiles:
            if profile.id == profile_id:
                return profile
        raise InvalidProfileError(profile_id)

    def _province_of(self, territory: Territory) -> Territory | None:
        if territory.province_code is None:
            return None
        for candidate in self.dataset.territories:
            if (
                candidate.kind is TerritoryKind.PROVINCE
                and candidate.code == territory.province_code
            ):
                return candidate
        return None


@dataclass(frozen=True, slots=True)
class ListProfilesUseCase:
    dataset: SeedDataset

    def execute(self) -> tuple[DecisionProfile, ...]:
        return self.dataset.profiles


@dataclass(frozen=True, slots=True)
class ListSourcesUseCase:
    dataset: SeedDataset

    def execute(self) -> tuple[DataSource, ...]:
        return self.dataset.sources

    def get(self, source_id: str) -> DataSource | None:
        for source in self.dataset.sources:
            if source.id == source_id:
                return source
        return None


@dataclass(frozen=True, slots=True)
class MapLayer:
    id: str
    title: str
    description: str
    kind: str
    indicator_code: str | None
    unit: str | None


def _build_layers(dataset: SeedDataset) -> tuple[MapLayer, ...]:
    layers: list[MapLayer] = []
    layers.append(
        MapLayer(
            id="administrative_boundaries",
            title="Límites administrativos",
            description="Polígonos municipales simplificados derivados de INE.",
            kind="boundary",
            indicator_code=None,
            unit=None,
        )
    )
    for indicator in dataset.indicators:
        layers.append(
            MapLayer(
                id=indicator.code,
                title=indicator.label,
                description=indicator.description,
                kind="indicator",
                indicator_code=indicator.code,
                unit=indicator.unit,
            )
        )
    return tuple(layers)


@dataclass(frozen=True, slots=True)
class ListMapLayersUseCase:
    dataset: SeedDataset

    def execute(self) -> tuple[MapLayer, ...]:
        return _build_layers(self.dataset)


@dataclass(frozen=True, slots=True)
class GeoFeature:
    feature_id: str
    name: str
    lat: float
    lon: float
    properties: Mapping[str, float | str | int | None]


@dataclass(frozen=True, slots=True)
class GeoLayerPayload:
    layer: MapLayer
    features: tuple[GeoFeature, ...]


@dataclass(frozen=True, slots=True)
class GetMapLayerUseCase:
    dataset: SeedDataset

    def execute(self, layer_id: str) -> GeoLayerPayload:
        layers = {layer.id: layer for layer in _build_layers(self.dataset)}
        layer = layers.get(layer_id)
        if layer is None:
            raise TerritoryNotFoundError(layer_id)
        features: list[GeoFeature] = []
        indicator_code = layer.indicator_code
        indicator_values: dict[str, IndicatorObservation] = {}
        if indicator_code is not None:
            for observation in self.dataset.observations:
                if observation.indicator_code == indicator_code:
                    indicator_values[observation.territory_id] = observation
        for territory in self.dataset.municipalities:
            if territory.centroid is None:
                continue
            props: dict[str, float | str | int | None] = {
                "territory_id": territory.identifier,
                "code": territory.code,
                "name": territory.name,
                "province_code": territory.province_code,
                "autonomous_community_code": territory.autonomous_community_code,
                "population": territory.population,
            }
            if indicator_code is not None:
                observation_for_territory = indicator_values.get(territory.identifier)
                props["value"] = (
                    observation_for_territory.value if observation_for_territory else None
                )
                props["period"] = (
                    observation_for_territory.period if observation_for_territory else None
                )
                props["quality"] = (
                    observation_for_territory.quality if observation_for_territory else None
                )
            features.append(
                GeoFeature(
                    feature_id=territory.identifier,
                    name=territory.name,
                    lat=territory.centroid.lat,
                    lon=territory.centroid.lon,
                    properties=MappingProxyType(props),
                )
            )
        return GeoLayerPayload(layer=layer, features=tuple(features))


@dataclass(frozen=True, slots=True)
class QualityRow:
    dataset: str
    total_rows: int
    quality_ok: int
    quality_warn: int
    quality_error: int


@dataclass(frozen=True, slots=True)
class QualityReport:
    generated_at: str
    rows: tuple[QualityRow, ...]


@dataclass(frozen=True, slots=True)
class GetQualityReportUseCase:
    dataset: SeedDataset
    generated_at: str

    def execute(self) -> QualityReport:
        observations = self.dataset.observations
        total = len(observations)
        ok = sum(1 for o in observations if o.quality == "ok")
        warn = sum(1 for o in observations if o.quality == "warn")
        error = total - ok - warn
        rows = (
            QualityRow(
                dataset="observations",
                total_rows=total,
                quality_ok=ok,
                quality_warn=warn,
                quality_error=error,
            ),
            QualityRow(
                dataset="territories",
                total_rows=len(self.dataset.territories),
                quality_ok=len(self.dataset.territories),
                quality_warn=0,
                quality_error=0,
            ),
            QualityRow(
                dataset="sources",
                total_rows=len(self.dataset.sources),
                quality_ok=len(self.dataset.sources),
                quality_warn=0,
                quality_error=0,
            ),
        )
        return QualityReport(generated_at=self.generated_at, rows=rows)


# ---------------------------------------------------------------------------
# Container
# ---------------------------------------------------------------------------


class Container:
    """Contenedor de dependencias transitorio basado en ``SeedDataset``."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def settings(self) -> Settings:
        return self._settings

    @cached_property
    def seed_loader(self) -> SeedLoader:
        return SeedLoader(self._settings.data_zone("seed"))

    @cached_property
    def dataset(self) -> SeedDataset:
        return self.seed_loader.load()

    @cached_property
    def scoring_service(self) -> ScoringService:
        return ScoringService(
            dataset=self.dataset,
            scoring_version=self._settings.scoring_version,
        )

    def search_territories(self) -> SearchTerritoriesUseCase:
        return SearchTerritoriesUseCase(dataset=self.dataset)

    def get_territory_detail(self) -> GetTerritoryDetailUseCase:
        return GetTerritoryDetailUseCase(dataset=self.dataset, scoring_service=self.scoring_service)

    def compute_rankings(self) -> ComputeRankingsUseCase:
        return ComputeRankingsUseCase(
            dataset=self.dataset,
            scoring_service=self.scoring_service,
            data_version=self._settings.scoring_version,
        )

    def list_profiles(self) -> ListProfilesUseCase:
        return ListProfilesUseCase(dataset=self.dataset)

    def list_sources(self) -> ListSourcesUseCase:
        return ListSourcesUseCase(dataset=self.dataset)

    def list_map_layers(self) -> ListMapLayersUseCase:
        return ListMapLayersUseCase(dataset=self.dataset)

    def get_map_layer(self) -> GetMapLayerUseCase:
        return GetMapLayerUseCase(dataset=self.dataset)

    def get_quality_report(self) -> GetQualityReportUseCase:
        return GetQualityReportUseCase(
            dataset=self.dataset, generated_at=self._settings.scoring_version
        )


__all__ = [
    "ComputeRankingsUseCase",
    "Container",
    "GeoFeature",
    "GeoLayerPayload",
    "GetMapLayerUseCase",
    "GetQualityReportUseCase",
    "GetTerritoryDetailUseCase",
    "ListMapLayersUseCase",
    "ListProfilesUseCase",
    "ListSourcesUseCase",
    "MapLayer",
    "QualityReport",
    "QualityRow",
    "RankingEntry",
    "RankingResult",
    "ScoringService",
    "SearchTerritoriesUseCase",
    "TerritoryDetail",
]
