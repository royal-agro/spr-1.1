@echo off
echo 🚀 Iniciando servicos do SPR WhatsApp...
echo.

REM Verificar se estamos no diretório correto
if not exist "SPR\frontend" (
    echo ❌ Erro: Execute este script na raiz do projeto spr-1.1
    pause
    exit /b 1
)

REM 1. Iniciar WhatsApp QR Server (porta 3002)
echo ▶️  Iniciando WhatsApp QR Server...
start "WhatsApp QR Server" cmd /k "cd SPR\whatsapp_server && node final_qr.js"
timeout /t 2 /nobreak >nul

REM 2. Iniciar WhatsApp API Server (porta 3001)
echo ▶️  Iniciando WhatsApp API Server...
start "WhatsApp API Server" cmd /k "cd SPR\whatsapp_server && node integrated_server.js"
timeout /t 2 /nobreak >nul

REM 3. Iniciar Servidor de Mídia (porta 3003)
echo ▶️  Iniciando Servidor de Mídia...
start "Servidor de Mídia" cmd /k "cd SPR\whatsapp_server && node media_server.js"
timeout /t 2 /nobreak >nul

REM 4. Iniciar Frontend React (porta 3000)
echo ▶️  Iniciando Frontend React...
start "Frontend React" cmd /k "cd SPR\frontend && npm start"
timeout /t 2 /nobreak >nul

echo.
echo ✅ Todos os servicos foram iniciados!
echo.
echo 📋 Servicos rodando:
echo    🔗 QR Code WhatsApp: http://localhost:3002
echo    🔗 API WhatsApp:     http://localhost:3001
echo    🔗 Servidor Mídia:   http://localhost:3003
echo    🔗 Frontend:         http://localhost:3000
echo.
echo 📱 Instrucoes:
echo    1. Abra http://localhost:3002 para escanear o QR Code
echo    2. Apos conectar, abra http://localhost:3000 para usar o WhatsApp
echo    3. Para parar os servicos, feche as janelas ou pressione Ctrl+C
echo.
echo 🎉 SPR WhatsApp esta pronto!
echo.
pause 