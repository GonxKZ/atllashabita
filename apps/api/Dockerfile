FROM python:3.14-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY apps/api/pyproject.toml apps/api/README.md ./apps/api/
RUN python -m pip install --upgrade pip \
 && pip install --prefix /install "fastapi>=0.115" "uvicorn[standard]>=0.32" \
      "pydantic>=2.9" "pydantic-settings>=2.6" "rdflib>=7.1" "pyshacl>=0.27" \
      "httpx>=0.28" "tenacity>=9.0" "structlog>=24.4" "orjson>=3.10" "python-slugify>=8.0"

FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=base /install /usr/local
COPY apps/api /app/apps/api
COPY ontology /app/ontology
RUN pip install --no-deps -e apps/api

EXPOSE 8000
CMD ["uvicorn", "atlashabita.interfaces.api:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
