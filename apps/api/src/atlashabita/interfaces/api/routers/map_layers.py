"""Router de capas cartográficas para el mapa interactivo."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from atlashabita.application.container import Container
from atlashabita.interfaces.api.deps import get_container

router = APIRouter(prefix="/map", tags=["mapa"])

ContainerDep = Annotated[Container, Depends(get_container)]


@router.get(
    "/layers",
    summary="Listar capas disponibles",
)
def list_layers(container: ContainerDep) -> list[dict[str, Any]]:
    """Catálogo de capas (score por perfil + una por indicador)."""
    return list(container.list_map_layers.execute())


@router.get(
    "/layers/{layer_id}",
    summary="Datos GeoJSON de una capa",
)
def get_layer(
    layer_id: str,
    container: ContainerDep,
) -> dict[str, Any]:
    """Devuelve la capa como FeatureCollection GeoJSON."""
    return container.get_map_layer.execute(layer_id)


__all__ = ["router"]
