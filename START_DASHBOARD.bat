@echo off
echo ================================================
echo Starting Web3 Dashboard with Rio AI
echo ================================================
echo.

REM Start Rio AI on port 8000
cd /d "c:\Users\AC\OneDrive\Desktop\combaind\Rio.ai"
start "Rio AI Server" cmd /k "python -m http.server 8000"
echo [OK] Rio AI server started on http://localhost:8000
timeout /t 2 /nobreak >nul

REM Start Main Dashboard on port 8080
cd /d "c:\Users\AC\OneDrive\Desktop\combaind"
start "Web3 Dashboard" cmd /k "python -m http.server 8080"
echo [OK] Main dashboard started on http://localhost:8080
timeout /t 2 /nobreak >nul

echo.
echo ================================================
echo Dashboard is ready!
echo ================================================
echo.
echo Main Dashboard: http://localhost:8080
echo Rio AI:         http://localhost:8000
echo.
echo Opening dashboard in your default browser...
echo.

REM Open browser
start http://localhost:8080

echo Press any key to stop all servers...
pause >nul

REM Stop servers
taskkill /FI "WindowTitle eq Rio AI Server*" /T /F 2>nul
taskkill /FI "WindowTitle eq Web3 Dashboard*" /T /F 2>nul

echo All servers stopped.
timeout /t 2 /nobreak >nul
