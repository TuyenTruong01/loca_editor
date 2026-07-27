$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".runtime\backend-processes.json"

if (-not (Test-Path -LiteralPath $pidFile)) {
  Write-Host "Không có thông tin tiến trình backend."
  exit 0
}

$processes = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
foreach ($id in @($processes.video, $processes.document)) {
  if ($id -and (Get-Process -Id $id -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $id
  }
}
Remove-Item -LiteralPath $pidFile -Force
Write-Host "Đã dừng hai backend." -ForegroundColor Green
