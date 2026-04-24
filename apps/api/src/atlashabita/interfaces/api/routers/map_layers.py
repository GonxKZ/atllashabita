"""Router de capas cartográficas para el mapa interactivo."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from atlashabita.application.container import Container
from atlashabita.interfaces.api.deps import get_container
from atlashabita.interfaces.api.schemas import (
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    GeoJSONGeometry,
    LayerDescriptor,
)

router = APIRouter(prefix="/map", tags=["mapa"])

ContainerDep = Annotated[Container, Depends(get_container)]


@router.get(
    "/layers",
    response_model=list[LayerDescriptor],
    summary="Listar capas disponibles",
)
def list_layers(container: ContainerDep) -> list[LayerDescriptor]:
    layers = container.list_map_layers().execute()
    return [
        LayerDescriptor(
            id=layer.id,
            title=layer.title,
            description=layer.description,
            kind=layer.kind,
            indicator_code=layer.indicator_code,
            unit=layer.unit,
        )
        for layer in layers
    ]


@router.get(
    "/layers/{layer_id}",
    response_model=GeoJSONFeatureCollection,
    summary="Datos GeoJSON de una capa",
)
def get_layer(
    layer_id: str,
    container: ContainerDep,
) -> GeoJSONFeatureCollection:
    payload = container.get_map_layer().execute(layer_id)
    descriptor = LayerDescriptor(
        id=payload.layer.id,
        title=payload.layer.title,
        description=payload.layer.description,
        kind=payload.layer.kind,
        indicator_code=payload.layer.indicator_code,
        unit=payload.layer.unit,
    )
    features = tuple(
        GeoJSONFeature(
            id=feature.feature_id,
            geometry=GeoJSONGeometry(type="Point", coordinates=(feature.lon, feature.lat)),
            properties=dict(feature.properties),
        )
        for feature in payload.features
    )
    return GeoJSONFeatureCollection(layer=descriptor, features=features)


__all__ = ["router"]
