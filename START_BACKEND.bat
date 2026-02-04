@echo off
cd /d "%~dp0"
cd apps\agents
echo ========================================
echo Starting ZOARK OS Backend Server
echo ========================================
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.
echo Starting FastAPI server on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo Press CTRL+C to stop the server
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
