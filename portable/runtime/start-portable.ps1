$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $PSScriptRoot "python\python.exe"
$pidFile = Join-Path $PSScriptRoot "processes.json"
$logDir = Join-Path $root "logs"
$logFile = Join-Path $logDir "startup.log"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $root "data\video") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $root "data\document") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $root "data\temp") -Force | Out-Null

function Log([string]$message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
  Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
  Write-Host $line
}
function Ready([string]$url) {
  try { $null = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; return $true } catch { return $false }
}
function Start-Hidden([string]$arguments, [string]$workingDirectory) {
  $info = [Diagnostics.ProcessStartInfo]::new()
  $info.FileName = $python; $info.Arguments = $arguments; $info.WorkingDirectory = $workingDirectory
  $info.UseShellExecute = $true; $info.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
  return [Diagnostics.Process]::Start($info)
}

if (-not (Test-Path -LiteralPath $python)) { throw "Bundled Python runtime is missing: $python" }
$env:LOCA_DESKTOP_MODE = "true"
$env:FRONTEND_ORIGINS_RAW = "http://127.0.0.1:5173,http://localhost:5173"
$env:LOCA_VIDEO_BACKEND_PATH = Join-Path $root "backends\video\backend"
$env:LOCA_DOCUMENT_BACKEND_PATH = Join-Path $root "backends\document\backend"
$env:DATA_DIR = Join-Path $root "data\video"
$env:TEMP = Join-Path $root "data\temp"; $env:TMP = $env:TEMP
$env:TESSERACT_CMD = Join-Path $root "tools\tesseract\tesseract.exe"

$processes = @{}
if (-not (Ready "http://127.0.0.1:8765/api/health")) {
  Log "Starting video backend on port 8765"
  $p = Start-Hidden "-m uvicorn video_backend_host:app --app-dir `"$(Join-Path $PSScriptRoot 'hosts')`" --host 127.0.0.1 --port 8765" $env:LOCA_VIDEO_BACKEND_PATH
  $processes.video = $p.Id
}
if (-not (Ready "http://127.0.0.1:8000/api/health")) {
  Log "Starting document backend on port 8000"
  $p = Start-Hidden "-m uvicorn document_backend_host:app --app-dir `"$(Join-Path $PSScriptRoot 'hosts')`" --host 127.0.0.1 --port 8000" (Join-Path $root "data\document")
  $processes.document = $p.Id
}
if (-not (Ready "http://127.0.0.1:5173")) {
  Log "Starting desktop interface on port 5173"
  $p = Start-Hidden "`"$(Join-Path $PSScriptRoot 'hosts\portable_server.py')`" `"$(Join-Path $root 'app')`" 5173" $root
  $processes.frontend = $p.Id
}
$processes | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8

$deadline = (Get-Date).AddSeconds(90)
do {
  $video = Ready "http://127.0.0.1:8765/api/health"
  $document = Ready "http://127.0.0.1:8000/api/health"
  $frontend = Ready "http://127.0.0.1:5173"
  if (-not ($video -and $document -and $frontend)) { Start-Sleep -Seconds 1 }
} while (-not ($video -and $document -and $frontend) -and (Get-Date) -lt $deadline)
Log "Health: frontend=$frontend video=$video document=$document"
if (-not ($video -and $document -and $frontend)) { throw "One or more portable services failed health checks." }
Start-Process "http://127.0.0.1:5173"
Log "Loca Editor Portable is ready"
