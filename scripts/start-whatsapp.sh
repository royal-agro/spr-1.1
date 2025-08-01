#!/bin/bash

# 📱 SPR - Script de Inicialização do WhatsApp Server
# Porta 3003 - whatsapp_server_real.js

echo "📱 SPR WhatsApp Server - Iniciando..."
echo "📍 Diretório: $(pwd)"
echo "🌐 Porta: 3003"
echo "📅 $(date)"
echo "=================================================="

# Verificar se estamos no diretório correto
if [ ! -f "whatsapp_server_real.js" ]; then
    echo "❌ Erro: whatsapp_server_real.js não encontrado"
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
    echo "📦 Instalando dependências do WhatsApp Server..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar dependências"
        exit 1
    fi
fi

# Criar diretório de logs se não existir
mkdir -p logs
echo "📁 Diretório de logs criado/verificado"

# Criar diretório de QR codes se não existir
mkdir -p qrcodes
echo "📁 Diretório de QR codes criado/verificado"

# Criar diretório de sessões se não existir  
mkdir -p sessions
echo "📁 Diretório de sessões criado/verificado"

# Verificar se a porta 3003 está livre
if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Porta 3003 já está em uso"
    echo "🔍 Processo usando a porta:"
    lsof -Pi :3003 -sTCP:LISTEN
    echo ""
    read -p "❓ Deseja continuar mesmo assim? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Abortado pelo usuário"
        exit 1
    fi
fi

echo ""
echo "📱 Iniciando WhatsApp Server SPR..."
echo "📝 Logs sendo salvos em: logs/spr_whatsapp.log"
echo "🌐 URL: http://localhost:3003"
echo "🔍 Health Check: http://localhost:3003/status"
echo "📱 QR Code: http://localhost:3003/qr"
echo ""
echo "💡 Para parar o serviço, pressione Ctrl+C"
echo "💡 Escaneie o QR code no WhatsApp Web para conectar"
echo "=================================================="

# Iniciar o WhatsApp Server com logs
node whatsapp_server_real.js 2>&1 | tee logs/spr_whatsapp.log