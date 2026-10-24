@echo off
chcp 65001 >nul
title Aura Browser - Prepare for GitHub
echo =======================================================
echo   Aura Browser - Prepare for GitHub Upload (v1.0.0)
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Git installation...
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH!
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

echo [2/4] Initializing Git repository...
if not exist ".git\" (
    git init
    echo Repository initialized.
) else (
    echo Existing Git repository found.
)

git branch -M main

echo.
echo [3/4] Staging files (excluding node_modules, dist, and binaries via .gitignore)...
git add .

echo.
echo [4/4] Creating commit for v1.0.0...
git commit -m "v1.0.0: Initial release of Aura Browser Desktop with HWID support"

echo.
echo =======================================================
echo  Ready for GitHub!
echo =======================================================
echo.
echo  To push to your GitHub repository, run:
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
echo    git push -u origin main
echo.
echo  To publish the installer on GitHub:
echo    1. Open your repository on github.com
echo    2. Go to 'Releases' -> 'Draft a new release'
echo    3. Tag version: v1.0.0
echo    4. Title: Aura Browser Desktop v1.0.0
echo    5. Attach file: dist\Aura Browser Setup 1.0.0.exe
echo    6. Click 'Publish release'
echo =======================================================
echo.
pause
