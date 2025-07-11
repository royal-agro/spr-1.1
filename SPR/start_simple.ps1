# Script simples para iniciar SPR
Write-Host "🚀 Iniciando SPR..." -ForegroundColor Green

# Frontend na porta 3001
Write-Host "🎨 Iniciando Frontend na porta 3001..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; `$env:PORT=3001; npm start"

# WhatsApp na porta 3000
Write-Host "💬 Iniciando WhatsApp na porta 3000..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd whatsapp_server; npm run multi"

Write-Host "✅ Serviços iniciados!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3001" -ForegroundColor White
Write-Host "WhatsApp: http://localhost:3000" -ForegroundColor White 