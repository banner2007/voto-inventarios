@echo off
TITLE VOTO Nacional - Terminal de Desarrollo
echo ===================================================
echo   Sistema de Inventarios - VOTO Nacional (Dev)
echo ===================================================
echo.

:: Verificar si el entorno portable de Node.js está listo
if not exist "node-portable\node.exe" (
  echo [ERROR] No se encuentra el entorno de Node.js portable en la carpeta "node-portable".
  echo Por favor, espera a que finalice la descarga e instalacion automatica del entorno.
  pause
  exit /b 1
)

:: Instalar dependencias si no existe node_modules
if not exist "node_modules" (
  echo [INFO] Carpeta node_modules no encontrada. Instalando dependencias...
  call "node-portable\npm.cmd" install
  if %errorlevel% neq 0 (
    echo [ERROR] Hubo un problema al instalar las dependencias.
    pause
    exit /b 1
  )
  echo [SUCCESS] Dependencias instaladas con exito.
  echo.
)

:: Iniciar servicios en paralelo
echo [INFO] Iniciando el Servidor Backend Express (Puerto 3000)...
start "Backend Express" cmd /c "node-portable\node.exe server/app.js & pause"

echo [INFO] Iniciando el Servidor Frontend Vite (Puerto 5173)...
start "Frontend Vite" cmd /c "node-portable\npm.cmd run dev:frontend & pause"

echo.
echo ===================================================
echo   El sistema esta arrancando...
echo   - Accede a la interfaz web en: http://localhost:5173
echo   - API Backend corriendo en: http://localhost:3000
echo ===================================================
echo.
pause
