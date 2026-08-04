$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot ".runtime"
$frontendPidFile = Join-Path $runtimeRoot "frontend-process.json"
$logDirectory = Join-Path $projectRoot "logs"
$logFile = Join-Path $logDirectory "startup.log"
$serviceName = "cloudflared"

$urls = [ordered]@{
  Frontend       = "http://127.0.0.1:5173"
  VideoLocal     = "http://127.0.0.1:8765/api/health"
  DocumentLocal  = "http://127.0.0.1:8000/api/health"
  VideoTunnel    = "https://video-api.tuyentruong.xyz/api/health"
  DocumentTunnel = "https://document-api.tuyentruong.xyz/api/health"
}

New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Write-StartupLog {
  param(
    [string]$Message,
    [ConsoleColor]$Color = [ConsoleColor]::Gray
  )
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
  Write-Host $line -ForegroundColor $Color
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-Health {
  param(
    [string]$Name,
    [string]$Url,
    [switch]$Quiet
  )
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    $ok = $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
    if (-not $Quiet) {
      Write-StartupLog "$Name OK - HTTP $($response.StatusCode) - $Url" Green
    }
    return $ok
  } catch {
    if (-not $Quiet) {
      Write-StartupLog "$Name FAILED - $Url - $($_.Exception.Message)" Red
    }
    return $false
  }
}

function Invoke-ServiceCommand {
  param([ValidateSet("start", "stop")][string]$Action)
  Write-StartupLog "Running: sc.exe $Action $serviceName" Yellow
  $output = & sc.exe $Action $serviceName 2>&1
  foreach ($line in $output) {
    Write-StartupLog "sc.exe: $line"
  }
  if ($LASTEXITCODE -ne 0) {
    throw "sc.exe $Action $serviceName failed with exit code $LASTEXITCODE"
  }
}

function Wait-ServiceState {
  param(
    [System.ServiceProcess.ServiceController]$Service,
    [System.ServiceProcess.ServiceControllerStatus]$Status,
    [int]$Seconds = 20
  )
  $Service.WaitForStatus($Status, [TimeSpan]::FromSeconds($Seconds))
  $Service.Refresh()
  Write-StartupLog "Service $serviceName state: $($Service.Status)" Cyan
}

Write-StartupLog "========== Loca Editor startup started ==========" Cyan

if (-not (Test-IsAdministrator)) {
  Write-StartupLog "Administrator permission is required. Run Chay Loca Editor.cmd as administrator." Red
  throw "Administrator permission is required."
}

$cloudflared = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $cloudflared) {
  Write-StartupLog "Windows service '$serviceName' was not found." Red
  throw "Windows service '$serviceName' was not found."
}

Write-StartupLog "Service $serviceName initial state: $($cloudflared.Status)" Cyan
if ($cloudflared.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
  Invoke-ServiceCommand -Action start
  Wait-ServiceState -Service $cloudflared -Status ([System.ServiceProcess.ServiceControllerStatus]::Running)
}

# Reuse healthy local backend processes. If either backend is unavailable,
# stop the tracked pair first so uvicorn is never duplicated on the same ports.
$videoReady = Test-Health -Name "Video local port 8765" -Url $urls.VideoLocal -Quiet
$documentReady = Test-Health -Name "Document local port 8000" -Url $urls.DocumentLocal -Quiet
if (-not ($videoReady -and $documentReady)) {
  Write-StartupLog "One or more local backends are unavailable; starting the managed backend pair." Yellow
  & (Join-Path $PSScriptRoot "stop-backends.ps1")
  & (Join-Path $PSScriptRoot "start-backends.ps1") -FrontendOrigin $urls.Frontend
} else {
  Write-StartupLog "Existing local backend processes are healthy; no duplicate processes were started." Green
}

# Reuse Vite when port 5173 is already healthy.
$frontend = $null
if (-not (Test-Health -Name "Frontend port 5173" -Url $urls.Frontend -Quiet)) {
  Write-StartupLog "Starting frontend on port 5173." Yellow
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = "npm.cmd"
  $startInfo.Arguments = "run dev -- --port 5173 --strictPort"
  $startInfo.WorkingDirectory = $projectRoot
  $startInfo.UseShellExecute = $true
  $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
  $frontend = [System.Diagnostics.Process]::Start($startInfo)
  @{ frontend = $frontend.Id } | ConvertTo-Json | Set-Content -LiteralPath $frontendPidFile -Encoding UTF8
} else {
  Write-StartupLog "Existing frontend on port 5173 is healthy; no duplicate process was started." Green
}

# If cloudflared claims to be running but either public route is unavailable,
# restart the service once before entering the common 60-second health loop.
$videoTunnelReady = Test-Health -Name "Video tunnel" -Url $urls.VideoTunnel -Quiet
$documentTunnelReady = Test-Health -Name "Document tunnel" -Url $urls.DocumentTunnel -Quiet
if (-not ($videoTunnelReady -and $documentTunnelReady)) {
  Write-StartupLog "Cloudflared is running but one or more public hostnames are unavailable. Restarting service." Yellow
  Invoke-ServiceCommand -Action stop
  Wait-ServiceState -Service $cloudflared -Status ([System.ServiceProcess.ServiceControllerStatus]::Stopped)
  Invoke-ServiceCommand -Action start
  Wait-ServiceState -Service $cloudflared -Status ([System.ServiceProcess.ServiceControllerStatus]::Running)
}

$deadline = (Get-Date).AddSeconds(60)
$health = @{}
do {
  if ($frontend -and $frontend.HasExited) {
    Write-StartupLog "Frontend exited during startup with exit code $($frontend.ExitCode)." Red
    throw "Frontend exited during startup."
  }

  $cloudflared.Refresh()
  $health.Service = $cloudflared.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running
  $health.Frontend = Test-Health -Name "Frontend port 5173" -Url $urls.Frontend -Quiet
  $health.VideoLocal = Test-Health -Name "Video local port 8765" -Url $urls.VideoLocal -Quiet
  $health.DocumentLocal = Test-Health -Name "Document local port 8000" -Url $urls.DocumentLocal -Quiet
  $health.VideoTunnel = Test-Health -Name "Video tunnel" -Url $urls.VideoTunnel -Quiet
  $health.DocumentTunnel = Test-Health -Name "Document tunnel" -Url $urls.DocumentTunnel -Quiet

  $summary = "service={0}; frontend:5173={1}; video:8765={2}; document:8000={3}; video-tunnel={4}; document-tunnel={5}" -f `
    $health.Service, $health.Frontend, $health.VideoLocal, $health.DocumentLocal, $health.VideoTunnel, $health.DocumentTunnel
  Write-StartupLog "Health check: $summary" $(if ($health.Values -notcontains $false) { "Green" } else { "Yellow" })

  $allReady = $health.Service -and $health.Frontend -and $health.VideoLocal -and `
    $health.DocumentLocal -and $health.VideoTunnel -and $health.DocumentTunnel
  if (-not $allReady -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
  }
} while (-not $allReady -and (Get-Date) -lt $deadline)

if (-not $allReady) {
  Write-StartupLog "Startup failed after waiting up to 60 seconds." Red
  if (-not $health.Service) { Write-StartupLog "FAILED: Windows service '$serviceName' is not RUNNING." Red }
  if (-not $health.Frontend) { Write-StartupLog "FAILED: $($urls.Frontend)" Red }
  if (-not $health.VideoLocal) { Write-StartupLog "FAILED: $($urls.VideoLocal)" Red }
  if (-not $health.DocumentLocal) { Write-StartupLog "FAILED: $($urls.DocumentLocal)" Red }
  if (-not $health.VideoTunnel) { Write-StartupLog "FAILED: $($urls.VideoTunnel)" Red }
  if (-not $health.DocumentTunnel) { Write-StartupLog "FAILED: $($urls.DocumentTunnel)" Red }
  throw "Loca Editor did not pass all startup health checks. See $logFile"
}

Write-StartupLog "All local and Cloudflare health checks passed." Green
Write-StartupLog "Opening Loca Editor at $($urls.Frontend)" Green
Write-StartupLog "========== Loca Editor startup completed ==========" Cyan
Start-Process $urls.Frontend
