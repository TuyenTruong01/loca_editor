@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-loca-editor.ps1"
if errorlevel 1 (
  echo.
  echo Khong the tat Loca Editor. Vui long xem loi phia tren.
  pause
  exit /b 1
)
echo.
echo Da tat Loca Editor.
pause
