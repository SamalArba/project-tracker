<#
  Setup Postgres locally using Docker Desktop and wire Prisma.
  Usage (PowerShell):
    - Run as Admin the first time if Docker Desktop needs to be installed
    - powershell -ExecutionPolicy Bypass -File server/scripts/setup-postgres.ps1
#>

function Ensure-DockerDesktop {
  try {
    $ver = (docker --version) 2>$null
    if ($LASTEXITCODE -eq 0) { return }
  } catch {}

  Write-Host "Docker Desktop not found. Installing via winget..." -ForegroundColor Yellow
  winget install --id Docker.DockerDesktop --silent --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install Docker Desktop via winget. Install manually from https://www.docker.com/products/docker-desktop/ and re-run this script."
    exit 1
  }
}

function Ensure-DockerEngine {
  # Try to start Docker Desktop (if installed) and wait for the engine
  $dockerDesktop = "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerDesktop) {
    Start-Process -FilePath $dockerDesktop -ErrorAction SilentlyContinue | Out-Null
  }
  Write-Host "Waiting for Docker engine to be ready..." -ForegroundColor Cyan
  $tries = 0
  while ($tries -lt 180) {
    try {
      docker info 1>$null 2>$null
      if ($LASTEXITCODE -eq 0) { return }
    } catch {}
    Start-Sleep -Seconds 2
    $tries++
  }
  Write-Error "Docker engine did not become ready. Open Docker Desktop and ensure \"Docker Engine running\" is shown, then re-run."
  exit 1
}

function Ensure-PostgresContainer {
  param([int]$PreferredPort = 5432)

  # Check if container exists
  docker inspect pg 1>$null 2>$null
  if ($LASTEXITCODE -eq 0) {
    # Ensure it's running
    docker start pg 1>$null 2>$null | Out-Null
    return $PreferredPort
  }

  # Try to run on preferred port; if busy, try 5433
  $port = $PreferredPort
  docker run --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=project_tracker -p ${port}:5432 -d postgres:16 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    $port = 5433
    Write-Host "Port 5432 busy, falling back to ${port}." -ForegroundColor Yellow
    docker run --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=project_tracker -p ${port}:5432 -d postgres:16 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Failed to start Postgres container. Run 'docker logs pg' or ensure no conflicting container."; exit 1
    }
  }
  return $port
}

function Write-EnvFile {
  param([string]$ServerRoot,[int]$Port)
  $envPath = Join-Path $ServerRoot ".env"
  $url = "postgresql://postgres:postgres@localhost:${Port}/project_tracker?schema=public"
  Set-Content -Path $envPath -Value "DATABASE_URL=\"$url\""
  Write-Host "Wrote $envPath with DATABASE_URL." -ForegroundColor Green
}

function Run-Prisma {
  param([string]$ServerRoot)
  Push-Location $ServerRoot
  try {
    npx prisma migrate dev --name init_pg
    if ($LASTEXITCODE -ne 0) { throw "prisma migrate failed" }
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }
  } finally {
    Pop-Location
  }
}

# ---- Main ----
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverRoot = Split-Path -Parent $scriptRoot  # server

Ensure-DockerDesktop
Ensure-DockerEngine
$port = Ensure-PostgresContainer -PreferredPort 5432
Write-EnvFile -ServerRoot $serverRoot -Port $port
Run-Prisma -ServerRoot $serverRoot

Write-Host "Postgres is running in Docker (container: 'pg')." -ForegroundColor Green
Write-Host "DATABASE_URL configured. You can now start your server as before." -ForegroundColor Green


