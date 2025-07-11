# Script para iniciar SPR Sistema Preditivo Royal
param(
    [switch]$SkipInstall,
    [switch]$OnlyFrontend,
    [switch]$OnlyWhatsApp
)

Write-Host "🚀 SPR Sistema Preditivo Royal - Iniciando..." -ForegroundColor Green
Write-Host "📱 Sistema de Previsão de Preços para Commodities Agrícolas" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se uma porta está em uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    } catch {
        return $false
    }
}

# Função para encontrar uma porta disponível
function Find-AvailablePort {
    param([int]$StartPort = 3000)
    
    for ($port = $StartPort; $port -lt ($StartPort + 10); $port++) {
        if (-not (Test-Port $port)) {
            return $port
        }
    }
    return $null
}

# Verificar se Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se npm está instalado
try {
    $npmVersion = npm --version
    Write-Host "✅ npm detectado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm não encontrado. Instale npm primeiro." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Instalar dependências se necessário
if (-not $SkipInstall) {
    Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow
    
    # Frontend
    if (Test-Path "frontend/package.json") {
        Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Blue
        Push-Location "frontend"
        try {
            npm install --silent
            Write-Host "✅ Dependências do frontend instaladas" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erro ao instalar dependências do frontend" -ForegroundColor Red
        }
        Pop-Location
    }
    
    # WhatsApp Server
    if (Test-Path "whatsapp_server/package.json") {
        Write-Host "📦 Instalando dependências do WhatsApp server..." -ForegroundColor Blue
        Push-Location "whatsapp_server"
        try {
            npm install --silent
            Write-Host "✅ Dependências do WhatsApp server instaladas" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erro ao instalar dependências do WhatsApp server" -ForegroundColor Red
        }
        Pop-Location
    }
    
    Write-Host ""
}

# Encontrar portas disponíveis
$frontendPort = Find-AvailablePort 3001
$whatsappPort = Find-AvailablePort 3000

if ($frontendPort -eq $null) {
    Write-Host "❌ Não foi possível encontrar uma porta disponível para o frontend" -ForegroundColor Red
    exit 1
}

if ($whatsappPort -eq $null) {
    Write-Host "❌ Não foi possível encontrar uma porta disponível para o WhatsApp" -ForegroundColor Red
    exit 1
}

Write-Host "🌐 Portas selecionadas:" -ForegroundColor Cyan
Write-Host "   Frontend: $frontendPort" -ForegroundColor White
Write-Host "   WhatsApp: $whatsappPort" -ForegroundColor White
Write-Host ""

# Iniciar serviços
$jobs = @()

if (-not $OnlyWhatsApp) {
    Write-Host "🎨 Iniciando Frontend React..." -ForegroundColor Blue
    $frontendJob = Start-Job -ScriptBlock {
        param($port, $path)
        Set-Location $path
        $env:PORT = $port
        npm start
    } -ArgumentList $frontendPort, "$PWD/frontend"
    $jobs += $frontendJob
    Write-Host "✅ Frontend iniciado (Job ID: $($frontendJob.Id))" -ForegroundColor Green
}

if (-not $OnlyFrontend) {
    Write-Host "💬 Iniciando WhatsApp Server..." -ForegroundColor Blue
    $whatsappJob = Start-Job -ScriptBlock {
        param($port, $path)
        Set-Location $path
        $env:PORT = $port
        npm run multi
    } -ArgumentList $whatsappPort, "$PWD/whatsapp_server"
    $jobs += $whatsappJob
    Write-Host "✅ WhatsApp Server iniciado (Job ID: $($whatsappJob.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Serviços iniciados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 URLs de acesso:" -ForegroundColor Cyan

if (-not $OnlyWhatsApp) {
    Write-Host "   📱 Frontend SPR: http://localhost:$frontendPort" -ForegroundColor White
}

if (-not $OnlyFrontend) {
    Write-Host "   💬 WhatsApp Server: http://localhost:$whatsappPort" -ForegroundColor White
}

Write-Host ""
Write-Host "ℹ️  Comandos úteis:" -ForegroundColor Yellow
Write-Host "   - Pressione Ctrl+C para parar os serviços" -ForegroundColor Gray
Write-Host "   - Para ver logs: Get-Job | Receive-Job" -ForegroundColor Gray
Write-Host "   - Para parar: Stop-Job -Id <ID>" -ForegroundColor Gray
Write-Host ""

# Aguardar e monitorar jobs
try {
    Write-Host "🔍 Monitorando serviços... (Pressione Ctrl+C para sair)" -ForegroundColor Yellow
    Write-Host ""
    
    while ($true) {
        Start-Sleep -Seconds 5
        
        $runningJobs = $jobs | Where-Object { $_.State -eq 'Running' }
        $failedJobs = $jobs | Where-Object { $_.State -eq 'Failed' }
        
        if ($failedJobs.Count -gt 0) {
            Write-Host "❌ Alguns serviços falharam:" -ForegroundColor Red
            foreach ($job in $failedJobs) {
                Write-Host "   Job $($job.Id) falhou" -ForegroundColor Red
                Receive-Job $job
            }
        }
        
        if ($runningJobs.Count -eq 0) {
            Write-Host "⚠️  Todos os serviços pararam" -ForegroundColor Yellow
            break
        }
    }
} catch {
    Write-Host ""
    Write-Host "🛑 Parando serviços..." -ForegroundColor Yellow
} finally {
    # Limpar jobs
    $jobs | Stop-Job -PassThru | Remove-Job
    Write-Host "✅ Serviços parados" -ForegroundColor Green
} 