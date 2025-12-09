@echo off
setlocal
title Server Master Starter

:: Gehe zum Hauptverzeichnis (ein Level hoch von wo auch immer die bat liegt, falls im root, dann ok)
cd /d "%~dp0"

:: Check, ob node_modules existiert. Wenn nicht, Installer starten.
if not exist "node_modules" (
    echo [WARN] node_modules nicht gefunden. Starte Installer...
    if exist "bin\installer2.bat" (
        call "bin\installer2.bat"
    ) else (
        echo [ERROR] bin\installer2.bat nicht gefunden!
        echo Bitte fuehre 'npm install' manuell aus.
        pause
        exit /b 1
    )
)

:: Server Starten
echo.
echo [INFO] Starte Server...
echo [INFO] Druecke STRG+C um den Server zu stoppen.
echo.

:: Hier wird der Server gestartet.
:: Wir nutzen 'call', damit das Fenster offen bleibt, falls der Server crasht.
if exist "src\server.js" (
    node src\server.js
) else (
    echo [ERROR] src\server.js wurde nicht gefunden!
    echo Bist du im richtigen Ordner?
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo [CRASH] Der Server ist abgestuerzt.
    echo Siehe oben fuer Fehlermeldungen.
    pause
)

pause