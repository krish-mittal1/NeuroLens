@echo off
title NeuroLens Dev Server

echo ============================================
echo  NeuroLens - Starting Development Servers
echo ============================================
echo.

:: Start the FastAPI backend in a new terminal window
echo Starting backend (FastAPI on port 8000)...
start "NeuroLens Backend" cmd /k "cd /d %~dp0backend && (if not exist .env copy .env.example .env) && pip install -r requirements.txt -q && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Brief pause so the backend terminal opens first
timeout /t 2 /nobreak >nul

:: Start the Vite frontend in a new terminal window
echo Starting frontend (Vite on port 5173)...
start "NeuroLens Frontend" cmd /k "cd /d %~dp0frontend && (if not exist .env copy .env.example .env) && npm install && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://127.0.0.1:5173
echo   API Docs: http://127.0.0.1:8000/docs
echo.
pause
