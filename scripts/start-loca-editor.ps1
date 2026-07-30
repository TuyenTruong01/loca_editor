$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot ".runtime"
$frontendPidFile = Join-Path $runtimeRoot "frontend-process.json"

function Test-Endpoint([string]$Url) {
  try {
    $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $true
  } catch {
    return $false
  }
}

$videoReady = Test-Endpoint "http://127.0.0.1:8765/api/health"
$documentReady = Test-Endpoint "http://127.0.0.1:8000/api/health"

if (-not ($videoReady -and $documentReady)) {
  & (Join-Path $PSScriptRoot "stop-backends.ps1")
  & (Join-Path $PSScriptRoot "start-backends.ps1") -FrontendOrigin "http://127.0.0.1:5173"
}

if (-not (Test-Endpoint "http://127.0.0.1:5173")) {
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = "npm.cmd"
  # Keep the launcher and Vite on the same fixed port. Without strictPort,
  # Vite can silently move to 5174 while this script continues checking 5173.
  $startInfo.Arguments = "run dev -- --port 5173 --strictPort"
  $startInfo.WorkingDirectory = $projectRoot
  $startInfo.UseShellExecute = $true
  $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
  $frontend = [System.Diagnostics.Process]::Start($startInfo)
  @{ frontend = $frontend.Id } | ConvertTo-Json | Set-Content -LiteralPath $frontendPidFile -Encoding UTF8

  # The first Vite startup can take longer while dependencies are optimized.
  $deadline = (Get-Date).AddSeconds(90)
  do {
    Start-Sleep -Milliseconds 500
    if ($frontend.HasExited) {
      throw "Frontend exited during startup. Exit code: $($frontend.ExitCode)"
    }
  } while (-not (Test-Endpoint "http://127.0.0.1:5173") -and (Get-Date) -lt $deadline)
}

if (-not (Test-Endpoint "http://127.0.0.1:5173")) {
  throw "Frontend did not respond at http://127.0.0.1:5173"
}

Write-Host "Video backend:    http://127.0.0.1:8765" -ForegroundColor Green
Write-Host "Document backend: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Loca Editor:      http://127.0.0.1:5173" -ForegroundColor Green
Start-Process "http://127.0.0.1:5173"
