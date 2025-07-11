# Script para iniciar os serviços do SPR
Write-Host "🚀 Iniciando serviços do SPR Sistema Preditivo Royal..." -ForegroundColor Green
Write-Host ""

# Função para verificar se uma porta está em uso
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Verificar portas disponíveis
Write-Host "🔍 Verificando portas disponíveis..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3002, 3003)
$availablePorts = @()

foreach ($port in $ports) {
    if (-not (Test-Port $port)) {
        $availablePorts += $port
        Write-Host "✅ Porta $port disponível" -ForegroundColor Green
    } else {
        Write-Host "❌ Porta $port em uso" -ForegroundColor Red
    }
}

Write-Host ""

# Definir portas para cada serviço
$frontendPort = if ($availablePorts.Count -gt 0) { $availablePorts[0] } else { 3001 }
$whatsappPort = if ($availablePorts.Count -gt 1) { $availablePorts[1] } else { 3000 }

Write-Host "📱 Frontend será iniciado na porta: $frontendPort" -ForegroundColor Cyan
Write-Host "💬 WhatsApp será iniciado na porta: $whatsappPort" -ForegroundColor Cyan
Write-Host ""

# Iniciar Frontend
Write-Host "🎨 Iniciando Frontend React..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; `$env:PORT=$frontendPort; npm start"
Start-Sleep -Seconds 2

# Iniciar WhatsApp Server
Write-Host "💬 Iniciando WhatsApp Server..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\whatsapp_server'; `$env:PORT=$whatsappPort; npm run multi"
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🎉 Serviços iniciados com sucesso!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:$frontendPort" -ForegroundColor White
Write-Host "💬 WhatsApp: http://localhost:$whatsappPort" -ForegroundColor White
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 