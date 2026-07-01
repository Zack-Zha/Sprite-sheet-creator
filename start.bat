@echo off
title Sprite Sheet Tool
cd /d "%~dp0"

echo.
echo ============================================
echo   Sprite Sheet Processing Tool
echo ============================================
echo.

:: Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [1/3] Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [1/3] Dependencies already installed.
)

:: Copy GIF worker if missing
if not exist "public\gif.worker.js" (
    echo [2/3] Copying GIF encoder worker...
    node scripts/copy-worker.js
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Could not copy gif.worker.js. GIF export may not work.
    )
    echo.
) else (
    echo [2/3] GIF worker already in place.
)

:: Start Vite dev server
echo [3/3] Starting development server...
echo.
echo   The application will open at http://localhost:5173
echo   Press Ctrl+C to stop the server.
echo.
call npm run dev

pause
