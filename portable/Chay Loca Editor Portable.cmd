@echo off
setlocal
cd /d "%~dp0"
set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL%" (
  echo Khong tim thay Windows PowerShell tai: %POWERSHELL%
  pause
  exit /b 1
)
"%POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0runtime\start-portable.ps1"
if errorlevel 1 (
  echo.
  echo Loca Editor Portable khong the khoi dong. Xem logs\startup.log.
  pause
  exit /b 1
)
endlocal
