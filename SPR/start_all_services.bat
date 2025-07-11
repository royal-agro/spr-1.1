@echo off
echo 🚀 Iniciando todos os serviços do SPR...
echo.

echo 📱 Iniciando servidor WhatsApp (porta 3001)...
start "WhatsApp Server" cmd /k "cd whatsapp_server && node integrated_server.js"

echo ⏳ Aguardando 3 segundos...
timeout /t 3 > nul

echo 🌐 Iniciando frontend React (porta 3000)...
start "React Frontend" cmd /k "cd frontend && npm start"

echo.
echo ✅ Todos os serviços foram iniciados!
echo.
echo 📋 Portas:
echo   - 3000: Frontend React
echo   - 3001: API WhatsApp
echo   - 3002: WhatsApp QR Code
echo.
echo 🌐 Acesse: http://localhost:3000
echo.
pause 