"""CLI administrativo del pipeline de datos de AtlasHabita.

Uso mínimo::

    python scripts/data_pipeline.py ingest

El subcomando ``ingest`` ejecuta :class:`DatasetBuilder`, respeta el modo
offline por defecto (fixtures versionados) y escribe los CSV normalizados
bajo ``data/processed`` junto con un manifiesto en
``data/reports/dataset_builder_manifest.json``.

No se instala como ``entry_point`` para evitar contaminar el entorno global
ni confundir a usuarios finales. Siempre se invoca explícitamente con
``python scripts/data_pipeline.py``.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = REPO_ROOT / "apps" / "api" / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from atlashabita.config import Settings  # noqa: E402
from atlashabita.infrastructure.ingestion import (  # noqa: E402
    DatasetBuilder,
    Downloader,
)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="data_pipeline",
        description=(
            "CLI administrativo del pipeline de datos. Ejecuta los conectores"
            " oficiales (INE, MITECO) y genera los CSV normalizados."
        ),
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest = subparsers.add_parser(
        "ingest",
        help="Ejecuta todos los conectores y escribe data/processed/*.csv",
    )
    ingest.add_argument(
        "--data-root",
        type=Path,
        default=None,
        help="Directorio raíz (por defecto el configurado en Settings).",
    )
    return parser


def _command_ingest(data_root: Path | None) -> int:
    settings = Settings() if data_root is None else Settings(data_root=data_root)
    processed_dir = settings.data_zone("processed")
    raw_dir = settings.data_zone("raw")
    reports_dir = settings.data_zone("reports")

    raw_dir.mkdir(parents=True, exist_ok=True)
    downloader = Downloader(cache_dir=raw_dir)
    builder = DatasetBuilder(
        downloader=downloader,
        processed_dir=processed_dir,
        reports_dir=reports_dir,
    )
    manifest = builder.build()
    print(f"Manifest escrito en: {manifest.manifest_path}")
    for artifact in manifest.artifacts:
        print(
            f"  - {artifact.source_id}: {artifact.row_count} filas "
            f"(cache={artifact.from_cache}) -> {artifact.processed_path}"
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    if args.command == "ingest":
        return _command_ingest(args.data_root)
    parser.error(f"Comando desconocido: {args.command!r}")
    return 2  # pragma: no cover


if __name__ == "__main__":  # pragma: no cover — entry-point manual.
    raise SystemExit(main())
