# syntax=docker/dockerfile:1.7
#
# Imagen Fuseki para desarrollo local de AtlasHabita.
#
# Se parte de la imagen oficial mantenida por ``stain`` (referencia comunitaria
# usada en ejemplos de Apache Jena). La imagen expone Fuseki en 3030 y admite
# configuración vía volumen, que montaremos desde ``docker/fuseki``.
# Se añade la configuración TTL y un entrypoint que carga los ficheros de
# ``data/rdf/*.ttl`` si existen, para que el dataset esté poblado al arrancar.

FROM stain/jena-fuseki:4.10.0

LABEL org.opencontainers.image.title="atlashabita-fuseki"
LABEL org.opencontainers.image.description="Apache Jena Fuseki para el dataset de AtlasHabita (dev)."
LABEL org.opencontainers.image.source="https://github.com/GonxKZ/atllashabita"

ENV ADMIN_PASSWORD=admin \
    FUSEKI_DATASET_NAME=atlashabita \
    FUSEKI_HOME=/jena-fuseki \
    FUSEKI_BASE=/fuseki

COPY config.ttl /fuseki/config.ttl
COPY entrypoint.sh /docker-entrypoint-atlashabita.sh

USER root
RUN chmod +x /docker-entrypoint-atlashabita.sh
USER $FUSEKI_UID

EXPOSE 3030

ENTRYPOINT ["/docker-entrypoint-atlashabita.sh"]
