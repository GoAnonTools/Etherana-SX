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

function Get-GitTreePaths {
  param(
    [string]$RepoDir,
    [string]$Ref
  )

  $Output = & git -C $RepoDir ls-tree -r --name-only $Ref

  if ($LASTEXITCODE -ne 0) {
    throw "git ls-tree failed with exit code $LASTEXITCODE"
  }

  return @($Output)
}

function Test-TreePath {
  param(
    [string[]]$TreePaths,
    [string]$GitPath
  )

  foreach ($TreePath in $TreePaths) {
    if ($TreePath -eq $GitPath -or $TreePath.StartsWith("$GitPath/")) {
      return $true
    }
  }

  return $false
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$RuntimeDir = Join-Path $RootDir "desktop\searxng\windows\runtime"
$SrcDir = Join-Path $RuntimeDir "src"
$VenvDir = Join-Path $RuntimeDir "venv"
$SettingsFile = Join-Path $RuntimeDir "settings.yml"

$SearxngRepo = if ($env:SEARXNG_REPO) { $env:SEARXNG_REPO } else { "https://github.com/searxng/searxng.git" }
$SearxngRef = if ($env:SEARXNG_REF) { $env:SEARXNG_REF } else { "master" }

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

if (Test-Path $SrcDir) {
  Remove-Item -Recurse -Force $SrcDir
}

New-Item -ItemType Directory -Force -Path $SrcDir | Out-Null

Write-Host "[searxng-build-windows] Fetching SearXNG without full checkout..."
Invoke-Checked "git" @("-C", $SrcDir, "init")
Invoke-Checked "git" @("-C", $SrcDir, "remote", "add", "origin", $SearxngRepo)
Invoke-Checked "git" @("-C", $SrcDir, "fetch", "--depth", "1", "origin", $SearxngRef)

Write-Host "[searxng-build-windows] Pointing HEAD at fetched SearXNG commit..."
Invoke-Checked "git" @("-C", $SrcDir, "update-ref", "refs/heads/etherana-build", "FETCH_HEAD")
Invoke-Checked "git" @("-C", $SrcDir, "symbolic-ref", "HEAD", "refs/heads/etherana-build")

Write-Host "[searxng-build-windows] Reading package tree..."
$TreePaths = Get-GitTreePaths -RepoDir $SrcDir -Ref "FETCH_HEAD"

Write-Host "[searxng-build-windows] Checking out Windows-safe package paths..."

$CandidatePaths = @(
  "setup.py",
  "setup.cfg",
  "pyproject.toml",
  "requirements.txt",
  "requirements-dev.txt",
  "README.rst",
  "README.md",
  "AUTHORS.rst",
  "LICENSE",
  "LICENSE.txt",
  "LICENSE.md",
  "searx",
  "searxng_extra"
)

$PathsToCheckout = @()

foreach ($CandidatePath in $CandidatePaths) {
  if (Test-TreePath -TreePaths $TreePaths -GitPath $CandidatePath) {
    $PathsToCheckout += $CandidatePath
  } else {
    Write-Host "[searxng-build-windows] Skipping missing path: $CandidatePath"
  }
}

if ($PathsToCheckout.Count -eq 0) {
  throw "No SearXNG package paths were found."
}

Invoke-Checked "git" (@("-C", $SrcDir, "checkout", "FETCH_HEAD", "--") + $PathsToCheckout)

Write-Host "[searxng-build-windows] Checked out paths:"
foreach ($CheckedOutPath in $PathsToCheckout) {
  Write-Host "  - $CheckedOutPath"
}

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
