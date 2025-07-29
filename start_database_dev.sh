#!/bin/bash
# Script para inicializar banco de dados em desenvolvimento
# SPR - Sistema Preditivo Royal

echo "🌾 Iniciando banco de dados SPR em modo desenvolvimento..."

# Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down

# Remover volumes antigos (cuidado - apaga dados!)
echo "🗑️ Removendo volumes antigos..."
docker volume rm projeto_spr_postgres_data 2>/dev/null || true

# Subir apenas PostgreSQL e Redis para desenvolvimento
echo "🚀 Iniciando PostgreSQL e Redis..."
docker-compose up -d postgres redis

# Aguardar PostgreSQL ficar pronto
echo "⏳ Aguardando PostgreSQL inicializar..."
sleep 10

# Verificar se PostgreSQL está pronto
until docker-compose exec postgres pg_isready -U spr_user -d spr_db; do
    echo "⏳ PostgreSQL ainda inicializando..."
    sleep 2
done

echo "✅ PostgreSQL pronto!"

# Verificar Redis
echo "🔍 Verificando Redis..."
if docker-compose exec redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis pronto!"
else
    echo "⚠️ Redis pode não estar funcionando corretamente"
fi

# Executar inicialização do banco via Python
echo "🗄️ Inicializando estrutura do banco..."
python3 app/database/init_db.py

if [ $? -eq 0 ]; then
    echo "✅ Banco de dados inicializado com sucesso!"
    
    # Executar teste de integração
    echo "🧪 Executando testes de integração..."
    python3 test_database_agents.py
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 SISTEMA PRONTO PARA USO!"
        echo "📊 PostgreSQL: localhost:5432"
        echo "🔥 Redis: localhost:6379"
        echo "📱 Para conectar:"
        echo "   - Host: localhost"
        echo "   - Database: spr_db"
        echo "   - User: spr_user"
        echo "   - Password: spr_password"
        echo ""
        echo "🤖 Agentes disponíveis:"
        echo "   - Database Engineer (db_eng)"
        echo "   - Backend Python (py_eng)" 
        echo "   - Financial Modeling (fin_model)"
        echo "   - Business Intelligence (bi_analyst)"
        echo "   - AgriTech Data (agri_data)"
        echo "   - WhatsApp Specialist (wa_spec)"
        echo ""
        echo "🔗 Para parar: docker-compose down"
    else
        echo "⚠️ Testes falharam, mas banco está disponível"
    fi
    
else
    echo "❌ Falha na inicialização do banco"
    exit 1
fi