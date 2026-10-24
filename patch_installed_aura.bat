@echo off
chcp 65001 >nul
echo ==============================================
echo  Aura Browser - Xray Core Quick Patch
echo ==============================================
echo.
echo Closing running Aura Browser instances...
taskkill /F /IM "Aura Browser.exe" 2>nul
timeout /t 2 /nobreak >nul

set "RES=%LOCALAPPDATA%\Programs\Aura Browser\resources"
if not exist "%RES%" (
    echo [ERROR] Installation folder not found: %RES%
    pause
    exit /b 1
)

if exist "%RES%\app_new.asar" (
    echo Applying patched app.asar...
    copy /y "%RES%\app_new.asar" "%RES%\app.asar" >nul
    del /f "%RES%\app_new.asar" 2>nul
    echo [OK] Patched successfully!
) else (
    echo Repacking app.asar with fix...
    call npx asar extract "%RES%\app.asar" "%TEMP%\aura_patch_temp"
    copy /y "%~dp0main.js" "%TEMP%\aura_patch_temp\main.js" >nul
    copy /y "%~dp0storage.js" "%TEMP%\aura_patch_temp\storage.js" >nul
    copy /y "%~dp0preload.js" "%TEMP%\aura_patch_temp\preload.js" >nul
    copy /y "%~dp0subscriptionParser.js" "%TEMP%\aura_patch_temp\subscriptionParser.js" >nul
    copy /y "%~dp0xrayCore.js" "%TEMP%\aura_patch_temp\xrayCore.js" >nul
    copy /y "%~dp0vpnManager.js" "%TEMP%\aura_patch_temp\vpnManager.js" >nul
    copy /y "%~dp0dpiEngine.js" "%TEMP%\aura_patch_temp\dpiEngine.js" >nul
    xcopy /y /e /i "%~dp0ui" "%TEMP%\aura_patch_temp\ui" >nul
    call npx asar pack --unpack-dir "build/xray" "%TEMP%\aura_patch_temp" "%RES%\app.asar"
    rmdir /s /q "%TEMP%\aura_patch_temp" 2>nul
    echo [OK] Repacked and patched successfully!
)

echo.
echo Launching Aura Browser...
start "" "%LOCALAPPDATA%\Programs\Aura Browser\Aura Browser.exe"
echo Done!
