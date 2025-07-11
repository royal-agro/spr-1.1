#!/usr/bin/env pwsh

Write-Host "🚀 Iniciando serviços do SPR WhatsApp..." -ForegroundColor Green

# Função para iniciar processo em nova janela
function Start-ServiceInNewWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory = $PWD
    )
    
    Write-Host "▶️  Iniciando $Title..." -ForegroundColor Yellow
    
    $processArgs = @{
        FilePath = "pwsh.exe"
        ArgumentList = "-NoExit", "-Command", "cd '$WorkingDirectory'; $Command"
        WindowStyle = "Normal"
    }
    
    Start-Process @processArgs
    Start-Sleep -Seconds 2
}

# Verificar se estamos no diretório correto
if (-not (Test-Path "SPR/frontend")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto spr-1.1" -ForegroundColor Red
    exit 1
}

try {
    # 1. Iniciar WhatsApp QR Server (porta 3002)
    Start-ServiceInNewWindow -Title "WhatsApp QR Server" -Command "cd SPR/whatsapp_server; node final_qr.js" -WorkingDirectory "$PWD/SPR/whatsapp_server"
    
    # 2. Iniciar WhatsApp API Server (porta 3001)
    Start-ServiceInNewWindow -Title "WhatsApp API Server" -Command "cd SPR/whatsapp_server; node integrated_server.js" -WorkingDirectory "$PWD/SPR/whatsapp_server"
    
    # 3. Iniciar Servidor de Mídia (porta 3003)
    Start-ServiceInNewWindow -Title "Servidor de Mídia" -Command "cd SPR/whatsapp_server; node media_server.js" -WorkingDirectory "$PWD/SPR/whatsapp_server"
    
    # 4. Iniciar Frontend React (porta 3000)
    Start-ServiceInNewWindow -Title "Frontend React" -Command "cd SPR/frontend; npm start" -WorkingDirectory "$PWD/SPR/frontend"
    
    Write-Host ""
    Write-Host "✅ Todos os serviços foram iniciados!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Serviços rodando:" -ForegroundColor Cyan
    Write-Host "   🔗 QR Code WhatsApp: http://localhost:3002" -ForegroundColor White
    Write-Host "   🔗 API WhatsApp:     http://localhost:3001" -ForegroundColor White
    Write-Host "   🔗 Servidor Mídia:   http://localhost:3003" -ForegroundColor White
    Write-Host "   🔗 Frontend:         http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "📱 Instruções:" -ForegroundColor Cyan
    Write-Host "   1. Abra http://localhost:3002 para escanear o QR Code" -ForegroundColor White
    Write-Host "   2. Após conectar, abra http://localhost:3000 para usar o WhatsApp" -ForegroundColor White
    Write-Host "   3. Para parar os serviços, feche as janelas ou pressione Ctrl+C" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 SPR WhatsApp está pronto!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erro ao iniciar serviços: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}