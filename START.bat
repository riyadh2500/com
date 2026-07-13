@echo off
echo Starting Web3 Dashboard...

start "Dashboard" cmd /k "cd /d %~dp0 && python -m http.server 8000"
start "Rio AI" cmd /k "cd /d %~dp0Rio.ai && python -m http.server 8080"

timeout /t 2 /nobreak >nul
start http://localhost:8000/index.html

echo All services started!
