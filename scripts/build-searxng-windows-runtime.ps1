$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  & $Command @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$RuntimeDir = Join-Path $RootDir "desktop\searxng\windows\runtime"
$SrcDir = Join-Path $RuntimeDir "src"
$VenvDir = Join-Path $RuntimeDir "venv"
$SettingsFile = Join-Path $RuntimeDir "settings.yml"

$SearxngRepo = if ($env:SEARXNG_REPO) { $env:SEARXNG_REPO } else { "https://github.com/searxng/searxng.git" }
$SearxngRef = if ($env:SEARXNG_REF) { $env:SEARXNG_REF } else { "master" }

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

if (!(Test-Path (Join-Path $SrcDir ".git"))) {
  Write-Host "[searxng-build-windows] Cloning SearXNG without checkout..."
  Invoke-Checked "git" @("clone", "--no-checkout", $SearxngRepo, $SrcDir)
}

Write-Host "[searxng-build-windows] Configuring sparse checkout for Windows-safe paths..."
Invoke-Checked "git" @("-C", $SrcDir, "sparse-checkout", "init", "--no-cone")

$SparseCheckoutFile = Join-Path $SrcDir ".git\info\sparse-checkout"

@"
/*
!utils/templates/etc/httpd/sites-available/searxng.conf:socket
!utils/templates/etc/nginx/default.apps-available/searxng.conf:socket
!utils/templates/etc/uwsgi/apps-archlinux/searxng.ini:socket
!utils/templates/etc/uwsgi/apps-available/searxng.ini:socket
"@ | Set-Content -Encoding UTF8 $SparseCheckoutFile

Write-Host "[searxng-build-windows] Checking out $SearxngRef..."
Invoke-Checked "git" @("-C", $SrcDir, "fetch", "--tags", "--depth", "1", "origin", $SearxngRef)
Invoke-Checked "git" @("-C", $SrcDir, "checkout", "FETCH_HEAD")

Write-Host "[searxng-build-windows] Creating Python venv..."
if (Test-Path $VenvDir) {
  Remove-Item -Recurse -Force $VenvDir
}

Invoke-Checked "python" @("-m", "venv", $VenvDir)

$Python = Join-Path $VenvDir "Scripts\python.exe"

Write-Host "[searxng-build-windows] Installing dependencies..."
Invoke-Checked $Python @("-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools")

$Requirements = Join-Path $SrcDir "requirements.txt"
if (Test-Path $Requirements) {
  Invoke-Checked $Python @("-m", "pip", "install", "-r", $Requirements)
}

Write-Host "[searxng-build-windows] Installing SearXNG..."
Invoke-Checked $Python @("-m", "pip", "install", "--no-build-isolation", $SrcDir)

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
