#!/bin/bash

# 🎨 SPR - Script de Inicialização do Frontend React
# Porta 3000 - React Development Server

echo "🎨 SPR Frontend React - Iniciando..."
echo "📍 Diretório: $(pwd)"
echo "🌐 Porta: 3000"
echo "📅 $(date)"
echo "=================================================="

# Verificar se estamos no diretório correto
if [ ! -d "frontend" ]; then
    echo "❌ Erro: Diretório frontend/ não encontrado"
    echo "💡 Execute este script a partir do diretório raiz do projeto SPR"
    exit 1
fi

# Entrar no diretório frontend
cd frontend

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado no diretório frontend"
    echo "💡 Verifique se o projeto frontend está configurado corretamente"
    exit 1
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar dependências"
        exit 1
    fi
else
    echo "✅ Dependências do frontend verificadas"
fi

# Voltar ao diretório raiz para verificar logs
cd ..

# Criar diretório de logs se não existir
mkdir -p logs
echo "📁 Diretório de logs criado/verificado"

# Verificar se a porta 3000 está livre
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Porta 3000 já está em uso"
    echo "🔍 Processo usando a porta:"
    lsof -Pi :3000 -sTCP:LISTEN
    echo ""
    read -p "❓ Deseja continuar mesmo assim? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Abortado pelo usuário"
        exit 1
    fi
fi

echo ""
echo "🎨 Iniciando Frontend React SPR..."
echo "📝 Logs sendo salvos em: logs/spr_frontend.log"
echo "🌐 URL: http://localhost:3000"
echo "🔗 Proxy Backend: http://localhost:3002"
echo ""
echo "💡 Para parar o serviço, pressione Ctrl+C"
echo "💡 O navegador será aberto automaticamente"
echo "=================================================="

# Entrar novamente no diretório frontend e iniciar
cd frontend

# Iniciar o frontend com logs
npm start 2>&1 | tee ../logs/spr_frontend.log
