#!/bin/bash

# 🚀 SPR - Script de Inicialização do Backend
# Porta 3002 - backend_server_fixed.js

echo "🔧 SPR Backend - Iniciando..."
echo "📍 Diretório: $(pwd)"
echo "🌐 Porta: 3002"
echo "📅 $(date)"
echo "=================================================="

# Verificar se estamos no diretório correto
if [ ! -f "backend_server_fixed.js" ]; then
    echo "❌ Erro: backend_server_fixed.js não encontrado"
    echo "💡 Execute este script a partir do diretório raiz do projeto SPR"
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado, usando configurações padrão"
else
    echo "✅ Arquivo .env carregado"
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do backend..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar dependências"
        exit 1
    fi
fi

# Criar diretório de logs se não existir
mkdir -p logs
echo "📁 Diretório de logs criado/verificado"

# Criar diretório de sessões se não existir  
mkdir -p sessions
echo "📁 Diretório de sessões criado/verificado"

# Verificar se a porta 3002 está livre
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Porta 3002 já está em uso"
    echo "🔍 Processo usando a porta:"
    lsof -Pi :3002 -sTCP:LISTEN
    echo ""
    read -p "❓ Deseja continuar mesmo assim? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Abortado pelo usuário"
        exit 1
    fi
fi

echo ""
echo "🚀 Iniciando Backend SPR..."
echo "📝 Logs sendo salvos em: logs/spr_backend.log"
echo "🌐 URL: http://localhost:3002"
echo "🔍 Health Check: http://localhost:3002/api/health"
echo ""
echo "💡 Para parar o serviço, pressione Ctrl+C"
echo "=================================================="

# Iniciar o backend com logs
node backend_server_fixed.js 2>&1 | tee logs/spr_backend.log