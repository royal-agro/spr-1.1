Write-Host "========================================" -ForegroundColor Green
Write-Host " SPR - Configuracao Pos-Downgrade Node.js 18" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`n1. Verificando versao do Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Node.js nao encontrado!" -ForegroundColor Red
    Write-Host "Por favor, reinicie o terminal e tente novamente." -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "`n2. Verificando versao do NPM..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "NPM version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERRO: NPM nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Navegando para o diretorio frontend..." -ForegroundColor Yellow
Set-Location "SPR\frontend"

if (-not (Test-Path "package.json")) {
    Write-Host "ERRO: package.json nao encontrado!" -ForegroundColor Red
    Write-Host "Verifique se esta no diretorio correto." -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "`n4. Limpando cache do NPM..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "`n5. Removendo node_modules e package-lock.json..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "node_modules removido" -ForegroundColor Green
}

if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "package-lock.json removido" -ForegroundColor Green
}

Write-Host "`n6. Instalando dependencias..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencias instaladas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "ERRO na instalacao das dependencias!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "`n7. Iniciando servidor de desenvolvimento..." -ForegroundColor Yellow
Write-Host "Frontend sera iniciado em http://localhost:3000" -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Cyan

npm start 