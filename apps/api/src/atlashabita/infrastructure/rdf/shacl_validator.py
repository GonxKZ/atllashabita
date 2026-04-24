"""Validación SHACL del grafo AtlasHabita.

El módulo envuelve ``pyshacl`` en una API estable propia. El motivo es doble:

* Evitar acoplar toda la aplicación a los argumentos posicionales y tipos
  internos de ``pyshacl``, que han cambiado entre versiones.
* Exponer un :class:`ValidationReport` tipado y autocontenido que los
  servicios superiores puedan serializar, loggear o devolver por API sin
  manejar ``rdflib.Graph`` directamente.

La validación se ejecuta sin inferencia por defecto (``inference="none"``)
para que el resultado sea determinista y rápido sobre datasets grandes. El
caller puede activar inferencia RDFS/OWL si lo necesita.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, cast

from pyshacl import validate as shacl_validate
from rdflib import Dataset, Graph, URIRef
from rdflib.namespace import RDF
from rdflib.term import Node

from atlashabita.infrastructure.rdf.namespaces import bind_all

_SH = "http://www.w3.org/ns/shacl#"
_SH_RESULT = URIRef(_SH + "ValidationResult")
_SH_FOCUS_NODE = URIRef(_SH + "focusNode")
_SH_RESULT_PATH = URIRef(_SH + "resultPath")
_SH_RESULT_MESSAGE = URIRef(_SH + "resultMessage")
_SH_SEVERITY = URIRef(_SH + "resultSeverity")
_SH_SOURCE_SHAPE = URIRef(_SH + "sourceShape")


@dataclass(frozen=True, slots=True)
class ShaclViolation:
    """Representa una violación SHACL lo suficientemente informativa.

    No se guarda el nodo resultado original para mantener el objeto libre de
    dependencias de ``rdflib`` en capas superiores (DTO serializable).
    """

    focus_node: str
    path: str | None
    message: str
    severity: str
    source_shape: str | None


@dataclass(frozen=True, slots=True)
class ValidationReport:
    """Resultado de una validación SHACL."""

    conforms: bool
    violations: tuple[ShaclViolation, ...] = field(default_factory=tuple)
    text_report: str = ""


class ShaclValidator:
    """Valida grafos RDF contra un shapes graph precargado.

    Se carga el shapes graph en el constructor una sola vez: ``pyshacl`` tarda
    decenas de milisegundos en parsear un fichero SHACL y validar en caliente
    repetidas veces es un escenario común (tests, pipelines). Por diseño la
    instancia es reutilizable e inmutable tras construirse.
    """

    def __init__(self, shapes_path: Path) -> None:
        if not shapes_path.exists():
            raise FileNotFoundError(f"No se encuentra el shapes graph: {shapes_path}")
        self._shapes_path = shapes_path
        self._shapes_graph = Graph()
        bind_all(self._shapes_graph)
        self._shapes_graph.parse(shapes_path, format="turtle")

    @property
    def shapes_path(self) -> Path:
        return self._shapes_path

    @property
    def shapes_graph(self) -> Graph:
        return self._shapes_graph

    def validate(self, graph: Graph | Dataset) -> ValidationReport:
        """Ejecuta la validación SHACL y construye el informe tipado.

        Se prefiere pasar ``data_graph=Graph`` (aplanado) para que
        ``pyshacl`` pueda evaluar todas las formas contra la unión de
        tripletas, especialmente importante cuando el caller trabaja con un
        :class:`rdflib.Dataset` con named graphs.
        """
        data_graph = _flatten(graph)

        conforms_raw, report_graph_raw, text_report_raw = shacl_validate(
            data_graph=data_graph,
            shacl_graph=self._shapes_graph,
            inference="none",
            abort_on_first=False,
            allow_warnings=True,
            meta_shacl=False,
            advanced=False,
            debug=False,
            serialize_report_graph=False,
        )
        conforms = bool(conforms_raw)
        report_graph = cast(Graph, report_graph_raw)
        text_report = str(text_report_raw)
        violations = tuple(_extract_violations(report_graph))
        return ValidationReport(
            conforms=conforms and not any(v.severity.endswith("Violation") for v in violations),
            violations=violations,
            text_report=text_report,
        )


def _flatten(graph: Graph | Dataset) -> Graph:
    """Convierte un :class:`Dataset` en un ``Graph`` unificado.

    Necesario para SHACL: las shapes de AtlasHabita se evalúan contra todo el
    cuerpo de datos, no contra un único named graph. Si el input ya es un
    ``Graph``, se devuelve tal cual para evitar copias innecesarias.
    """
    if isinstance(graph, Dataset):
        flat = Graph()
        bind_all(flat)
        for quad in graph.quads((None, None, None, None)):
            s, p, o, _ = quad
            flat.add((s, p, o))
        return flat
    return graph


def _extract_violations(report_graph: Graph) -> list[ShaclViolation]:
    """Itera el grafo de informe buscando ``sh:ValidationResult``.

    Se extrae solo lo necesario para el DTO, evitando exponer nodos RDF a
    capas superiores que solo necesitan saber qué falló y dónde.
    """
    violations: list[ShaclViolation] = []
    for node in report_graph.subjects(RDF.type, _SH_RESULT):
        violations.append(
            ShaclViolation(
                focus_node=_value(report_graph, node, _SH_FOCUS_NODE) or "",
                path=_value(report_graph, node, _SH_RESULT_PATH),
                message=_value(report_graph, node, _SH_RESULT_MESSAGE) or "",
                severity=_value(report_graph, node, _SH_SEVERITY) or "",
                source_shape=_value(report_graph, node, _SH_SOURCE_SHAPE),
            )
        )
    return violations


def _value(graph: Graph, subject: Any, predicate: URIRef) -> str | None:
    """Devuelve el primer valor (como cadena) para ``(subject, predicate, ?)``."""
    node = cast(Node, subject)
    value = graph.value(subject=node, predicate=predicate)
    if value is None:
        return None
    return str(value)


__all__ = ["ShaclValidator", "ShaclViolation", "ValidationReport"]
