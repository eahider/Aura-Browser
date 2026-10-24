@echo off
chcp 65001 >nul
title Aura Browser Desktop v1.0.0 Builder
echo =======================================================
echo   Aura Browser - Desktop Release v1.0.0 Builder
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking dependencies...
if not exist "node_modules\" (
    echo Installing npm dependencies...
    call npm install
)

echo.
echo [2/3] Building Windows 64-bit Installer (NSIS)...
call npm run dist

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Check the output above.
    pause
    exit /b 1
)

echo.
echo [3/3] Build completed successfully!
echo =======================================================
echo  Installer location:
echo    dist\Aura Browser Setup 1.0.0.exe
echo.
echo  Portable unpacked version:
echo    dist\win-unpacked\Aura Browser.exe
echo =======================================================
echo.
pause
