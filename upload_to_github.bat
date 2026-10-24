@echo off
chcp 65001 >nul
title Aura Browser - Upload to GitHub
echo ===============================================================
echo   Aura Browser - Загрузка репозитория на GitHub (v1.0.0)
echo ===============================================================
echo.

cd /d "%~dp0"

echo [1/3] Проверка Git...
where git >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Git не найден! Установите Git с https://git-scm.com/
    pause
    exit /b 1
)

echo [2/3] Фиксация локальных изменений в ветку main...
git config --local user.name "Aura Browser Team" 2>nul
git config --local user.email "aurabrowser@users.noreply.github.com" 2>nul
git branch -M main
git add .
git commit -m "v1.0.0: Initial release of Aura Browser Desktop with HWID support" 2>nul

echo.
echo [3/3] Подключение к GitHub...
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo.
    echo Введите URL вашего созданного репозитория на GitHub.
    echo Пример: https://github.com/YOUR_USERNAME/YOUR_REPO.git
    echo.
    set /p REPO_URL="URL репозитория: "
    if not defined REPO_URL (
        echo [ОШИБКА] Ссылка не была введена.
        pause
        exit /b 1
    )
    git remote add origin %REPO_URL%
) else (
    echo Обнаружен существующий remote origin:
    git remote -v
)

echo.
echo Отправка кода в GitHub (git push -u origin main)...
git push -u origin main

if errorlevel 1 (
    echo.
    echo [ВНИМАНИЕ] Если push был отклонён:
    echo 1. Убедитесь, что репозиторий на github.com создан как ПУСТОЙ (без добавления README или LICENSE при создании).
    echo 2. Либо выполните принудительный push: git push -u origin main --force
    echo.
    pause
    exit /b 1
)

echo.
echo ===============================================================
echo  УСПЕХ! Проект загружен на GitHub!
echo ===============================================================
echo.
echo  Как выложить готовый инсталлятор (Setup 1.0.0.exe):
echo  1. Откройте ваш репозиторий на сайте github.com
echo  2. Справа нажмите кнопку 'Releases' -> 'Create a new release'
echo  3. В поле Tag укажите: v1.0.0
echo  4. Заголовок: Aura Browser Desktop v1.0.0
echo  5. Перетащите файл dist\Aura Browser Setup 1.0.0.exe в область загрузки
echo  6. Нажмите 'Publish release'
echo ===============================================================
echo.
pause
