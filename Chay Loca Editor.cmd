@echo off
setlocal
cd /d "%~dp0"
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
