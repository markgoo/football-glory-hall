@echo off
echo ============================================
echo Football Glory Hall - Startup Script
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not detected. Please install Node.js 16+
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js detected
echo.

REM Check root dependencies
echo Checking root dependencies...
if not exist "node_modules" (
    echo Root dependencies not found. Installing...
    call npm install
    if %errorlevel% neq 0 (
        echo Root dependencies installation failed
        pause
        exit /b 1
    )
    echo Root dependencies installed
) else (
    echo Root dependencies exist
)

REM Check backend dependencies
echo Checking backend dependencies...
if not exist "server\node_modules" (
    echo Backend dependencies not found. Installing...
    cd server
    call npm install
    if %errorlevel% neq 0 (
        echo Backend dependencies installation failed
        pause
        exit /b 1
    )
    cd ..
    echo Backend dependencies installed
) else (
    echo Backend dependencies exist
)

REM Check client dependencies
echo Checking client dependencies...
if not exist "client\node_modules" (
    echo Client dependencies not found. Installing...
    cd client
    call npm install
    if %errorlevel% neq 0 (
        echo Client dependencies installation failed
        pause
        exit /b 1
    )
    cd ..
    echo Client dependencies installed
) else (
    echo Client dependencies exist
)

echo.
echo ============================================
echo Starting application...
echo ============================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5005
echo.
echo Tip: Press Ctrl+C to stop all services
echo.

REM Start development server
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo Application startup failed. Check error messages
    pause
)
