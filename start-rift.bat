@echo off
set /p TIKTOK_USERNAME=TikTok username (without @): 
if "%TIKTOK_USERNAME%"=="" (
  echo Username is required.
  pause
  exit /b 1
)
set TIKTOK_USERNAME=%TIKTOK_USERNAME%
echo.
echo Installing/updating dependencies...
npm install
if errorlevel 1 (
  echo npm install failed. Install Node.js 20+ and try again.
  pause
  exit /b 1
)
echo.
echo Starting RIFT...
echo Open http://127.0.0.1:3000/stream.html in OBS Browser Source.
echo Keep this window open while streaming.
echo.
npm start
pause
