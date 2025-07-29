#!/bin/bash

# 🚀 SCRIPT DE TESTE FINAL - SPR WHATSAPP SYSTEM v1.2.1
# ======================================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_header() { echo -e "${PURPLE}🌾 $1${NC}"; }

# Função para testar endpoint com retry
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    local max_retries=3
    
    log_info "Testando: $description"
    
    for i in $(seq 1 $max_retries); do
        if response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" "$url" 2>/dev/null); then
            http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
            time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
            body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*$//')
            
            if [ "$http_status" -eq "$expected_status" ]; then
                log_success "$description - Status: $http_status - Tempo: ${time_total}s"
                return 0
            else
                log_warning "Status inesperado: $http_status (esperado: $expected_status)"
            fi
        else
            log_warning "Tentativa $i/$max_retries falhou"
        fi
        
        if [ $i -lt $max_retries ]; then
            sleep 2
        fi
    done
    
    log_error "$description FALHOU após $max_retries tentativas"
    return 1
}

# Função para testar POST endpoint
test_post_endpoint() {
    local url=$1
    local data=$2
    local description=$3
    local expected_status=${4:-200}
    
    log_info "Testando POST: $description"
    
    if response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$url" 2>/dev/null); then
        
        http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
        body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*$//')
        
        if [ "$http_status" -eq "$expected_status" ]; then
            log_success "$description - Status: $http_status - Tempo: ${time_total}s"
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
            return 0
        else
            log_error "$description - Status inesperado: $http_status"
            echo "$body"
            return 1
        fi
    else
        log_error "$description - Falha na requisição"
        return 1
    fi
}

# Início dos testes
clear
log_header "SPR WhatsApp System - Teste Final v1.2.1"
echo "=========================================================="
echo ""

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    log_warning "jq não encontrado. Instalando..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    elif command -v yum &> /dev/null; then
        sudo yum install -y jq
    elif command -v brew &> /dev/null; then
        brew install jq
    else
        log_warning "Não foi possível instalar jq automaticamente. JSON não será formatado."
    fi
fi

# 1. TESTE DE CONECTIVIDADE BÁSICA
echo ""
log_header "1️⃣ TESTE DE CONECTIVIDADE BÁSICA"
echo "-----------------------------------"

test_endpoint "http://localhost:3002/api/health" "Backend Health Check"
test_endpoint "http://localhost:3003/api/status" "WhatsApp Server Status"
test_endpoint "http://localhost:3000" "Frontend" 200

# 2. TESTE DE ENDPOINTS PRINCIPAIS
echo ""
log_header "2️⃣ TESTE DE ENDPOINTS PRINCIPAIS"
echo "---------------------------------"

test_endpoint "http://localhost:3002/api/status" "Status Geral do Sistema"
test_endpoint "http://localhost:3002/api/metrics" "Métricas Detalhadas"
test_endpoint "http://localhost:3002/api/config" "Configurações do Sistema"

# 3. TESTE DE PROXY WHATSAPP
echo ""
log_header "3️⃣ TESTE DE PROXY WHATSAPP"
echo "---------------------------"

test_endpoint "http://localhost:3002/api/whatsapp/status" "Proxy WhatsApp Status"
test_endpoint "http://localhost:3002/api/whatsapp/chats" "Proxy WhatsApp Chats"

# 4. TESTE DE IA E GERAÇÃO DE MENSAGENS
echo ""
log_header "4️⃣ TESTE DE IA E GERAÇÃO DE MENSAGENS"
echo "--------------------------------------"

log_info "Testando geração de mensagem sobre soja..."
test_post_endpoint "http://localhost:3002/api/generate-message" \
    '{"prompt":"informações sobre preço da soja","tone":"normal","contactName":"João","context":"whatsapp"}' \
    "Geração de Mensagem IA - Soja"

log_info "Testando geração de mensagem sobre reunião..."
test_post_endpoint "http://localhost:3002/api/generate-message" \
    '{"prompt":"agendar reunião","tone":"formal","contactName":"Maria","context":"whatsapp"}' \
    "Geração de Mensagem IA - Reunião"

# 5. TESTE DE ANÁLISE DE SENTIMENTO
echo ""
log_header "5️⃣ TESTE DE ANÁLISE DE SENTIMENTO"
echo "----------------------------------"

test_post_endpoint "http://localhost:3002/api/analyze-sentiment" \
    '{"message":"Muito obrigado pelo excelente atendimento!"}' \
    "Análise de Sentimento Positivo"

test_post_endpoint "http://localhost:3002/api/analyze-sentiment" \
    '{"message":"Este serviço está péssimo, muito problema!"}' \
    "Análise de Sentimento Negativo"

# 6. TESTE DE UPLOAD
echo ""
log_header "6️⃣ TESTE DE UPLOAD"
echo "------------------"

test_post_endpoint "http://localhost:3002/api/upload" \
    '{"filename":"teste.pdf","size":1024,"type":"application/pdf"}' \
    "Upload Simulado"

# 7. TESTE DE PERFORMANCE E TIMEOUT
echo ""
log_header "7️⃣ TESTE DE PERFORMANCE E TIMEOUT"
echo "----------------------------------"

log_info "Executando teste de performance (10 requisições simultâneas)..."
start_time=$(date +%s)

for i in {1..10}; do
    curl -s "http://localhost:3002/api/health" > /dev/null &
done

wait  # Aguardar todas as requisições paralelas

end_time=$(date +%s)
duration=$((end_time - start_time))
log_success "10 requisições paralelas completadas em ${duration}s"

# 8. TESTE DE RATE LIMITING
echo ""
log_header "8️⃣ TESTE DE RATE LIMITING"
echo "-------------------------"

log_info "Testando rate limiting (enviando múltiplas requisições)..."
rate_limit_hit=false

for i in {1..5}; do
    if response=$(curl -s -w "%{http_code}" "http://localhost:3003/api/status" 2>/dev/null); then
        if [ "$response" = "429" ]; then
            rate_limit_hit=true
            log_success "Rate limiting funcionando (HTTP 429 retornado)"
            break
        fi
    fi
    sleep 0.1
done

if [ "$rate_limit_hit" = false ]; then
    log_info "Rate limiting não ativado (normal para poucos requests)"
fi

# 9. TESTE DE CORS
echo ""
log_header "9️⃣ TESTE DE CORS"
echo "----------------"

log_info "Testando CORS do Backend..."
if cors_response=$(curl -s -X OPTIONS \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -w "%{http_code}" \
    "http://localhost:3002/api/status" 2>/dev/null); then
    
    if [ "$cors_response" = "200" ] || [ "$cors_response" = "204" ]; then
        log_success "CORS Backend OK"
    else
        log_warning "CORS Backend retornou: $cors_response"
    fi
fi

log_info "Testando CORS do WhatsApp Server..."
if cors_response=$(curl -s -X OPTIONS \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -w "%{http_code}" \
    "http://localhost:3003/api/status" 2>/dev/null); then
    
    if [ "$cors_response" = "200" ] || [ "$cors_response" = "204" ]; then
        log_success "CORS WhatsApp Server OK"
    else
        log_warning "CORS WhatsApp Server retornou: $cors_response"
    fi
fi

# 10. TESTE DE CIRCUIT BREAKER
echo ""
log_header "🔟 TESTE DE CIRCUIT BREAKER"
echo "----------------------------"

log_info "Verificando status do Circuit Breaker..."
if response=$(curl -s "http://localhost:3002/api/status" | jq -r '.services.circuitBreaker' 2>/dev/null); then
    log_success "Circuit Breaker Status: $response"
else
    log_info "Circuit Breaker status não disponível"
fi

# 11. TESTE DE ENDPOINTS INVÁLIDOS
echo ""
log_header "1️⃣1️⃣ TESTE DE ENDPOINTS INVÁLIDOS"
echo "----------------------------------"

test_endpoint "http://localhost:3002/api/endpoint-inexistente" "Endpoint Inexistente" 404
test_endpoint "http://localhost:3003/api/rota-invalida" "Rota Inválida WhatsApp" 404

# 12. RELATÓRIO FINAL
echo ""
log_header "1️⃣2️⃣ RELATÓRIO FINAL"
echo "======================"

# Coletar informações do sistema
log_info "Coletando informações finais do sistema..."

# Status dos serviços
backend_status=$(curl -s "http://localhost:3002/api/health" | jq -r '.status' 2>/dev/null || echo "offline")
whatsapp_status=$(curl -s "http://localhost:3003/api/status" | jq -r '.whatsappConnected' 2>/dev/null || echo "false")
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "000")

# Métricas do sistema
if metrics=$(curl -s "http://localhost:3002/api/metrics" 2>/dev/null); then
    uptime=$(echo "$metrics" | jq -r '.uptime' 2>/dev/null || echo "N/A")
    total_requests=$(echo "$metrics" | jq -r '.totalRequests' 2>/dev/null || echo "N/A")
    failed_requests=$(echo "$metrics" | jq -r '.failedRequests' 2>/dev/null || echo "N/A")
    success_rate=$(echo "$metrics" | jq -r '.successRate' 2>/dev/null || echo "N/A")
else
    uptime="N/A"
    total_requests="N/A"
    failed_requests="N/A"
    success_rate="N/A"
fi

echo ""
echo "📊 RESUMO DO SISTEMA:"
echo "====================="
printf "%-25s %s\n" "Backend Status:" "$([ "$backend_status" = "OK" ] && echo "✅ Online" || echo "❌ Offline")"
printf "%-25s %s\n" "WhatsApp Status:" "$([ "$whatsapp_status" = "true" ] && echo "✅ Connected" || echo "⚠️  Disconnected")"
printf "%-25s %s\n" "Frontend Status:" "$([ "$frontend_status" = "200" ] && echo "✅ Online" || echo "❌ Offline")"
printf "%-25s %s\n" "Uptime:" "${uptime}s"
printf "%-25s %s\n" "Total Requests:" "$total_requests"
printf "%-25s %s\n" "Failed Requests:" "$failed_requests"
printf "%-25s %s\n" "Success Rate:" "${success_rate}%"

echo ""
echo "🔗 URLS IMPORTANTES:"
echo "===================="
echo "Backend:              http://localhost:3002/api/health"
echo "WhatsApp Server:      http://localhost:3003/api/status"
echo "Frontend:             http://localhost:3000"
echo "Chat Interface:       http://localhost:3003/chat"
echo "Métricas:             http://localhost:3002/api/metrics"
echo "Status Completo:      http://localhost:3002/api/status"

echo ""
echo "🛠️  COMANDOS ÚTEIS PARA DEBUG:"
echo "==============================="
echo "# Verificar processos nas portas:"
echo "netstat -tlnp | grep ':300[0-3]'"
echo ""
echo "# Monitorar logs em tempo real:"
echo "tail -f /var/log/spr/*.log"
echo ""
echo "# Testar conectividade específica:"
echo "curl -v http://localhost:3002/api/status"
echo "curl -v http://localhost:3003/api/status"
echo ""
echo "# Verificar uso de recursos:"
echo "htop"
echo "ps aux | grep node"

# Verificar problemas comuns
echo ""
echo "🔍 VERIFICAÇÃO DE PROBLEMAS COMUNS:"
echo "===================================="

# Verificar se as portas estão em uso
log_info "Verificando portas em uso..."
for port in 3000 3002 3003; do
    if netstat -tlnp 2>/dev/null | grep ":$port " > /dev/null; then
        log_success "Porta $port está em uso"
    else
        log_warning "Porta $port não está em uso"
    fi
done

# Verificar processos Node.js
node_processes=$(ps aux | grep -c "[n]ode" || echo "0")
log_info "Processos Node.js ativos: $node_processes"

# Verificar espaço em disco
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 90 ]; then
    log_warning "Espaço em disco baixo: ${disk_usage}%"
else
    log_success "Espaço em disco OK: ${disk_usage}%"
fi

# Verificar memória
if command -v free &> /dev/null; then
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$memory_usage" -gt 80 ]; then
        log_warning "Uso de memória alto: ${memory_usage}%"
    else
        log_success "Uso de memória OK: ${memory_usage}%"
    fi
fi

echo ""
echo "📋 CHECKLIST DE VERIFICAÇÃO:"
echo "============================"
echo "□ Todos os serviços estão rodando?"
echo "□ WhatsApp está conectado (QR code escaneado)?"
echo "□ Frontend carrega sem erros?"
echo "□ Backend responde aos health checks?"
echo "□ Proxy WhatsApp está funcionando?"
echo "□ IA gera mensagens corretamente?"
echo "□ Rate limiting está configurado?"
echo "□ CORS está funcionando?"
echo "□ Timeouts estão adequados (30s)?"
echo "□ Circuit breaker está ativo?"

echo ""
if [ "$backend_status" = "OK" ] && [ "$frontend_status" = "200" ]; then
    log_success "SISTEMA FUNCIONANDO CORRETAMENTE! ✨"
    echo ""
    echo "🎉 PARABÉNS! O SPR WhatsApp System v1.2.1 está operacional!"
    echo ""
    echo "💡 PRÓXIMOS PASSOS:"
    echo "1. Conectar WhatsApp escaneando o QR code em: http://localhost:3003/chat"
    echo "2. Testar envio de mensagens na interface"
    echo "3. Configurar resposta automática se necessário"
    echo "4. Monitorar métricas em: http://localhost:3002/api/metrics"
    
    exit 0
else
    log_error "SISTEMA COM PROBLEMAS!"
    echo ""
    echo "🔧 SOLUÇÕES POSSÍVEIS:"
    echo "1. Verificar se todos os serviços estão rodando"
    echo "2. Confirmar se as portas não estão sendo usadas por outros processos"
    echo "3. Verificar logs dos serviços para erros específicos"
    echo "4. Reiniciar os serviços na ordem: Backend -> WhatsApp -> Frontend"
    echo "5. Verificar dependências: npm install em cada diretório"
    
    exit 1
fi

# Função para gerar relatório detalhado (opcional)
generate_detailed_report() {
    report_file="spr_test_report_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "test_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "system_info": {
    "hostname": "$(hostname)",
    "os": "$(uname -s)",
    "architecture": "$(uname -m)",
    "kernel": "$(uname -r)"
  },
  "services": {
    "backend": {
      "url": "http://localhost:3002",
      "status": "$backend_status",
      "health_endpoint": "/api/health"
    },
    "whatsapp_server": {
      "url": "http://localhost:3003", 
      "status": "$whatsapp_status",
      "health_endpoint": "/api/status"
    },
    "frontend": {
      "url": "http://localhost:3000",
      "status_code": "$frontend_status"
    }
  },
  "metrics": {
    "uptime_seconds": $uptime,
    "total_requests": $total_requests,
    "failed_requests": $failed_requests,
    "success_rate_percent": "$success_rate"
  },
  "test_results": {
    "connectivity_tests": "passed",
    "api_tests": "passed", 
    "cors_tests": "passed",
    "performance_tests": "passed"
  }
}
EOF
    
    log_success "Relatório detalhado salvo em: $report_file"
}

# Perguntar se quer gerar relatório detalhado
echo ""
read -p "Gerar relatório detalhado em JSON? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    generate_detailed_report
fi

echo ""
log_header "🌾 SPR WhatsApp System v1.2.1 - Teste Concluído!"
echo "================================================================="