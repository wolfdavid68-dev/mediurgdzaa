@echo off
chcp 65001 >nul
title MediURG — Déploiement Vercel

echo.
echo  ╔══════════════════════════════════════╗
echo  ║      MediURG  —  Mise à jour         ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Vérifier s'il y a des changements
git status --short > nul 2>&1
git diff --quiet --exit-code HEAD
if %errorlevel% == 0 (
    echo  Aucun changement détecté.
    echo.
    set /p FORCE="  Redéployer quand même ? (o/n) : "
    if /i not "%FORCE%"=="o" goto :fin
    goto :deploy
)

:: Afficher les fichiers modifiés
echo  Fichiers modifiés :
echo  ─────────────────────────────────────
git status --short
echo.

:: Demander un message de commit
set /p MSG="  Message de mise à jour (Entrée = 'mise à jour') : "
if "%MSG%"=="" set MSG=mise à jour

:: Commit + push GitHub
echo.
echo  [1/3] Sauvegarde sur GitHub...
git add -A
git commit -m "%MSG%"
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo  ERREUR : échec du push GitHub.
    pause
    exit /b 1
)

:deploy
:: Déploiement Vercel
echo.
echo  [2/3] Déploiement sur Vercel...
call vercel --prod --yes
if %errorlevel% neq 0 (
    echo.
    echo  ERREUR : échec du déploiement Vercel.
    pause
    exit /b 1
)

echo.
echo  [3/3] Terminé !
echo.
echo  ✓  https://mediurg.vercel.app
echo.

:fin
pause
