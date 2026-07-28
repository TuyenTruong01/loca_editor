$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendPidFile = Join-Path $projectRoot ".runtime\frontend-process.json"

& (Join-Path $PSScriptRoot "stop-backends.ps1")

if (Test-Path -LiteralPath $frontendPidFile) {
  $frontendData = Get-Content -LiteralPath $frontendPidFile -Raw | ConvertFrom-Json
  $frontendProcessId = $frontendData.frontend
  if ($frontendProcessId -and (Get-Process -Id $frontendProcessId -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $frontendProcessId -Force
    Wait-Process -Id $frontendProcessId -Timeout 10 -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $frontendPidFile -Force
}

Write-Host "Da tat frontend va hai backend." -ForegroundColor Green
