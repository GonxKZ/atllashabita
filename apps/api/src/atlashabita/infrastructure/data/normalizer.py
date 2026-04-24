"""Normalización territorial: códigos INE, jerarquías y búsqueda tolerante.

Se centra en las tres utilidades que el resto del backend necesita a diario:

1. **Códigos INE normalizados**: cinco dígitos para municipios y dos para
   provincias, con ``zero-padding`` defensivo cuando un CSV pierde ceros.
2. **Jerarquía territorial**: dado un identificador (``municipality:41091`` o
   ``41091``) devolver el diccionario con provincia y CCAA (códigos y
   etiquetas) listo para la UI.
3. **Índice de búsqueda**: lista plana apta para un buscador en frontend, con
   ``slug`` sin tildes para comparar cadenas entrantes.
"""

from __future__ import annotations

import unicodedata
from collections.abc import Mapping
from typing import Any

from slugify import slugify

from atlashabita.domain.territories import Territory, TerritoryKind
from atlashabita.infrastructure.ingestion import SeedDataset

_INE_LENGTHS: Mapping[TerritoryKind, int] = {
    TerritoryKind.MUNICIPALITY: 5,
    TerritoryKind.PROVINCE: 2,
    TerritoryKind.AUTONOMOUS_COMMUNITY: 2,
}


class TerritoryNormalizer:
    """Normalizador que opera sobre un :class:`SeedDataset` inmutable.

    Construye índices auxiliares al instanciarse para responder en O(1) a las
    búsquedas por código. Se asume que el dataset es de sólo lectura durante
    la vida del normalizador: si cambia hay que recrear la instancia.
    """

    def __init__(self, dataset: SeedDataset) -> None:
        self._dataset = dataset
        self._by_kind_and_code: dict[tuple[TerritoryKind, str], Territory] = {
            (territory.kind, territory.code): territory for territory in dataset.territories
        }

    # ------------------------------------------------------------------
    # Códigos
    # ------------------------------------------------------------------

    def normalize_ine_code(
        self,
        code: str,
        kind: TerritoryKind = TerritoryKind.MUNICIPALITY,
    ) -> str:
        """Devuelve el código INE rellenado con ceros a la longitud esperada.

        Si ``code`` contiene caracteres no dígitos se devuelve tal cual tras
        eliminar espacios: la validación estricta se delega en
        :func:`quality_gates.validate_territories`.
        """
        if not code:
            raise ValueError("El código INE no puede estar vacío.")
        stripped = code.strip()
        if not stripped.isdigit():
            return stripped
        expected_length = _INE_LENGTHS[kind]
        return stripped.zfill(expected_length)

    # ------------------------------------------------------------------
    # Jerarquía
    # ------------------------------------------------------------------

    def hierarchy_of(self, territory_id: str) -> dict[str, Any]:
        """Devuelve la jerarquía (municipio → provincia → CCAA) de un territorio.

        Acepta tanto identificadores completos (``municipality:41091``) como
        códigos sueltos (``41091``). Eleva :class:`KeyError` si el territorio
        no existe en el dataset.
        """
        territory = self._resolve_territory(territory_id)
        province = self._lookup(TerritoryKind.PROVINCE, territory.province_code)
        community = self._lookup(
            TerritoryKind.AUTONOMOUS_COMMUNITY, territory.autonomous_community_code
        )
        return {
            "territory": {
                "id": territory.identifier,
                "code": territory.code,
                "name": territory.name,
                "kind": territory.kind.value,
            },
            "province": _label_pair(province),
            "autonomous_community": _label_pair(community),
        }

    # ------------------------------------------------------------------
    # Slug y búsqueda
    # ------------------------------------------------------------------

    def slugify_name(self, name: str) -> str:
        """Slug reproducible para un nombre territorial.

        Usa ``python-slugify`` con separador ``-`` y sin cortar longitud.
        """
        if not name.strip():
            raise ValueError("El nombre a slugificar no puede estar vacío.")
        return slugify(name, separator="-", lowercase=True)

    def search_index(self) -> list[dict[str, Any]]:
        """Índice ordenado por nombre para buscadores tolerantes a tildes."""
        entries: list[dict[str, Any]] = []
        for territory in self._dataset.territories:
            province = self._lookup(TerritoryKind.PROVINCE, territory.province_code)
            community = self._lookup(
                TerritoryKind.AUTONOMOUS_COMMUNITY, territory.autonomous_community_code
            )
            entries.append(
                {
                    "id": territory.identifier,
                    "code": territory.code,
                    "name": territory.name,
                    "slug": self.slugify_name(territory.name),
                    "ascii_name": _strip_accents(territory.name).lower(),
                    "kind": territory.kind.value,
                    "province": _label_pair(province),
                    "autonomous_community": _label_pair(community),
                }
            )
        entries.sort(key=lambda entry: entry["ascii_name"])
        return entries

    # ------------------------------------------------------------------
    # Internos
    # ------------------------------------------------------------------

    def _resolve_territory(self, territory_id: str) -> Territory:
        """Busca un territorio por identificador completo o código municipal."""
        if ":" in territory_id:
            kind_part, code_part = territory_id.split(":", maxsplit=1)
            kind = TerritoryKind(kind_part)
            code = self.normalize_ine_code(code_part, kind)
            territory = self._by_kind_and_code.get((kind, code))
            if territory is None:
                raise KeyError(territory_id)
            return territory
        code = self.normalize_ine_code(territory_id, TerritoryKind.MUNICIPALITY)
        for kind in (
            TerritoryKind.MUNICIPALITY,
            TerritoryKind.PROVINCE,
            TerritoryKind.AUTONOMOUS_COMMUNITY,
        ):
            territory = self._by_kind_and_code.get((kind, code))
            if territory is not None:
                return territory
        raise KeyError(territory_id)

    def _lookup(self, kind: TerritoryKind, code: str | None) -> Territory | None:
        """Busca un territorio ``(kind, code)`` sin lanzar si no existe."""
        if not code:
            return None
        return self._by_kind_and_code.get((kind, code))


def _label_pair(territory: Territory | None) -> dict[str, str] | None:
    """Serializa un territorio opcional como par (code, name)."""
    if territory is None:
        return None
    return {"code": territory.code, "name": territory.name}


def _strip_accents(value: str) -> str:
    """Elimina marcas diacríticas (tildes, diéresis) de forma determinista."""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))
