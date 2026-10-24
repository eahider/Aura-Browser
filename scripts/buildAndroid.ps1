# Aura Browser - Local Android APK Builder Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Aura Browser - Android APK Build Tool " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Sync mobile web bundle into Android project
Write-Host "`n[1/3] Syncing mobile web assets with Capacitor..." -ForegroundColor Yellow
npm run mobile:sync

# 2. Check Java JDK
Write-Host "`n[2/3] Checking Java (JDK 17+)..." -ForegroundColor Yellow

$hasJava = Get-Command java -ErrorAction SilentlyContinue
if (-not $hasJava -and -not $env:JAVA_HOME) {
    $studioJdk = "C:\Program Files\Android\Android Studio\jbr"
    if (Test-Path $studioJdk) {
        $env:JAVA_HOME = $studioJdk
        $env:PATH = "$studioJdk\bin;$env:PATH"
        Write-Host "Found Android Studio JDK: $studioJdk" -ForegroundColor Green
    } else {
        Write-Host "`n[!] JDK is not found in PATH or JAVA_HOME." -ForegroundColor Red
        Write-Host "To build Android APK locally on Windows:" -ForegroundColor White
        Write-Host "  1. Install OpenJDK 17: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Cyan
        Write-Host "  2. Or install Android Studio: https://developer.android.com/studio" -ForegroundColor Cyan
        Write-Host "  3. Or push to GitHub to build automatically via .github/workflows/build-mobile.yml" -ForegroundColor Cyan
        exit 1
    }
} else {
    Write-Host "Java detected." -ForegroundColor Green
}

# 3. Build APK with Gradle
Write-Host "`n[3/3] Compiling Android APK with Gradle..." -ForegroundColor Yellow
Set-Location "android"
& .\gradlew.bat assembleDebug
$gradleCode = $LASTEXITCODE
Set-Location ".."

if ($gradleCode -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host " SUCCESS! Android APK built at:" -ForegroundColor Green
    Write-Host " android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "`nGradle build exited with code $gradleCode" -ForegroundColor Red
}
