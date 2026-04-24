"""Caso de uso de exportación del grafo RDF a distintos formatos.

El caso de uso empuja la responsabilidad de serializar a bytes a la capa de
infraestructura (``serializer.py``) y limita el tamaño máximo devuelto para
evitar que un cliente agote memoria pidiendo el dataset completo. rdflib no
ofrece una API de streaming real cuando el grafo se mantiene en memoria, por
lo que se serializa completo y se divide en chunks al enviar. Para datasets
mayores se recurriría a Fuseki (dump HTTP) o a ``Graph.serialize`` sobre un
fichero temporal, pero para la MVP del seed actual (cientos de triples) el
enfoque actual es suficiente y mantiene el código trivialmente auditable.
"""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Final, Literal

from rdflib import Dataset, Graph

from atlashabita.config import Settings
from atlashabita.infrastructure.rdf.serializer import SerializationFormat, serialize
from atlashabita.observability.errors import DomainError

#: Tamaño por defecto de cada chunk emitido por el generador.
_CHUNK_SIZE: Final[int] = 64 * 1024

#: Mapping formato → MIME type. Se expone como ``Final`` para documentar el
#: contrato público y permitir reuso en los routers y tests.
CONTENT_TYPES: Final[dict[SerializationFormat, str]] = {
    "turtle": "text/turtle; charset=utf-8",
    "json-ld": "application/ld+json",
    "nt": "application/n-triples",
    "trig": "application/trig",
}

#: Tope defensivo (en bytes) para impedir descargas accidentales enormes.
#: Con el dataset seed el tamaño serializado es de unos pocos KB, por lo que
#: el valor actual (16 MB) es holgado para expansiones moderadas.
_MAX_PAYLOAD_BYTES: Final[int] = 16 * 1024 * 1024


@dataclass(frozen=True, slots=True)
class RdfExportResult:
    """Resultado de la exportación."""

    format: SerializationFormat
    media_type: str
    total_bytes: int
    payload: bytes

    def iter_chunks(self, chunk_size: int = _CHUNK_SIZE) -> Iterator[bytes]:
        """Divide el payload en chunks para habilitar ``StreamingResponse``."""
        if chunk_size <= 0:
            raise ValueError("chunk_size debe ser positivo")
        for offset in range(0, self.total_bytes, chunk_size):
            yield self.payload[offset : offset + chunk_size]


class ExportRdfUseCase:
    """Serializa el grafo/dataset inyectado y devuelve bytes + metadatos."""

    def __init__(self, graph: Graph | Dataset, settings: Settings) -> None:
        # ``settings`` se conserva por consistencia con el resto de casos de
        # uso y para exponer el tope máximo si se parametriza en el futuro.
        self._graph = graph
        self._settings = settings

    def execute(self, export_format: Literal["turtle", "json-ld", "nt", "trig"]) -> RdfExportResult:
        """Serializa y devuelve un :class:`RdfExportResult`.

        Si el formato no es reconocido se lanza ``DomainError`` ``INVALID_FORMAT``
        para mantener la capa HTTP libre de mapeos manuales. Si la carga
        supera el tope defensivo se lanza ``DomainError`` ``QUALITY_BLOCKED``
        para evitar envíos gigantes no previstos.
        """
        if export_format not in CONTENT_TYPES:
            raise DomainError(
                code="INVALID_FORMAT",
                message=f"Formato RDF no soportado: {export_format!r}.",
                status_code=400,
                details={"allowed": sorted(CONTENT_TYPES)},
            )
        payload = serialize(self._graph, format=export_format)
        total = len(payload)
        if total > _MAX_PAYLOAD_BYTES:
            raise DomainError(
                code="PAYLOAD_TOO_LARGE",
                message=(
                    "La exportación supera el tamaño máximo permitido."
                    " Ajusta el formato o filtra el grafo antes de exportar."
                ),
                status_code=413,
                details={"max_bytes": _MAX_PAYLOAD_BYTES, "total_bytes": total},
            )
        return RdfExportResult(
            format=export_format,
            media_type=CONTENT_TYPES[export_format],
            total_bytes=total,
            payload=payload,
        )


__all__ = ["CONTENT_TYPES", "ExportRdfUseCase", "RdfExportResult"]
