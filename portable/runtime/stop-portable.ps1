$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $PSScriptRoot "processes.json"
if (Test-Path -LiteralPath $pidFile) {
  $items = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  foreach ($id in @($items.frontend, $items.video, $items.document)) {
    if ($id -and (Get-Process -Id $id -ErrorAction SilentlyContinue)) { & taskkill.exe /PID $id /T /F | Out-Null }
  }
  Remove-Item -LiteralPath $pidFile -Force
}
Write-Host "Loca Editor Portable has stopped."
