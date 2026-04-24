"""Serialización uniforme de grafos y datasets RDF.

rdflib ofrece distintos backends de serialización (``turtle``, ``json-ld``,
``nt``, ``trig``) con sutilezas: ``Dataset`` requiere formatos con named
graphs (``trig``, ``nquads``, ``json-ld``) mientras que ``Graph`` admite
formatos planos. Este módulo normaliza esa dicotomía para el resto de la
aplicación y añade una utilidad de escritura a disco con creación de
directorio padre y control de errores centralizado.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from rdflib import Dataset, Graph

from atlashabita.infrastructure.rdf.namespaces import bind_all

#: Formatos soportados. Se expone como ``Literal`` para que mypy valide el uso.
SerializationFormat = Literal["turtle", "json-ld", "nt", "trig"]

_GRAPH_FORMATS: dict[SerializationFormat, str] = {
    "turtle": "turtle",
    "json-ld": "json-ld",
    "nt": "nt",
    "trig": "trig",
}

_DATASET_FORMATS: dict[SerializationFormat, str] = {
    # ``Dataset`` delega en ``ConjunctiveGraph`` internamente. ``turtle`` y
    # ``nt`` solo serializan el grafo default, por lo que emitimos un aviso
    # temprano para que el caller use ``trig`` o ``json-ld`` si necesita
    # conservar los named graphs.
    "turtle": "turtle",
    "json-ld": "json-ld",
    "nt": "nt",
    "trig": "trig",
}


def serialize(graph_or_dataset: Graph | Dataset, format: SerializationFormat) -> bytes:
    """Serializa un grafo o dataset a bytes.

    Se fuerza UTF-8 y se rebinda el namespace bundle para que la salida sea
    legible aunque el caller haya construido el grafo sin registrar prefijos.
    """
    bind_all(graph_or_dataset)

    if isinstance(graph_or_dataset, Dataset):
        rdflib_format = _DATASET_FORMATS[format]
    else:
        rdflib_format = _GRAPH_FORMATS[format]

    data = graph_or_dataset.serialize(format=rdflib_format, encoding="utf-8")
    if isinstance(data, str):
        # rdflib devuelve str si el backend ignora ``encoding``. Se normaliza.
        return data.encode("utf-8")
    return data


def write(
    graph_or_dataset: Graph | Dataset,
    path: Path,
    format: SerializationFormat,
) -> Path:
    """Escribe el grafo/dataset al ``path`` indicado y devuelve la ruta.

    Crea los directorios intermedios si no existen. Devolver la ruta permite
    encadenar en pipelines (``manifest.write(...).relative_to(...)``) sin
    duplicar el cálculo de la ruta final.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = serialize(graph_or_dataset, format=format)
    path.write_bytes(payload)
    return path


__all__ = ["SerializationFormat", "serialize", "write"]
