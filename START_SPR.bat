@echo off
title SPR - Sistema Preditivo Royal
color 0A

echo.
echo  ███████╗██████╗ ██████╗ 
echo  ██╔════╝██╔══██╗██╔══██╗
echo  ███████╗██████╔╝██████╔╝
echo  ╚════██║██╔═══╝ ██╔══██╗
echo  ███████║██║     ██║  ██║
echo  ╚══════╝╚═╝     ╚═╝  ╚═╝
echo.
echo  Sistema Preditivo Royal v1.1
echo  Inicializando com Node.js 18...
echo.

REM Verificar se Node.js esta instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Solucoes:
    echo 1. Reinicie o computador
    echo 2. Reinstale Node.js 18.19.0
    echo 3. Verifique as variaveis de ambiente
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado: 
node --version

echo [OK] NPM encontrado:
npm --version

echo.
echo Navegando para o frontend...
cd SPR\frontend

echo.
echo Limpando cache...
npm cache clean --force

echo.
echo Removendo instalacao anterior...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Instalando dependencias...
npm install

if errorlevel 1 (
    echo.
    echo [ERRO] Falha na instalacao das dependencias!
    echo Tente executar manualmente:
    echo   cd SPR\frontend
    echo   npm install --legacy-peer-deps
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  INICIANDO SPR FRONTEND
echo ========================================
echo.
echo Servidor sera iniciado em: http://localhost:3000
echo Pressione Ctrl+C para parar
echo.

npm start 