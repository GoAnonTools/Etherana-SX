$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$RuntimeDir = Join-Path $RootDir "desktop\searxng\windows\runtime"
$SrcDir = Join-Path $RuntimeDir "src"
$VenvDir = Join-Path $RuntimeDir "venv"
$SettingsFile = Join-Path $RuntimeDir "settings.yml"

$SearxngRepo = if ($env:SEARXNG_REPO) { $env:SEARXNG_REPO } else { "https://github.com/searxng/searxng.git" }
$SearxngRef = if ($env:SEARXNG_REF) { $env:SEARXNG_REF } else { "master" }

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

if (!(Test-Path (Join-Path $SrcDir ".git"))) {
  Write-Host "[searxng-build-windows] Cloning SearXNG..."
  git clone $SearxngRepo $SrcDir
}

Write-Host "[searxng-build-windows] Checking out $SearxngRef..."
git -C $SrcDir fetch --tags --depth 1 origin $SearxngRef
git -C $SrcDir checkout $SearxngRef

Write-Host "[searxng-build-windows] Creating Python venv..."
if (Test-Path $VenvDir) {
  Remove-Item -Recurse -Force $VenvDir
}

python -m venv $VenvDir

$Python = Join-Path $VenvDir "Scripts\python.exe"

Write-Host "[searxng-build-windows] Installing dependencies..."
& $Python -m pip install --upgrade pip wheel setuptools

$Requirements = Join-Path $SrcDir "requirements.txt"
if (Test-Path $Requirements) {
  & $Python -m pip install -r $Requirements
}

Write-Host "[searxng-build-windows] Installing SearXNG..."
& $Python -m pip install --no-build-isolation $SrcDir

@"
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
"@ | Set-Content -Encoding UTF8 $SettingsFile

$LimiterFile = Join-Path $RuntimeDir "limiter.toml"
if (Test-Path $LimiterFile) {
  Remove-Item -Force $LimiterFile
}

Write-Host "[searxng-build-windows] Runtime ready:"
Write-Host "  $RuntimeDir"
