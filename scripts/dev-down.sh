#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEARXNG_COMPOSE_FILE="${ROOT_DIR}/docker-compose.searxng-local.yaml"

echo "[dev:down] Stopping Docker services (if available)..."

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "${SEARXNG_COMPOSE_FILE}" down
    exit 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "${SEARXNG_COMPOSE_FILE}" down
    exit 0
  fi
fi

echo "[dev:down] Docker not available/running — nothing to stop."

