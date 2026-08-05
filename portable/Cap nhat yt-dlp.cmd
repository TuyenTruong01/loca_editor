@echo off
setlocal
chcp 65001 >nul
set "YTDLP=%~dp0backends\video\backend\binaries\yt-dlp\yt-dlp.exe"

if not exist "%YTDLP%" (
  echo Khong tim thay yt-dlp tai:
  echo %YTDLP%
  pause
  exit /b 1
)

echo Dang kiem tra va cap nhat yt-dlp tu nguon chinh thuc...
"%YTDLP%" -U
if errorlevel 1 (
  echo.
  echo Cap nhat that bai. Hay kiem tra ket noi Internet va quyen ghi thu muc.
  pause
  exit /b 1
)

echo.
echo yt-dlp da san sang.
pause
endlocal
