# Script para iniciar o SPR - Sistema Preditivo Royal
Write-Host "🌾 Iniciando SPR - Sistema Preditivo Royal" -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "SPR\frontend\package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto spr-1.1" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow

# Instalar dependências do frontend
Write-Host "Frontend..." -ForegroundColor Cyan
Set-Location "SPR\frontend"
npm install
Set-Location "..\..\"

# Instalar dependências do WhatsApp server
Write-Host "WhatsApp Server..." -ForegroundColor Cyan
Set-Location "SPR\whatsapp_server"
npm install
Set-Location "..\..\"

Write-Host "🚀 Iniciando serviços..." -ForegroundColor Green

# Função para iniciar processo em background
function Start-ServiceBackground {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command,
        [int]$Port
    )
    
    Write-Host "▶️ Iniciando $Name na porta $Port..." -ForegroundColor Cyan
    
    $job = Start-Job -ScriptBlock {
        param($workingDir, $cmd)
        Set-Location $workingDir
        Invoke-Expression $cmd
    } -ArgumentList $Path, $Command
    
    return $job
}

# Iniciar WhatsApp Server (porta 3001)
$whatsappJob = Start-ServiceBackground -Name "WhatsApp Server" -Path "SPR\whatsapp_server" -Command "npm start" -Port 3001

# Aguardar um pouco para o WhatsApp server iniciar
Start-Sleep -Seconds 3

# Iniciar Frontend (porta 3000)
$frontendJob = Start-ServiceBackground -Name "Frontend React" -Path "SPR\frontend" -Command "npm start" -Port 3000

Write-Host ""
Write-Host "🎉 SPR - Sistema Preditivo Royal iniciado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Serviços disponíveis:" -ForegroundColor Yellow
Write-Host "   • Frontend React: http://localhost:3000" -ForegroundColor White
Write-Host "   • WhatsApp Server: http://localhost:3001" -ForegroundColor White
Write-Host "   • API WhatsApp: http://localhost:3001/api" -ForegroundColor White
Write-Host ""
Write-Host "⚡ Para parar os serviços, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Aguardar jobs terminarem ou usuário interromper
try {
    Wait-Job $whatsappJob, $frontendJob
} catch {
    Write-Host "🛑 Parando serviços..." -ForegroundColor Yellow
} finally {
    # Limpar jobs
    Stop-Job $whatsappJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $whatsappJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "✅ Serviços parados" -ForegroundColor Green
} 