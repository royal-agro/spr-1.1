#!/bin/bash

# Script de configuração inicial para SPR 1.1 Frontend
# Royal Negócios Agrícolas

echo "🚀 Configurando SPR 1.1 Frontend..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js 16+ antes de continuar."
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js versão 16+ é necessária. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não está instalado."
    exit 1
fi

echo "✅ npm $(npm -v) detectado"

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas com sucesso"

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cat > .env << EOL
# Configurações do SPR 1.1 Frontend
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WHATSAPP_API_URL=ws://localhost:8000/ws
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=1.1.0
REACT_APP_COMPANY_NAME=Royal Negócios Agrícolas

# Configurações de desenvolvimento
GENERATE_SOURCEMAP=true
REACT_APP_DEBUG=true
EOL
    echo "✅ Arquivo .env criado"
else
    echo "ℹ️ Arquivo .env já existe"
fi

# Criar diretório de assets se não existir
if [ ! -d "src/assets" ]; then
    echo "📁 Criando diretório de assets..."
    mkdir -p src/assets/logos
    mkdir -p src/assets/images
    mkdir -p src/assets/icons
    echo "✅ Diretórios de assets criados"
fi

# Criar diretório public/assets se não existir
if [ ! -d "public/assets" ]; then
    echo "📁 Criando diretório public/assets..."
    mkdir -p public/assets/logos
    mkdir -p public/assets/images
    echo "✅ Diretórios public/assets criados"
fi

# Verificar se o build funciona
echo "🔨 Testando build..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Build de teste executado com sucesso"
    rm -rf build
else
    echo "⚠️ Aviso: Build de teste falhou. Verifique as dependências."
fi

# Informações finais
echo ""
echo "🎉 Configuração concluída com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Copie os logos da empresa para src/assets/logos/"
echo "   2. Copie as imagens para src/assets/images/"
echo "   3. Configure as variáveis de ambiente no arquivo .env"
echo "   4. Execute 'npm start' para iniciar o desenvolvimento"
echo ""
echo "🚀 Comandos disponíveis:"
echo "   npm start          - Iniciar desenvolvimento"
echo "   npm run build      - Build para produção"
echo "   npm test           - Executar testes"
echo "   npm run lint       - Verificar código"
echo "   npm run format     - Formatar código"
echo ""
echo "📞 Suporte: suporte@royal-agro.com"
echo "🌐 Documentação: ./README.md"
echo ""
echo "Desenvolvido com ❤️ para Royal Negócios Agrícolas" 