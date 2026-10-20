@echo off
cd /d %~dp0
title Servidor de impresion - La Taberna
:loop
echo [%date% %time%] Iniciando servidor de impresion...
node dist\index.js
echo [%date% %time%] El servidor se detuvo. Reiniciando en 5 segundos...
timeout /t 5 /nobreak >nul
goto loop
