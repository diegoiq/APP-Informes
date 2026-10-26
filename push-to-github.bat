@echo off
setlocal
echo ====================================================
echo   Ejecutando Push Forzado a GitHub (APP-Informes)
echo ====================================================
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0push-to-github.ps1" %*
