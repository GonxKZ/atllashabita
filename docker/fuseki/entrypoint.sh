#!/usr/bin/env bash
#
# Entrypoint de la imagen Fuseki de AtlasHabita.
#
# 1. Copia la configuración proporcionada al ``FUSEKI_BASE``.
# 2. Si existe el directorio ``/staging`` con ficheros ``*.ttl`` (montado
#    desde ``data/rdf`` del repositorio), los carga en el dataset mediante
#    ``tdbloader2`` antes de arrancar el servidor.
# 3. Cede el control al entrypoint original de la imagen upstream para que
#    aplique su lógica de arranque (permisos, logs, UI).

set -euo pipefail

FUSEKI_BASE_DIR="${FUSEKI_BASE:-/fuseki}"
DATASET_DIR="${FUSEKI_BASE_DIR}/databases/atlashabita"
CONFIG_FILE="${FUSEKI_BASE_DIR}/configuration/atlashabita.ttl"
STAGING_DIR="/staging"

mkdir -p "${FUSEKI_BASE_DIR}/configuration" "${DATASET_DIR}"

if [[ -f /fuseki/config.ttl ]]; then
  cp /fuseki/config.ttl "${CONFIG_FILE}"
fi

if [[ -d "${STAGING_DIR}" ]]; then
  shopt -s nullglob
  files=("${STAGING_DIR}"/*.ttl "${STAGING_DIR}"/*.nt "${STAGING_DIR}"/*.trig)
  shopt -u nullglob
  if ((${#files[@]} > 0)); then
    echo "[atlashabita-fuseki] Cargando ${#files[@]} fichero(s) RDF en ${DATASET_DIR}" >&2
    tdb2.tdbloader --loc "${DATASET_DIR}" "${files[@]}"
  else
    echo "[atlashabita-fuseki] No hay ficheros RDF en ${STAGING_DIR}; el dataset arranca vacío." >&2
  fi
fi

exec /docker-entrypoint.sh "$@"
