#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEARXNG_COMPOSE_FILE="${ROOT_DIR}/docker-compose.searxng-local.yaml"

echo "[dev:all] Starting Docker services (if available)..."

ensure_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    return 0
  fi
  echo "[dev:all] Docker Compose not found — attempting to install docker-compose-plugin..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq docker-compose-plugin 2>/dev/null && {
      echo "[dev:all] docker-compose-plugin installed successfully."
      return 0
    } || true
  fi
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y docker-compose-plugin 2>/dev/null && {
      echo "[dev:all] docker-compose-plugin installed successfully."
      return 0
    } || true
  fi
  return 1
}

compose_up() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[dev:all] Docker binary not found."
    return 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "[dev:all] Docker daemon is not running. Please start Docker and try again."
    return 1
  fi
  if ! ensure_docker_compose; then
    echo "[dev:all] Could not find or install Docker Compose."
    echo "[dev:all] Install manually: sudo apt install docker-compose-plugin"
    return 1
  fi
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "${SEARXNG_COMPOSE_FILE}" up -d
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "${SEARXNG_COMPOSE_FILE}" up -d
    return 0
  fi
  return 1
}

if compose_up; then
  echo "[dev:all] Docker services are up."
else
  echo "[dev:all] Note: web search / Discover features may fail unless SearXNG is running."
fi

echo "[dev:all] Starting Next.js dev server..."
cd "${ROOT_DIR}"
exec npm run dev:web

