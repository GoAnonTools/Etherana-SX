#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/desktop/searxng/linux/runtime"
SRC_DIR="${RUNTIME_DIR}/src"
VENV_DIR="${RUNTIME_DIR}/venv"
SETTINGS_FILE="${RUNTIME_DIR}/settings.yml"

SEARXNG_REPO="${SEARXNG_REPO:-https://github.com/searxng/searxng.git}"
SEARXNG_REF="${SEARXNG_REF:-master}"

mkdir -p "${RUNTIME_DIR}"

if [ ! -d "${SRC_DIR}/.git" ]; then
  echo "[searxng-build] Cloning SearXNG..."
  git clone "${SEARXNG_REPO}" "${SRC_DIR}"
fi

echo "[searxng-build] Checking out ${SEARXNG_REF}..."
git -C "${SRC_DIR}" fetch --tags --depth 1 origin "${SEARXNG_REF}" || true
git -C "${SRC_DIR}" checkout "${SEARXNG_REF}"

echo "[searxng-build] Creating Python venv..."
rm -rf "${VENV_DIR}"
python3 -m venv --copies "${VENV_DIR}"

echo "[searxng-build] Installing SearXNG dependencies into runtime venv..."
"${VENV_DIR}/bin/python" -m pip install --upgrade pip wheel setuptools

if [ -f "${SRC_DIR}/requirements.txt" ]; then
  "${VENV_DIR}/bin/python" -m pip install -r "${SRC_DIR}/requirements.txt"
fi

# SearXNG's build metadata can import searx during installation.
# --no-build-isolation lets setup reuse the dependencies already installed above.
echo "[searxng-build] Installing SearXNG into runtime venv..."
"${VENV_DIR}/bin/python" -m pip install --no-build-isolation "${SRC_DIR}"

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

echo "[searxng-build] Runtime ready:"
echo "  ${RUNTIME_DIR}"
echo
echo "Test with:"
echo "  desktop/searxng/linux/searxng"
