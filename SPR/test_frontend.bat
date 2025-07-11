@echo off
echo Testando frontend do SPR...
cd frontend
echo Verificando se o frontend está rodando...
curl -s http://localhost:3000 > nul
if %errorlevel% == 0 (
    echo ✅ Frontend está rodando na porta 3000
) else (
    echo ❌ Frontend não está rodando
)
pause 