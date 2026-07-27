param(
  [string]$VideoBackend = "D:\Phong lam viec\02 Chinh sua Video\backend",
  [string]$DocumentBackend = "D:\Phong lam viec\03 Chinh sua van ban\loca_converter\backend"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot ".runtime"
$videoVenv = Join-Path $runtimeRoot "video-venv"
$documentVenv = Join-Path $runtimeRoot "document-venv"

foreach ($path in @($VideoBackend, $DocumentBackend)) {
  if (-not (Test-Path -LiteralPath $path -PathType Container)) {
    throw "Không tìm thấy backend: $path"
  }
}

New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null

function Install-BackendEnvironment {
  param([string]$VenvPath, [string]$Requirements)
  if (-not (Test-Path -LiteralPath (Join-Path $VenvPath "Scripts\python.exe"))) {
    python -m venv $VenvPath
    if ($LASTEXITCODE -ne 0) { throw "Không thể tạo môi trường Python tại $VenvPath" }
  }
  $python = Join-Path $VenvPath "Scripts\python.exe"
  & $python -m pip install --upgrade pip
  if ($LASTEXITCODE -ne 0) { throw "Không thể cập nhật pip." }
  & $python -m pip install -r $Requirements
  if ($LASTEXITCODE -ne 0) { throw "Không thể cài dependency từ $Requirements" }
  & $python -m pip install pytest httpx
  if ($LASTEXITCODE -ne 0) { throw "Could not install backend test dependencies." }
}

Write-Host "Đang thiết lập Video backend..." -ForegroundColor Cyan
Install-BackendEnvironment -VenvPath $videoVenv -Requirements (Join-Path $VideoBackend "requirements.txt")

Write-Host "Đang thiết lập Document backend..." -ForegroundColor Cyan
Install-BackendEnvironment -VenvPath $documentVenv -Requirements (Join-Path $DocumentBackend "requirements.txt")

Write-Host "Đã thiết lập xong hai backend." -ForegroundColor Green
