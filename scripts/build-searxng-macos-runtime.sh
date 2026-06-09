#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/desktop/searxng/macos/runtime"
SRC_DIR="${RUNTIME_DIR}/src"
VENV_DIR="${RUNTIME_DIR}/venv"
SETTINGS_FILE="${RUNTIME_DIR}/settings.yml"

SEARXNG_REPO="${SEARXNG_REPO:-https://github.com/searxng/searxng.git}"
SEARXNG_REF="${SEARXNG_REF:-master}"

mkdir -p "${RUNTIME_DIR}"
rm -rf "${SRC_DIR}"
mkdir -p "${SRC_DIR}"

echo "[searxng-build-macos] Fetching SearXNG without full checkout..."
git -C "${SRC_DIR}" init
git -C "${SRC_DIR}" remote add origin "${SEARXNG_REPO}"
git -C "${SRC_DIR}" fetch --depth 1 origin "${SEARXNG_REF}"
git -C "${SRC_DIR}" update-ref refs/heads/etherana-build FETCH_HEAD
git -C "${SRC_DIR}" symbolic-ref HEAD refs/heads/etherana-build

echo "[searxng-build-macos] Reading package tree..."
mapfile -t TREE_PATHS < <(git -C "${SRC_DIR}" ls-tree -r --name-only FETCH_HEAD)

has_tree_path() {
  local candidate="$1"
  local path_item
  for path_item in "${TREE_PATHS[@]}"; do
    if [[ "${path_item}" == "${candidate}" || "${path_item}" == "${candidate}/"* ]]; then
      return 0
    fi
  done
  return 1
}

CANDIDATES=(
  "setup.py"
  "setup.cfg"
  "pyproject.toml"
  "requirements.txt"
  "requirements-dev.txt"
  "README.rst"
  "README.md"
  "AUTHORS.rst"
  "LICENSE"
  "LICENSE.txt"
  "LICENSE.md"
  "searx"
  "searxng_extra"
)

PATHS_TO_CHECKOUT=()

for candidate in "${CANDIDATES[@]}"; do
  if has_tree_path "${candidate}"; then
    PATHS_TO_CHECKOUT+=("${candidate}")
  else
    echo "[searxng-build-macos] Skipping missing path: ${candidate}"
  fi
done

if [[ "${#PATHS_TO_CHECKOUT[@]}" -eq 0 ]]; then
  echo "No SearXNG package paths were found." >&2
  exit 1
fi

echo "[searxng-build-macos] Checking out package paths..."
git -C "${SRC_DIR}" checkout FETCH_HEAD -- "${PATHS_TO_CHECKOUT[@]}"

echo "[searxng-build-macos] Creating Python venv..."
rm -rf "${VENV_DIR}"
python3 -m venv "${VENV_DIR}"

PYTHON="${VENV_DIR}/bin/python"

echo "[searxng-build-macos] Installing dependencies..."
"${PYTHON}" -m pip install --upgrade pip wheel setuptools

if [[ -f "${SRC_DIR}/requirements.txt" ]]; then
  "${PYTHON}" -m pip install -r "${SRC_DIR}/requirements.txt"
fi

echo "[searxng-build-macos] Installing SearXNG..."
"${PYTHON}" -m pip install --no-build-isolation "${SRC_DIR}"

cat > "${SETTINGS_FILE}" <<'YAML'
use_default_settings: true

server:
  bind_address: "127.0.0.1"
  port: 8080
  secret_key: "etherana-local-desktop-change-me"
  limiter: false
  public_instance: false

search:
  formats:
    - html
    - json
YAML

rm -f "${RUNTIME_DIR}/limiter.toml"

echo "[searxng-build-macos] Runtime ready:"
echo "  ${RUNTIME_DIR}"
