@echo off
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0.claude\serve.ps1"
timeout /t 2 /nobreak >nul
start "" http://localhost:8843/staff-leave.html
