@echo off
TITLE VOTO Nacional - Compilacion de Produccion
echo ===================================================
echo   Sistema de Inventarios - VOTO Nacional (Build)
echo ===================================================
echo.

:: Verificar si el entorno portable de Node.js está listo
if not exist "node-portable\node.exe" (
  echo [ERROR] No se encuentra el entorno de Node.js portable en la carpeta "node-portable".
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
)

:: Compilar frontend
echo [INFO] Compilando recursos frontend con Vite...
call "node-portable\npm.cmd" run build
if %errorlevel% neq 0 (
  echo [ERROR] Fallo al compilar la aplicacion.
  pause
  exit /b 1
)

echo.
echo ===================================================
echo   [SUCCESS] Compilacion de produccion completada.
echo   La carpeta "dist" ha sido generada correctamente.
echo   Para arrancar en produccion ejecuta:
echo   node-portable\node.exe server/app.js
echo ===================================================
echo.
pause
