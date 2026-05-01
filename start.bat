@echo off
title Day Zero — Water Emergency Planner
color 0B

echo.
echo  ██████╗  █████╗ ██╗   ██╗    ███████╗███████╗██████╗  ██████╗
echo  ██╔══██╗██╔══██╗╚██╗ ██╔╝    ╚════██║██╔════╝██╔══██╗██╔═══██╗
echo  ██║  ██║███████║ ╚████╔╝         ██╔╝█████╗  ██████╔╝██║   ██║
echo  ██║  ██║██╔══██║  ╚██╔╝         ██╔╝ ██╔══╝  ██╔══██╗██║   ██║
echo  ██████╔╝██║  ██║   ██║         ██╔╝  ███████╗██║  ██║╚██████╔╝
echo  ╚═════╝ ╚═╝  ╚═╝   ╚═╝         ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝
echo.
echo  WATER EMERGENCY PLANNER
echo  ─────────────────────────────────────────────────────────
echo.

echo [1/2] Starting Python backend on port 8000...
cd /d "%~dp0backend"
start "Day Zero Backend" cmd /k "python main.py"

timeout /t 2 /nobreak >nul

echo [2/2] Starting frontend on port 5173...
cd /d "%~dp0"
start "Day Zero Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo  ✓ Backend:  http://localhost:8000
echo  ✓ Frontend: http://localhost:5173
echo  ✓ API Docs: http://localhost:8000/docs
echo.
echo  Opening browser...
start http://localhost:5173

echo.
echo  Press any key to stop all servers...
pause >nul

taskkill /F /FI "WINDOWTITLE eq Day Zero Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Day Zero Frontend*" >nul 2>&1
echo Servers stopped.
