@echo off
setlocal
cd /d "%~dp0"

fltmc >nul 2>&1
if errorlevel 1 (
  echo.
  echo [LOI] Chay Loca Editor can quyen Administrator de quan ly Cloudflare Tunnel.
  echo Hay nhap chuot phai vao file nay va chon "Run as administrator".
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-loca-editor.ps1"
if errorlevel 1 (
  echo.
  echo Khong the khoi dong Loca Editor. Vui long xem loi phia tren.
  pause
  exit /b 1
)
echo.
echo Loca Editor da san sang.
echo Ban co the dong cua so nay.
pause
