@echo off
echo ========================================
echo  VERIFICACAO DE STATUS SPR
echo ========================================
echo.

echo Verificando Node.js...
node --version
echo.

echo Verificando NPM...
npm --version
echo.

echo Verificando processos Node.js...
tasklist | findstr node.exe
echo.

echo Verificando porta 3000...
netstat -an | findstr :3000
echo.

echo Verificando diretorio frontend...
if exist SPR\frontend\package.json (
    echo [OK] Frontend encontrado
) else (
    echo [ERRO] Frontend nao encontrado
)
echo.

echo Status completo verificado!
pause 