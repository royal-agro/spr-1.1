#!/bin/bash

# 🛑 SPR - Script para Parar Todos os Serviços
# Para todos os processos SPR (Backend, Frontend, WhatsApp)

echo "🛑 SPR - Parando Todos os Serviços..."
echo "📅 $(date)"
echo "=================================================="

# Função para parar processo em uma porta específica
stop_port() {
    local port=$1
    local service_name=$2
    
    echo "🔍 Verificando porta $port ($service_name)..."
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Processo encontrado na porta $port"
        
        # Obter PIDs dos processos
        pids=$(lsof -Pi :$port -sTCP:LISTEN -t)
        
        for pid in $pids; do
            # Obter informações do processo
            process_info=$(ps -p $pid -o comm= 2>/dev/null)
            echo "🔄 Parando processo $pid ($process_info)..."
            
            # Tentar parar graciosamente primeiro
            kill -TERM $pid 2>/dev/null
            
            # Aguardar 3 segundos
            sleep 3
            
            # Verificar se ainda está rodando
            if kill -0 $pid 2>/dev/null; then
                echo "⚡ Forçando parada do processo $pid..."
                kill -KILL $pid 2>/dev/null
            fi
            
            # Verificar se foi parado com sucesso
            if ! kill -0 $pid 2>/dev/null; then
                echo "✅ Processo $pid parado com sucesso"
            else
                echo "❌ Não foi possível parar o processo $pid"
            fi
        done
    else
        echo "✅ Nenhum processo rodando na porta $port"
    fi
    
    echo ""
}

# Parar serviços nas portas específicas
stop_port 3000 "Frontend React"
stop_port 3002 "Backend SPR"
stop_port 3003 "WhatsApp Server"

# Verificar e limpar processos órfãos relacionados ao SPR
echo "🧹 Verificando processos órfãos relacionados ao SPR..."

# Procurar por processos do Node.js relacionados aos arquivos SPR
spr_processes=$(ps aux | grep -E "(backend_server_fixed|whatsapp_server_real|react-scripts)" | grep -v grep | awk '{print $2}')

if [ ! -z "$spr_processes" ]; then
    echo "⚠️  Processos SPR órfãos encontrados:"
    ps aux | grep -E "(backend_server_fixed|whatsapp_server_real|react-scripts)" | grep -v grep
    echo ""
    
    read -p "❓ Deseja parar estes processos órfãos? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for pid in $spr_processes; do
            echo "🔄 Parando processo órfão $pid..."
            kill -TERM $pid 2>/dev/null
            sleep 2
            
            if kill -0 $pid 2>/dev/null; then
                kill -KILL $pid 2>/dev/null
            fi
        done
        echo "✅ Processos órfãos limpos"
    fi
else
    echo "✅ Nenhum processo órfão encontrado"
fi

echo ""
echo "=================================================="
echo "🏁 Verificação Final das Portas:"
echo ""

# Verificação final
for port in 3000 3002 3003; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Porta $port ainda em uso:"
        lsof -Pi :$port -sTCP:LISTEN
    else
        echo "✅ Porta $port livre"
    fi
done

echo ""
echo "🛑 Script de parada concluído"
echo "📝 Para ver logs dos serviços, verifique o diretório logs/"
echo "💡 Para reiniciar os serviços, use os scripts start-*.sh"
echo "=================================================="
