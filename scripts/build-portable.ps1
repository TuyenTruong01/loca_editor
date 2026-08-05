param([string]$Output = "")
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
if (-not $Output) { $Output = Join-Path $project "artifacts\LocaEditor-Portable" }
$output = [IO.Path]::GetFullPath($Output)
$pythonVersion = "3.13.14"
$cache = Join-Path $project ".runtime\portable-cache"
$pythonZip = Join-Path $cache "python-$pythonVersion-embed-amd64.zip"
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"
$portableDist = Join-Path $project ".runtime\portable-dist"

function Copy-Tree([string]$source, [string]$destination, [string[]]$excludeDirs = @(), [string[]]$excludeFiles = @()) {
  New-Item -ItemType Directory -Path $destination -Force | Out-Null
  $copyArgs = @($source, $destination, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1")
  if ($excludeDirs.Count) { $copyArgs += "/XD"; $copyArgs += $excludeDirs }
  if ($excludeFiles.Count) { $copyArgs += "/XF"; $copyArgs += $excludeFiles }
  & robocopy.exe @copyArgs | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Copy failed: $source -> $destination (robocopy $LASTEXITCODE)" }
}

if (Test-Path -LiteralPath $output) {
  $resolved = [IO.Path]::GetFullPath($output)
  if (-not $resolved.StartsWith([IO.Path]::GetFullPath((Join-Path $project "artifacts")), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to replace output outside the artifacts directory: $resolved"
  }
  & attrib.exe -R -H -S (Join-Path $resolved "*") /S /D 2>$null
  Remove-Item -LiteralPath $resolved -Recurse -Force
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
New-Item -ItemType Directory -Path $cache -Force | Out-Null

Write-Host "Building desktop frontend..." -ForegroundColor Cyan
& npm.cmd run build -- --outDir $portableDist
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }

Copy-Tree (Join-Path $project "portable") $output
Copy-Tree $portableDist (Join-Path $output "app")
Copy-Item -LiteralPath (Join-Path $project "portable\config\app-config.json") -Destination (Join-Path $output "app\config\app-config.json") -Force

if (-not (Test-Path -LiteralPath $pythonZip)) {
  Write-Host "Downloading official Python embedded runtime $pythonVersion..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonZip -UseBasicParsing
}
$pythonRoot = Join-Path $output "runtime\python"
Expand-Archive -LiteralPath $pythonZip -DestinationPath $pythonRoot -Force
New-Item -ItemType Directory -Path (Join-Path $pythonRoot "Lib\site-packages") -Force | Out-Null
Copy-Tree (Join-Path $project ".runtime\video-venv\Lib\site-packages") (Join-Path $pythonRoot "Lib\site-packages") -excludeDirs @("__pycache__") -excludeFiles @("*.pyc")
# Keep the video environment's mutually compatible FastAPI/Pydantic stack.
# The document environment contributes its OCR/export packages but must not
# partially overlay framework package directories with different versions.
$frameworkPackages = @(
  "__pycache__", "fastapi", "fastapi-*.dist-info", "starlette", "starlette-*.dist-info",
  "pydantic", "pydantic-*.dist-info", "pydantic_core", "pydantic_core-*.dist-info",
  "pydantic_settings", "pydantic_settings-*.dist-info", "uvicorn", "uvicorn-*.dist-info"
)
Copy-Tree (Join-Path $project ".runtime\document-venv\Lib\site-packages") (Join-Path $pythonRoot "Lib\site-packages") -excludeDirs $frameworkPackages -excludeFiles @("*.pyc")
$pth = Join-Path $pythonRoot "python313._pth"
@("python313.zip", ".", "Lib", "Lib\site-packages", "import site") | Set-Content -LiteralPath $pth -Encoding ASCII

$hosts = Join-Path $output "runtime\hosts"
New-Item -ItemType Directory -Path $hosts -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $project "scripts\video_backend_host.py") -Destination $hosts -Force
Copy-Item -LiteralPath (Join-Path $project "scripts\document_backend_host.py") -Destination $hosts -Force
Copy-Item -LiteralPath (Join-Path $project "scripts\portable_server.py") -Destination $hosts -Force

Write-Host "Copying backend sources and bundled media tools..." -ForegroundColor Cyan
Copy-Tree "D:\Phong lam viec\02 Chinh sua Video\backend" (Join-Path $output "backends\video\backend") -excludeDirs @("__pycache__", ".pytest_cache", ".git", "data", "storage") -excludeFiles @("*.pyc", ".env", ".env.local")
$documentSource = "D:\Phong lam viec\03 Chinh sua van ban\loca_converter\backend"
$documentRuntimeData = @(
  (Join-Path $documentSource "storage\diagnostics"), (Join-Path $documentSource "storage\exports"),
  (Join-Path $documentSource "storage\jobs"), (Join-Path $documentSource "storage\previews"),
  (Join-Path $documentSource "storage\uploads"), (Join-Path $documentSource "work")
)
Copy-Tree $documentSource (Join-Path $output "backends\document\backend") -excludeDirs (@("__pycache__", ".pytest_cache", ".git") + $documentRuntimeData) -excludeFiles @("*.pyc", ".env", ".env.local")

$tesseract = "C:\Program Files\Tesseract-OCR"
if (-not (Test-Path -LiteralPath (Join-Path $tesseract "tesseract.exe"))) { throw "Tesseract installation was not found at $tesseract" }
Copy-Tree $tesseract (Join-Path $output "tools\tesseract") -excludeDirs @("__pycache__")

New-Item -ItemType Directory -Path (Join-Path $output "data\video") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $output "data\document") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $output "data\temp") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $output "logs") -Force | Out-Null

Write-Host "Validating embedded runtime..." -ForegroundColor Cyan
& (Join-Path $pythonRoot "python.exe") -c "import fastapi, uvicorn, fitz, cv2, pytesseract, docx; print('Portable Python dependencies: OK')"
if ($LASTEXITCODE -ne 0) { throw "Embedded Python dependency validation failed." }

$size = (Get-ChildItem -LiteralPath $output -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host ("Portable build ready: {0} ({1:N1} MB)" -f $output, ($size / 1MB)) -ForegroundColor Green
