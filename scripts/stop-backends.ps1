$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".runtime\backend-processes.json"

if (-not (Test-Path -LiteralPath $pidFile)) {
  Write-Host "Không có thông tin tiến trình backend."
  exit 0
}

$processes = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
foreach ($backendProcessId in @($processes.video, $processes.document)) {
  if ($backendProcessId -and (Get-Process -Id $backendProcessId -ErrorAction SilentlyContinue)) {
    # The venv launcher can spawn a second Python process on Windows. Stop the
    # complete tree so an old uvicorn worker cannot keep serving the port.
    & taskkill.exe /PID $backendProcessId /T /F | Out-Null
  }
}
Remove-Item -LiteralPath $pidFile -Force
Write-Host "Đã dừng hai backend." -ForegroundColor Green
