param(
  [string]$FrontendOrigin = "http://127.0.0.1:5173",
  [string]$VideoBackend = "D:\Phong lam viec\02 Chinh sua Video\backend",
  [string]$DocumentBackend = "D:\Phong lam viec\03 Chinh sua van ban\loca_converter\backend"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot ".runtime"
$videoPython = Join-Path $runtimeRoot "video-venv\Scripts\python.exe"
$documentPython = Join-Path $runtimeRoot "document-venv\Scripts\python.exe"
$logs = Join-Path $runtimeRoot "logs"
$pidFile = Join-Path $runtimeRoot "backend-processes.json"

if (-not (Test-Path -LiteralPath $videoPython) -or -not (Test-Path -LiteralPath $documentPython)) {
  throw "Backend environments are missing. Run .\scripts\setup-backends.ps1 first."
}

New-Item -ItemType Directory -Path $logs -Force | Out-Null
$origins = @("http://127.0.0.1:5173", "http://localhost:5173", $FrontendOrigin) | Select-Object -Unique
$env:FRONTEND_ORIGINS_RAW = $origins -join ","

$video = Start-Process -FilePath $videoPython -ArgumentList @("-m", "uvicorn", "app.main:create_app", "--factory", "--host", "127.0.0.1", "--port", "8765") -WorkingDirectory $VideoBackend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs "video.out.log") -RedirectStandardError (Join-Path $logs "video.err.log") -PassThru
$document = Start-Process -FilePath $documentPython -ArgumentList @("-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000") -WorkingDirectory $DocumentBackend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs "document.out.log") -RedirectStandardError (Join-Path $logs "document.err.log") -PassThru

@{ video = $video.Id; document = $document.Id } | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8

function Wait-ForHealth([string]$Name, [string]$Url) {
  $deadline = (Get-Date).AddSeconds(25)
  do {
    Start-Sleep -Milliseconds 500
    try {
      $null = Invoke-RestMethod -Uri $Url -TimeoutSec 2
      Write-Host "$Name is ready: $Url" -ForegroundColor Green
      return
    } catch {}
  } while ((Get-Date) -lt $deadline)
  Write-Warning "$Name did not respond. Check logs in $logs"
}

Wait-ForHealth "Video backend" "http://127.0.0.1:8765/api/health"
Wait-ForHealth "Document backend" "http://127.0.0.1:8000/api/health"
