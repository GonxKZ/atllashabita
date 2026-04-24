"""Manifiesto resumen del grafo AtlasHabita.

El manifiesto se genera tras construir el grafo para documentar de un
vistazo qué hay dentro (nº de tripletas, grafos nombrados, cardinalidades por
clase). Se usa:

* En tests para verificar invariantes sin parsear todo el dataset.
* Como payload para endpoints de diagnóstico (``/debug/graph-manifest``).
* Como artefacto publicable junto al fichero Turtle para auditoría.

El formato devuelto es un ``dict`` ordinario apto para ``json.dumps`` sin
dependencias adicionales.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from rdflib import Dataset
from rdflib.namespace import RDF

from atlashabita.infrastructure.rdf.namespaces import AH


def build_manifest(dataset: Dataset) -> dict[str, Any]:
    """Genera el manifiesto del ``Dataset`` indicado.

    Se cuentan las tripletas recorriendo todos los cuadruples: ``len(dataset)``
    sólo cuenta el grafo default en algunas versiones de rdflib, por lo que se
    usa la iteración explícita por seguridad y compatibilidad.
    """
    total_triples = 0
    named_graphs: dict[str, int] = {}
    classes_count: dict[str, int] = {}
    territories_count = 0
    observations_count = 0

    territory_classes = {AH.Municipality, AH.Province, AH.AutonomousCommunity}

    for graph in dataset.graphs():
        identifier = str(graph.identifier)
        count = 0
        for _subject, predicate, obj in graph.triples((None, None, None)):
            count += 1
            if predicate == RDF.type:
                class_iri = str(obj)
                classes_count[class_iri] = classes_count.get(class_iri, 0) + 1
                if obj in territory_classes:
                    territories_count += 1
                elif obj == AH.IndicatorObservation:
                    observations_count += 1
        if count:
            named_graphs[identifier] = count
            total_triples += count

    return {
        "total_triples": total_triples,
        "named_graphs": named_graphs,
        "classes_count": classes_count,
        "territories_count": territories_count,
        "observations_count": observations_count,
        "generated_at_iso": datetime.now(tz=UTC).isoformat(timespec="seconds"),
    }


__all__ = ["build_manifest"]
