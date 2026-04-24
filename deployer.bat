@echo off
chcp 65001 >nul
title MediURG - Deploiement Vercel

SET GIT="C:\Program Files\Git\cmd\git.exe"
SET VERCEL="C:\Users\Admin\AppData\Roaming\npm\vercel.cmd"

echo.
echo  ================================================
echo       MediURG  --  Mise a jour Vercel
echo  ================================================
echo.

cd /d "%~dp0"

%GIT% diff --quiet --exit-code HEAD >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo  Aucun changement detecte.
    echo.
    set /p FORCE="  Redeployer quand meme ? (o/n) : "
    IF /I NOT "!FORCE!"=="o" GOTO FIN
    GOTO DEPLOY
)

echo  Fichiers modifies :
echo  --------------------------------
%GIT% status --short
echo.

set /p MSG="  Message (Entree = mise a jour) : "
IF "%MSG%"=="" SET MSG=mise a jour

echo.
echo  [1/3] Sauvegarde sur GitHub...
%GIT% add -A
%GIT% commit -m "%MSG%"
%GIT% push origin main
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERREUR : echec du push GitHub.
    pause
    EXIT /B 1
)

:DEPLOY
echo.
echo  [2/3] Deploiement sur Vercel...
CALL %VERCEL% --prod --yes
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERREUR : echec du deploiement Vercel.
    pause
    EXIT /B 1
)

echo.
echo  [3/3] Termine !
echo.
echo    https://mediurg.vercel.app
echo.

:FIN
pause