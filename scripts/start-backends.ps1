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
$videoData = Join-Path $runtimeRoot "video-data"
$documentWork = Join-Path $runtimeRoot "document-work"

if (-not (Test-Path -LiteralPath $videoPython) -or -not (Test-Path -LiteralPath $documentPython)) {
  throw "Backend environments are missing. Run .\scripts\setup-backends.ps1 first."
}

New-Item -ItemType Directory -Path $logs -Force | Out-Null
New-Item -ItemType Directory -Path $videoData -Force | Out-Null
New-Item -ItemType Directory -Path $documentWork -Force | Out-Null
$origins = @("http://127.0.0.1:5173", "http://localhost:5173", $FrontendOrigin) | Select-Object -Unique
$env:FRONTEND_ORIGINS_RAW = $origins -join ","
$env:DATA_DIR = $videoData
$env:LOCA_VIDEO_BACKEND_PATH = $VideoBackend
$env:LOCA_DOCUMENT_BACKEND_PATH = $DocumentBackend

function Start-HiddenBackend {
  param([string]$Python, [string]$Arguments, [string]$WorkingDirectory)
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $Python
  $startInfo.Arguments = $Arguments
  $startInfo.WorkingDirectory = $WorkingDirectory
  $startInfo.UseShellExecute = $true
  $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
  return [System.Diagnostics.Process]::Start($startInfo)
}

$videoArguments = "-m uvicorn video_backend_host:app --app-dir `"$PSScriptRoot`" --host 127.0.0.1 --port 8765"
$video = Start-HiddenBackend -Python $videoPython -Arguments $videoArguments -WorkingDirectory $VideoBackend
$documentArguments = "-m uvicorn document_backend_host:app --app-dir `"$PSScriptRoot`" --host 127.0.0.1 --port 8000"
$document = Start-HiddenBackend -Python $documentPython -Arguments $documentArguments -WorkingDirectory $documentWork

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
