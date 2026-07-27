@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-backends.ps1"
if errorlevel 1 (
  echo.
  echo Backend setup failed. Review the error above.
  pause
  exit /b 1
)
echo.
echo Backend setup completed successfully.
pause
