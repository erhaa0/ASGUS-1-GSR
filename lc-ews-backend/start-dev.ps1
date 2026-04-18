param(
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Join-Path $scriptDir "venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
  Write-Error "Backend venv python not found at $pythonExe"
  exit 1
}

Set-Location $scriptDir
& $pythonExe -m uvicorn main:app --reload --host $BindHost --port $Port
