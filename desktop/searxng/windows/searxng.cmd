@echo off
setlocal

set ROOT_DIR=%~dp0
set RUNTIME_DIR=%ROOT_DIR%runtime
set VENV_PY=%RUNTIME_DIR%\venv\Scripts\python.exe
set SETTINGS_FILE=%RUNTIME_DIR%\settings.yml

if "%SEARXNG_PORT%"=="" set SEARXNG_PORT=8080
if "%SEARXNG_HOST%"=="" set SEARXNG_HOST=127.0.0.1

if not exist "%VENV_PY%" (
  echo [searxng-windows] Missing runtime venv at %RUNTIME_DIR%\venv 1>&2
  echo [searxng-windows] Build it with: npm run desktop:searxng:build:windows 1>&2
  exit /b 1
)

if not exist "%SETTINGS_FILE%" (
  echo [searxng-windows] Missing settings file at %SETTINGS_FILE% 1>&2
  exit /b 1
)

set SEARXNG_SETTINGS_PATH=%SETTINGS_FILE%
set PYTHONDONTWRITEBYTECODE=1
set PYTHONNOUSERSITE=1

echo [searxng-windows] Starting SearXNG on http://%SEARXNG_HOST%:%SEARXNG_PORT%
"%VENV_PY%" -m searx.webapp
