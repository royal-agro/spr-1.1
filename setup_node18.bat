@echo off
echo ========================================
echo  SPR - Configuracao Pos-Downgrade Node.js 18
echo ========================================

echo.
echo 1. Verificando versao do Node.js...
node --version
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, reinicie o terminal e tente novamente.
    pause
    exit /b 1
)

echo.
echo 2. Verificando versao do NPM...
npm --version

echo.
echo 3. Navegando para o diretorio frontend...
cd SPR\frontend
if not exist package.json (
    echo ERRO: package.json nao encontrado!
    echo Verifique se esta no diretorio correto.
    pause
    exit /b 1
)

echo.
echo 4. Limpando cache do NPM...
npm cache clean --force

echo.
echo 5. Removendo node_modules e package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo 6. Instalando dependencias...
npm install

echo.
echo 7. Iniciando servidor de desenvolvimento...
echo Frontend sera iniciado em http://localhost:3000
echo Pressione Ctrl+C para parar o servidor
npm start

pause 