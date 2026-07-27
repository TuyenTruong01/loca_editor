@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-backends.ps1" %*
if errorlevel 1 (
  echo.
  echo Could not start the backends. Review the error above.
  pause
  exit /b 1
)
echo.
echo Backends started. This window can now be closed.
pause
