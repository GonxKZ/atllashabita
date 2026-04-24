"""Generación de GeoJSON FeatureCollection para una capa de mapa (RF-004, RF-026)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from atlashabita.application.scoring import ScoringService
from atlashabita.domain.territories import Territory, TerritoryKind
from atlashabita.infrastructure.ingestion import SeedDataset
from atlashabita.observability.errors import InvalidProfileError, InvalidScopeError

_SCORE_PREFIX = "score_"


@dataclass(frozen=True, slots=True)
class GetMapLayerUseCase:
    """Construye una colección GeoJSON de puntos para una capa concreta."""

    dataset: SeedDataset
    scoring_service: ScoringService

    def execute(self, layer_id: str, profile_id: str | None = None) -> dict[str, Any]:
        """Devuelve un FeatureCollection con un punto por municipio.

        Args:
            layer_id: identificador de capa devuelto por ``ListMapLayersUseCase``.
            profile_id: perfil explícito si la capa pertenece a un score y no
                está embebido en ``layer_id``.

        Returns:
            Objeto GeoJSON con ``type = FeatureCollection`` y ``features`` con
            propiedad ``value``, ``label`` y ``territory_id``.
        """
        if not layer_id:
            raise InvalidScopeError(layer_id)

        municipalities = tuple(
            t for t in self.dataset.territories if t.kind is TerritoryKind.MUNICIPALITY
        )
        if layer_id.startswith(_SCORE_PREFIX):
            resolved_profile = layer_id[len(_SCORE_PREFIX) :]
            if not resolved_profile:
                raise InvalidProfileError(layer_id)
            return self._score_layer(
                layer_id=layer_id,
                profile_id=resolved_profile,
                municipalities=municipalities,
            )

        if self._is_indicator(layer_id):
            return self._indicator_layer(layer_id=layer_id, municipalities=municipalities)

        if profile_id is not None:
            return self._score_layer(
                layer_id=layer_id,
                profile_id=profile_id,
                municipalities=municipalities,
            )
        raise InvalidScopeError(layer_id)

    def _is_indicator(self, layer_id: str) -> bool:
        return any(indicator.code == layer_id for indicator in self.dataset.indicators)

    def _score_layer(
        self,
        layer_id: str,
        profile_id: str,
        municipalities: tuple[Territory, ...],
    ) -> dict[str, Any]:
        scores = self.scoring_service.compute(profile_id, scope=municipalities)
        score_by_territory = {score.territory_id: score for score in scores}
        features: list[dict[str, Any]] = []
        for territory in municipalities:
            score = score_by_territory.get(territory.identifier)
            if score is None or territory.centroid is None:
                continue
            features.append(
                _build_feature(
                    territory=territory,
                    value=score.score,
                    label=f"{territory.name}: {score.score}",
                )
            )
        return _feature_collection(layer_id=layer_id, features=features, kind="score")

    def _indicator_layer(
        self,
        layer_id: str,
        municipalities: tuple[Territory, ...],
    ) -> dict[str, Any]:
        values = {
            obs.territory_id: obs
            for obs in self.dataset.observations
            if obs.indicator_code == layer_id
        }
        features: list[dict[str, Any]] = []
        for territory in municipalities:
            if territory.centroid is None:
                continue
            observation = values.get(territory.identifier)
            if observation is None:
                continue
            features.append(
                _build_feature(
                    territory=territory,
                    value=observation.value,
                    label=f"{territory.name}: {observation.value}",
                )
            )
        return _feature_collection(layer_id=layer_id, features=features, kind="indicator")


def _feature_collection(
    layer_id: str,
    features: list[dict[str, Any]],
    kind: str,
) -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "layer_id": layer_id,
        "kind": kind,
        "features": features,
    }


def _build_feature(
    territory: Territory,
    value: float,
    label: str,
) -> dict[str, Any]:
    assert territory.centroid is not None  # invariante: filtrado previo
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [territory.centroid.lon, territory.centroid.lat],
        },
        "properties": {
            "territory_id": territory.identifier,
            "name": territory.name,
            "value": value,
            "label": label,
        },
    }
