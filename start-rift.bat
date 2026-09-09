@echo off
setlocal

echo Installing/updating dependencies...
npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Install Node.js 20+ and try again.
  pause
  exit /b 1
)

echo.
echo Starting RIFT...
echo Open http://127.0.0.1:3000/stream.html after the server starts.
echo TikTok events are now received through TikFinity Desktop Event API.
echo Keep this window open while streaming.
echo.

npm start
pause
