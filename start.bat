@echo off
rem ============================================================
rem  Metal & Currency Prices - Source Launcher
rem  (Console messages kept in English for codepage safety.)
rem ============================================================
setlocal

cd /d "%~dp0"

echo ============================================================
echo   Metal ^& Currency Prices - Starting from source...
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo         Install it from https://nodejs.org then try again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\electron" (
  echo [INFO] Installing dependencies for the first time...
  echo        This may take a few minutes. Please wait.
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
  )
)

echo [INFO] Launching application...
echo.
pushd "%~dp0"
node "node_modules\electron\cli.js" .
popd

endlocal
