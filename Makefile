SHELL := /usr/bin/env bash
PYTHON ?= python
VENV ?= .venv
PIP := $(VENV)/bin/pip
PYBIN := $(VENV)/bin/python

.PHONY: help
help: ## Lista los objetivos disponibles
	@awk 'BEGIN {FS = ":.*##"; printf "\nUso: make \033[36m<objetivo>\033[0m\n\nObjetivos:\n"} /^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: bootstrap
bootstrap: bootstrap-api bootstrap-web ## Instala backend y frontend desde cero

.PHONY: bootstrap-api
bootstrap-api: ## Crea venv y dependencias del backend
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e "apps/api[dev]"

.PHONY: bootstrap-web
bootstrap-web: ## Instala dependencias del frontend
	cd apps/web && pnpm install

.PHONY: dev
dev: ## Arranca backend y frontend en paralelo (foreground)
	@echo "Backend:  uvicorn atlashabita.interfaces.api:create_app --factory --reload"
	@echo "Frontend: pnpm -C apps/web dev"
	@( $(VENV)/bin/uvicorn atlashabita.interfaces.api:create_app --factory --reload & \
	   cd apps/web && pnpm dev & wait )

.PHONY: dev-api
dev-api: ## Arranca sólo el backend
	$(VENV)/bin/uvicorn atlashabita.interfaces.api:create_app --factory --reload

.PHONY: dev-web
dev-web: ## Arranca sólo el frontend
	cd apps/web && pnpm dev

.PHONY: lint
lint: lint-api lint-web ## Lint completo

.PHONY: lint-api
lint-api: ## Ruff sobre el backend
	$(VENV)/bin/ruff check apps/api/src apps/api/tests

.PHONY: lint-web
lint-web: ## ESLint sobre el frontend
	cd apps/web && pnpm lint

.PHONY: typecheck
typecheck: typecheck-api typecheck-web ## mypy + tsc

.PHONY: typecheck-api
typecheck-api: ## mypy sobre el backend
	$(VENV)/bin/mypy apps/api/src

.PHONY: typecheck-web
typecheck-web: ## tsc sobre el frontend
	cd apps/web && pnpm typecheck

.PHONY: test
test: test-api test-web ## Tests unitarios de ambos lados

.PHONY: test-api
test-api: ## pytest
	$(VENV)/bin/pytest apps/api/tests

.PHONY: test-web
test-web: ## vitest
	cd apps/web && pnpm test

.PHONY: build
build: build-web ## Build de producción del frontend
	cd apps/web && pnpm build

.PHONY: e2e
e2e: ## Playwright smoke
	cd apps/web && pnpm e2e

.PHONY: clean
clean: ## Borra artefactos locales
	rm -rf $(VENV) apps/web/node_modules apps/web/dist apps/web/playwright-report apps/web/test-results

.PHONY: fuseki-up
fuseki-up: ## Arranca Fuseki (compose profile fuseki)
	docker compose --profile fuseki up -d fuseki

.PHONY: fuseki-down
fuseki-down: ## Detiene Fuseki y conserva el volumen de datos
	docker compose --profile fuseki down

.PHONY: fuseki-load
fuseki-load: ## Carga los ficheros data/rdf/*.ttl en el dataset de Fuseki
	@if [ ! -d data/rdf ]; then echo "data/rdf/ no existe; nada que cargar" >&2; exit 1; fi
	for f in data/rdf/*.ttl data/rdf/*.nt data/rdf/*.trig; do \
	  [ -e "$$f" ] || continue; \
	  echo "Cargando $$f"; \
	  curl -sS -u admin:admin \
	    -H "Content-Type: text/turtle" \
	    --data-binary @$$f \
	    http://127.0.0.1:3030/atlashabita/data?default ; \
	done
