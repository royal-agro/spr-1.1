#!/bin/bash

# 🏥 SPR - Script de Verificação Completa de Saúde
# Verifica status HTTP, conectividade, recursos do sistema e oferece troubleshooting
# Detecta problemas comuns e gera relatório colorido de saúde geral

# Configurações globais
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
HEALTH_LOG="$LOG_DIR/health-check.log"
START_TIME=$(date +%s)

# Cores ANSI para output colorido
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# URLs e portas dos serviços
BACKEND_PORT=3002
WHATSAPP_PORT=3003
FRONTEND_PORT=3000
BACKEND_URL="http://localhost:$BACKEND_PORT"
WHATSAPP_URL="http://localhost:$WHATSAPP_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

# Timeouts configuráveis
HTTP_TIMEOUT=10
CONNECTION_TIMEOUT=5

# Arrays para armazenar resultados dos testes
declare -A SERVICE_STATUS
declare -A SERVICE_RESPONSE_TIME
declare -A SYSTEM_ISSUES
declare -A TROUBLESHOOTING_TIPS

# Contadores de problemas
CRITICAL_ISSUES=0
WARNING_ISSUES=0
INFO_ISSUES=0

# Função para exibir banner colorido
show_banner() {
    clear
    echo -e "${BOLD}${BLUE}"
    echo "████████████████████████████████████████████████████████████████"
    echo "██                                                            ██"
    echo "██    🏥 SPR - Sistema Preditivo Royal                       ██"
    echo "██    📊 Health Check - Verificação Completa de Saúde        ██"
    echo "██                                                            ██"
    echo "██    🔧 Backend    → http://localhost:3002                   ██"
    echo "██    📱 WhatsApp   → http://localhost:3003                   ██"
    echo "██    🎨 Frontend   → http://localhost:3000                   ██"
    echo "██                                                            ██"
    echo "████████████████████████████████████████████████████████████████"
    echo -e "${NC}"
    echo -e "${CYAN}📅 $(date)${NC}"
    echo -e "${CYAN}📍 Diretório: $PROJECT_ROOT${NC}"
    echo -e "${CYAN}📝 Log: $HEALTH_LOG${NC}"
    echo ""
}

# Função para logging
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$HEALTH_LOG"
}

# Função para progress bar
show_progress() {
    local current=$1
    local total=$2
    local description=$3
    local percent=$((current * 100 / total))
    local filled=$((current * 50 / total))
    
    printf "\r${CYAN}%s [" "$description"
    for ((i=0; i<filled; i++)); do printf "="; done
    for ((i=filled; i<50; i++)); do printf " "; done
    printf "] %d%% (%d/%d)${NC}" $percent $current $total
    
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# Função para testar conectividade HTTP
test_http_endpoint() {
    local service_name=$1
    local url=$2
    local expected_codes=${3:-"200"}
    
    echo -e "${YELLOW}🔍 Testando $service_name...${NC}"
    log_message "INFO" "Testing HTTP endpoint: $url"
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code},%{time_total}" --max-time $HTTP_TIMEOUT "$url" 2>/dev/null)
    local end_time=$(date +%s%3N)
    
    if [ $? -eq 0 ]; then
        local http_code=$(echo "$response" | tail -c 12 | cut -d',' -f1)
        local response_time=$(echo "$response" | tail -c 12 | cut -d',' -f2)
        local response_time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "0")
        
        SERVICE_RESPONSE_TIME[$service_name]="${response_time_ms%.*}ms"
        
        if [[ "$expected_codes" == *"$http_code"* ]]; then
            echo -e "${GREEN}✅ $service_name - HTTP $http_code (${response_time_ms%.*}ms)${NC}"
            SERVICE_STATUS[$service_name]="healthy"
            log_message "SUCCESS" "$service_name is healthy - HTTP $http_code in ${response_time_ms%.*}ms"
        else
            echo -e "${RED}❌ $service_name - HTTP $http_code (esperado: $expected_codes)${NC}"
            SERVICE_STATUS[$service_name]="unhealthy"
            SYSTEM_ISSUES[$service_name]="HTTP $http_code (esperado: $expected_codes)"
            TROUBLESHOOTING_TIPS[$service_name]="Verifique se o serviço está rodando e responde corretamente"
            ((CRITICAL_ISSUES++))
            log_message "ERROR" "$service_name returned HTTP $http_code, expected $expected_codes"
        fi
    else
        echo -e "${RED}❌ $service_name - Sem resposta ou timeout${NC}"
        SERVICE_STATUS[$service_name]="unreachable"
        SYSTEM_ISSUES[$service_name]="Sem resposta ou timeout após ${HTTP_TIMEOUT}s"
        TROUBLESHOOTING_TIPS[$service_name]="Verifique se o serviço está rodando na porta correta"
        ((CRITICAL_ISSUES++))
        log_message "ERROR" "$service_name is unreachable - timeout after ${HTTP_TIMEOUT}s"
    fi
}

# Função para testar conectividade entre componentes
test_connectivity() {
    echo -e "${BOLD}${PURPLE}🔗 TESTANDO CONECTIVIDADE ENTRE COMPONENTES${NC}"
    echo "============================================================"
    
    # Teste 1: Backend → Frontend
    echo -e "${YELLOW}🔍 Testando comunicação Backend → Frontend...${NC}"
    if curl -s --max-time $CONNECTION_TIMEOUT "$BACKEND_URL/api/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend pode ser acessado pelo Frontend${NC}"
        log_message "SUCCESS" "Backend-Frontend connectivity OK"
    else
        echo -e "${RED}❌ Falha na comunicação Backend → Frontend${NC}"
        SYSTEM_ISSUES["Backend-Frontend"]="Falha na comunicação"
        TROUBLESHOOTING_TIPS["Backend-Frontend"]="Verifique se o backend está rodando e as portas estão liberadas"
        ((CRITICAL_ISSUES++))
        log_message "ERROR" "Backend-Frontend connectivity failed"
    fi
    
    # Teste 2: WhatsApp → Backend
    echo -e "${YELLOW}🔍 Testando comunicação WhatsApp → Backend...${NC}"
    if curl -s --max-time $CONNECTION_TIMEOUT "$WHATSAPP_URL/api/status" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ WhatsApp Server está acessível${NC}"
        log_message "SUCCESS" "WhatsApp-Backend connectivity OK"
    else
        echo -e "${RED}❌ Falha na comunicação WhatsApp → Backend${NC}"
        SYSTEM_ISSUES["WhatsApp-Backend"]="Falha na comunicação"
        TROUBLESHOOTING_TIPS["WhatsApp-Backend"]="Verifique se o WhatsApp server está rodando"
        ((CRITICAL_ISSUES++))
        log_message "ERROR" "WhatsApp-Backend connectivity failed"
    fi
    
    # Teste 3: Cross-Origin (CORS)
    echo -e "${YELLOW}🔍 Testando configuração CORS...${NC}"
    local cors_test=$(curl -s -H "Origin: http://localhost:3000" \
                           -H "Access-Control-Request-Method: GET" \
                           -H "Access-Control-Request-Headers: X-Requested-With" \
                           -X OPTIONS "$BACKEND_URL/api/health" \
                           --max-time $CONNECTION_TIMEOUT 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Configuração CORS está funcionando${NC}"
        log_message "SUCCESS" "CORS configuration OK"
    else
        echo -e "${YELLOW}⚠️  Possível problema com CORS${NC}"
        SYSTEM_ISSUES["CORS"]="Configuração pode estar incorreta"
        TROUBLESHOOTING_TIPS["CORS"]="Verifique as configurações de CORS no backend"
        ((WARNING_ISSUES++))
        log_message "WARNING" "CORS configuration may have issues"
    fi
    
    echo ""
}

# Função para verificar recursos do sistema
check_system_resources() {
    echo -e "${BOLD}${PURPLE}💻 VERIFICANDO RECURSOS DO SISTEMA${NC}"
    echo "============================================================"
    
    # CPU Usage
    echo -e "${YELLOW}🔍 Verificando uso da CPU...${NC}"
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'u' -f1)
    if (( $(echo "$cpu_usage > 80" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${RED}❌ CPU com uso alto: ${cpu_usage}%${NC}"
        SYSTEM_ISSUES["CPU"]="Uso alto: ${cpu_usage}%"
        TROUBLESHOOTING_TIPS["CPU"]="Considere parar outros processos ou aumentar recursos"
        ((WARNING_ISSUES++))
        log_message "WARNING" "High CPU usage: ${cpu_usage}%"
    elif (( $(echo "$cpu_usage > 60" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${YELLOW}⚠️  CPU com uso moderado: ${cpu_usage}%${NC}"
        ((INFO_ISSUES++))
        log_message "INFO" "Moderate CPU usage: ${cpu_usage}%"
    else
        echo -e "${GREEN}✅ CPU com uso normal: ${cpu_usage}%${NC}"
        log_message "SUCCESS" "Normal CPU usage: ${cpu_usage}%"
    fi
    
    # Memory Usage
    echo -e "${YELLOW}🔍 Verificando uso da memória...${NC}"
    local mem_info=$(free -m | grep '^Mem:')
    local total_mem=$(echo $mem_info | awk '{print $2}')
    local used_mem=$(echo $mem_info | awk '{print $3}')
    local mem_percentage=$((used_mem * 100 / total_mem))
    
    if [ $mem_percentage -gt 85 ]; then
        echo -e "${RED}❌ Memória com uso alto: ${mem_percentage}% (${used_mem}MB/${total_mem}MB)${NC}"
        SYSTEM_ISSUES["Memory"]="Uso alto: ${mem_percentage}%"
        TROUBLESHOOTING_TIPS["Memory"]="Considere fechar aplicações ou aumentar RAM"
        ((WARNING_ISSUES++))
        log_message "WARNING" "High memory usage: ${mem_percentage}%"
    elif [ $mem_percentage -gt 70 ]; then
        echo -e "${YELLOW}⚠️  Memória com uso moderado: ${mem_percentage}% (${used_mem}MB/${total_mem}MB)${NC}"
        ((INFO_ISSUES++))
        log_message "INFO" "Moderate memory usage: ${mem_percentage}%"
    else
        echo -e "${GREEN}✅ Memória com uso normal: ${mem_percentage}% (${used_mem}MB/${total_mem}MB)${NC}"
        log_message "SUCCESS" "Normal memory usage: ${mem_percentage}%"
    fi
    
    # Disk Space
    echo -e "${YELLOW}🔍 Verificando espaço em disco...${NC}"
    local disk_usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    
    if [ $disk_usage -gt 90 ]; then
        echo -e "${RED}❌ Disco com pouco espaço: ${disk_usage}%${NC}"
        SYSTEM_ISSUES["Disk"]="Pouco espaço: ${disk_usage}%"
        TROUBLESHOOTING_TIPS["Disk"]="Limpe arquivos desnecessários ou logs antigos"
        ((WARNING_ISSUES++))
        log_message "WARNING" "Low disk space: ${disk_usage}%"
    elif [ $disk_usage -gt 80 ]; then
        echo -e "${YELLOW}⚠️  Disco com espaço moderado: ${disk_usage}%${NC}"
        ((INFO_ISSUES++))
        log_message "INFO" "Moderate disk usage: ${disk_usage}%"
    else
        echo -e "${GREEN}✅ Espaço em disco adequado: ${disk_usage}%${NC}"
        log_message "SUCCESS" "Adequate disk space: ${disk_usage}%"
    fi
    
    # Network Connectivity
    echo -e "${YELLOW}🔍 Verificando conectividade de rede...${NC}"
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Conectividade com a internet OK${NC}"
        log_message "SUCCESS" "Internet connectivity OK"
    else
        echo -e "${RED}❌ Problemas de conectividade com a internet${NC}"
        SYSTEM_ISSUES["Network"]="Sem conectividade com internet"
        TROUBLESHOOTING_TIPS["Network"]="Verifique sua conexão de rede"
        ((WARNING_ISSUES++))
        log_message "WARNING" "No internet connectivity"
    fi
    
    echo ""
}

# Função para detectar problemas comuns
detect_common_issues() {
    echo -e "${BOLD}${PURPLE}🔍 DETECTANDO PROBLEMAS COMUNS${NC}"
    echo "============================================================"
    
    # Verificar se as portas estão ocupadas por outros processos
    echo -e "${YELLOW}🔍 Verificando conflitos de porta...${NC}"
    for port in $BACKEND_PORT $WHATSAPP_PORT $FRONTEND_PORT; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process_info=$(lsof -Pi :$port -sTCP:LISTEN | tail -n +2)
            local process_name=$(echo "$process_info" | awk '{print $1}' | head -1)
            local process_pid=$(echo "$process_info" | awk '{print $2}' | head -1)
            
            if [[ "$process_name" == *"node"* ]] || [[ "$process_name" == *"npm"* ]]; then
                echo -e "${GREEN}✅ Porta $port ocupada por processo SPR ($process_name PID:$process_pid)${NC}"
                log_message "SUCCESS" "Port $port is occupied by SPR process ($process_name PID:$process_pid)"
            else
                echo -e "${RED}❌ Porta $port ocupada por processo externo: $process_name (PID:$process_pid)${NC}"
                SYSTEM_ISSUES["Port-$port"]="Ocupada por $process_name (PID:$process_pid)"
                TROUBLESHOOTING_TIPS["Port-$port"]="Execute: kill $process_pid ou use outra porta"
                ((CRITICAL_ISSUES++))
                log_message "ERROR" "Port $port occupied by external process: $process_name (PID:$process_pid)"
            fi
        else
            echo -e "${YELLOW}⚠️  Porta $port está livre (serviço pode não estar rodando)${NC}"
            ((INFO_ISSUES++))
            log_message "INFO" "Port $port is free (service may not be running)"
        fi
    done
    
    # Verificar dependências
    echo -e "${YELLOW}🔍 Verificando dependências...${NC}"
    
    # Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        echo -e "${GREEN}✅ Node.js instalado: $node_version${NC}"
        log_message "SUCCESS" "Node.js found: $node_version"
    else
        echo -e "${RED}❌ Node.js não encontrado${NC}"
        SYSTEM_ISSUES["Node.js"]="Não instalado"
        TROUBLESHOOTING_TIPS["Node.js"]="Instale Node.js: https://nodejs.org/"
        ((CRITICAL_ISSUES++))
        log_message "ERROR" "Node.js not found"
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        echo -e "${GREEN}✅ npm instalado: $npm_version${NC}"
        log_message "SUCCESS" "npm found: $npm_version"
    else
        echo -e "${RED}❌ npm não encontrado${NC}"
        SYSTEM_ISSUES["npm"]="Não instalado"
        TROUBLESHOOTING_TIPS["npm"]="Instale npm junto com Node.js"
        ((CRITICAL_ISSUES++))
        log_message "ERROR" "npm not found"
    fi
    
    # curl (para testes HTTP)
    if command -v curl &> /dev/null; then
        echo -e "${GREEN}✅ curl disponível${NC}"
        log_message "SUCCESS" "curl is available"
    else
        echo -e "${YELLOW}⚠️  curl não encontrado (necessário para testes HTTP)${NC}"
        SYSTEM_ISSUES["curl"]="Não instalado"
        TROUBLESHOOTING_TIPS["curl"]="Instale curl: sudo apt-get install curl"
        ((WARNING_ISSUES++))
        log_message "WARNING" "curl not found"
    fi
    
    # jq (para parsing JSON)
    if command -v jq &> /dev/null; then
        echo -e "${GREEN}✅ jq disponível${NC}"
        log_message "SUCCESS" "jq is available"
    else
        echo -e "${YELLOW}⚠️  jq não encontrado (recomendado para parsing JSON)${NC}"
        SYSTEM_ISSUES["jq"]="Não instalado"
        TROUBLESHOOTING_TIPS["jq"]="Instale jq: sudo apt-get install jq"
        ((INFO_ISSUES++))
        log_message "INFO" "jq not found but recommended"
    fi
    
    # Verificar arquivos principais
    echo -e "${YELLOW}🔍 Verificando arquivos principais do projeto...${NC}"
    local required_files=(
        "$PROJECT_ROOT/backend_server_fixed.js"
        "$PROJECT_ROOT/whatsapp_server_real.js"
        "$PROJECT_ROOT/frontend/package.json"
        "$PROJECT_ROOT/package.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅ $(basename "$file") encontrado${NC}"
            log_message "SUCCESS" "Required file found: $file"
        else
            echo -e "${RED}❌ $(basename "$file") não encontrado${NC}"
            SYSTEM_ISSUES["File-$(basename "$file")"]="Arquivo não encontrado"
            TROUBLESHOOTING_TIPS["File-$(basename "$file")"]="Verifique se está no diretório correto do projeto"
            ((CRITICAL_ISSUES++))
            log_message "ERROR" "Required file not found: $file"
        fi
    done
    
    # Verificar node_modules
    echo -e "${YELLOW}🔍 Verificando dependências instaladas...${NC}"
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        echo -e "${GREEN}✅ Dependências do backend instaladas${NC}"
        log_message "SUCCESS" "Backend dependencies installed"
    else
        echo -e "${RED}❌ Dependências do backend não instaladas${NC}"
        SYSTEM_ISSUES["Backend-Dependencies"]="node_modules não encontrado"
        TROUBLESHOOTING_TIPS["Backend-Dependencies"]="Execute: npm install no diretório raiz"
        ((WARNING_ISSUES++))
        log_message "WARNING" "Backend dependencies not installed"
    fi
    
    if [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        echo -e "${GREEN}✅ Dependências do frontend instaladas${NC}"
        log_message "SUCCESS" "Frontend dependencies installed"
    else
        echo -e "${RED}❌ Dependências do frontend não instaladas${NC}"
        SYSTEM_ISSUES["Frontend-Dependencies"]="node_modules não encontrado"
        TROUBLESHOOTING_TIPS["Frontend-Dependencies"]="Execute: cd frontend && npm install"
        ((WARNING_ISSUES++))
        log_message "WARNING" "Frontend dependencies not installed"
    fi
    
    echo ""
}

# Função para exibir relatório final
show_health_report() {
    echo -e "${BOLD}${WHITE}📊 RELATÓRIO DE SAÚDE DO SISTEMA SPR${NC}"
    echo "============================================================"
    
    # Resumo geral
    local total_issues=$((CRITICAL_ISSUES + WARNING_ISSUES + INFO_ISSUES))
    
    if [ $CRITICAL_ISSUES -eq 0 ] && [ $WARNING_ISSUES -eq 0 ]; then
        echo -e "${BOLD}${GREEN}🎉 SISTEMA SAUDÁVEL${NC}"
        echo -e "${GREEN}✅ Todos os componentes estão funcionando perfeitamente${NC}"
        log_message "SUCCESS" "System is healthy - no issues found"
    elif [ $CRITICAL_ISSUES -eq 0 ]; then
        echo -e "${BOLD}${YELLOW}⚠️  SISTEMA COM AVISOS${NC}"
        echo -e "${YELLOW}🔧 Alguns ajustes podem melhorar a performance${NC}"
        log_message "WARNING" "System has warnings but no critical issues"
    else
        echo -e "${BOLD}${RED}🚨 SISTEMA COM PROBLEMAS CRÍTICOS${NC}"
        echo -e "${RED}❌ Ação imediata necessária${NC}"
        log_message "ERROR" "System has critical issues requiring immediate attention"
    fi
    
    echo ""
    echo -e "${BOLD}📈 ESTATÍSTICAS:${NC}"
    echo -e "${RED}🚨 Problemas Críticos: $CRITICAL_ISSUES${NC}"
    echo -e "${YELLOW}⚠️  Avisos: $WARNING_ISSUES${NC}"
    echo -e "${BLUE}ℹ️  Informações: $INFO_ISSUES${NC}"
    echo -e "${CYAN}📊 Total de Verificações: $total_issues${NC}"
    
    # Status dos serviços
    echo ""
    echo -e "${BOLD}🏥 STATUS DOS SERVIÇOS:${NC}"
    for service in "Backend" "WhatsApp" "Frontend"; do
        local status=${SERVICE_STATUS[$service]:-"not_tested"}
        local response_time=${SERVICE_RESPONSE_TIME[$service]:-"N/A"}
        
        case $status in
            "healthy")
                echo -e "${GREEN}✅ $service - SAUDÁVEL ($response_time)${NC}"
                ;;
            "unhealthy")
                echo -e "${RED}❌ $service - COM PROBLEMAS${NC}"
                ;;
            "unreachable")
                echo -e "${RED}🔌 $service - INACESSÍVEL${NC}"
                ;;
            *)
                echo -e "${YELLOW}❓ $service - NÃO TESTADO${NC}"
                ;;
        esac
    done
    
    # Problemas encontrados
    if [ ${#SYSTEM_ISSUES[@]} -gt 0 ]; then
        echo ""
        echo -e "${BOLD}🔍 PROBLEMAS ENCONTRADOS:${NC}"
        for issue in "${!SYSTEM_ISSUES[@]}"; do
            echo -e "${RED}❌ $issue: ${SYSTEM_ISSUES[$issue]}${NC}"
        done
    fi
    
    # Dicas de troubleshooting
    if [ ${#TROUBLESHOOTING_TIPS[@]} -gt 0 ]; then
        echo ""
        echo -e "${BOLD}💡 DICAS DE SOLUÇÃO:${NC}"
        for tip in "${!TROUBLESHOOTING_TIPS[@]}"; do
            echo -e "${YELLOW}🔧 $tip: ${TROUBLESHOOTING_TIPS[$tip]}${NC}"
        done
    fi
    
    # Tempo total
    local end_time=$(date +%s)
    local total_time=$((end_time - START_TIME))
    echo ""
    echo -e "${CYAN}⏱️  Tempo total de verificação: ${total_time}s${NC}"
    echo -e "${CYAN}📝 Log completo salvo em: $HEALTH_LOG${NC}"
    echo "============================================================"
}

# Função para troubleshooting automático
auto_troubleshooting() {
    if [ ${#SYSTEM_ISSUES[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ Nenhum problema encontrado para resolver automaticamente${NC}"
        return 0
    fi
    
    echo -e "${BOLD}${YELLOW}🔧 TROUBLESHOOTING AUTOMÁTICO${NC}"
    echo "============================================================"
    
    read -p "❓ Deseja tentar resolver os problemas automaticamente? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏭️  Troubleshooting automático cancelado${NC}"
        return 0
    fi
    
    # Tentar instalar dependências faltando
    if [[ -n "${SYSTEM_ISSUES['Backend-Dependencies']}" ]] || [[ -n "${SYSTEM_ISSUES['Frontend-Dependencies']}" ]]; then
        echo -e "${YELLOW}📦 Tentando instalar dependências...${NC}"
        
        if [[ -n "${SYSTEM_ISSUES['Backend-Dependencies']}" ]]; then
            echo -e "${YELLOW}🔄 Instalando dependências do backend...${NC}"
            cd "$PROJECT_ROOT" && npm install
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Dependências do backend instaladas${NC}"
                unset SYSTEM_ISSUES['Backend-Dependencies']
                log_message "SUCCESS" "Backend dependencies installed automatically"
            else
                echo -e "${RED}❌ Falha ao instalar dependências do backend${NC}"
                log_message "ERROR" "Failed to install backend dependencies automatically"
            fi
        fi
        
        if [[ -n "${SYSTEM_ISSUES['Frontend-Dependencies']}" ]]; then
            echo -e "${YELLOW}🔄 Instalando dependências do frontend...${NC}"
            cd "$PROJECT_ROOT/frontend" && npm install
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Dependências do frontend instaladas${NC}"
                unset SYSTEM_ISSUES['Frontend-Dependencies']
                log_message "SUCCESS" "Frontend dependencies installed automatically"
            else
                echo -e "${RED}❌ Falha ao instalar dependências do frontend${NC}"
                log_message "ERROR" "Failed to install frontend dependencies automatically"
            fi
        fi
        
        cd "$PROJECT_ROOT"
    fi
    
    # Limpar logs antigos se disco estiver cheio
    if [[ -n "${SYSTEM_ISSUES['Disk']}" ]]; then
        echo -e "${YELLOW}🧹 Limpando logs antigos para liberar espaço...${NC}"
        if [ -d "$LOG_DIR" ]; then
            find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null
            echo -e "${GREEN}✅ Logs antigos removidos${NC}"
            log_message "SUCCESS" "Old logs cleaned up automatically"
        fi
    fi
    
    echo -e "${GREEN}✅ Troubleshooting automático concluído${NC}"
    echo ""
}

# Função principal de health check
run_health_check() {
    # Criar diretório de logs se não existir
    mkdir -p "$LOG_DIR"
    
    # Inicializar log
    log_message "INFO" "Starting health check"
    
    echo -e "${BOLD}${YELLOW}🏥 INICIANDO VERIFICAÇÃO DE SAÚDE COMPLETA${NC}"
    echo "============================================================"
    
    local total_steps=4
    local current_step=0
    
    # Step 1: Testar endpoints HTTP
    ((current_step++))
    show_progress $current_step $total_steps "Testando endpoints HTTP"
    sleep 1
    echo ""
    
    echo -e "${BOLD}${PURPLE}🌐 TESTANDO ENDPOINTS HTTP${NC}"
    echo "============================================================"
    
    test_http_endpoint "Backend" "$BACKEND_URL/api/health" "200"
    test_http_endpoint "Backend Status" "$BACKEND_URL/api/status" "200"
    test_http_endpoint "WhatsApp Status" "$WHATSAPP_URL/api/status" "200"
    test_http_endpoint "WhatsApp QR" "$WHATSAPP_URL/qr" "200"
    test_http_endpoint "Frontend" "$FRONTEND_URL" "200"
    
    echo ""
    
    # Step 2: Testar conectividade
    ((current_step++))
    show_progress $current_step $total_steps "Testando conectividade"
    sleep 1
    echo ""
    
    test_connectivity
    
    # Step 3: Verificar recursos do sistema
    ((current_step++))
    show_progress $current_step $total_steps "Verificando recursos do sistema"
    sleep 1
    echo ""
    
    check_system_resources
    
    # Step 4: Detectar problemas comuns
    ((current_step++))
    show_progress $current_step $total_steps "Detectando problemas comuns"
    sleep 1
    echo ""
    
    detect_common_issues
    
    # Relatório final
    show_health_report
    
    # Troubleshooting automático
    auto_troubleshooting
    
    log_message "INFO" "Health check completed - Critical: $CRITICAL_ISSUES, Warnings: $WARNING_ISSUES, Info: $INFO_ISSUES"
}

# Função para modo verbose
verbose_mode() {
    echo -e "${BOLD}${CYAN}🐛 MODO VERBOSE ATIVADO${NC}"
    echo "============================================================"
    echo -e "${CYAN}📝 Informações detalhadas serão exibidas${NC}"
    echo -e "${CYAN}🔍 Logs em tempo real habilitados${NC}"
    echo ""
    
    # Mostrar informações do sistema
    echo -e "${BOLD}💻 INFORMAÇÕES DO SISTEMA:${NC}"
    echo -e "${CYAN}🖥️  SO: $(uname -a)${NC}"
    echo -e "${CYAN}📊 Uptime: $(uptime)${NC}"
    echo -e "${CYAN}👤 Usuário: $(whoami)${NC}"
    echo -e "${CYAN}📍 PWD: $(pwd)${NC}"
    echo -e "${CYAN}🌐 IP Local: $(hostname -I | awk '{print $1}')${NC}"
    echo ""
    
    # Executar health check com logs detalhados
    tail -f "$HEALTH_LOG" &
    local tail_pid=$!
    
    run_health_check
    
    kill $tail_pid 2>/dev/null
}

# Função para exibir ajuda
show_help() {
    show_banner
    echo -e "${CYAN}📚 Uso do script:${NC}"
    echo ""
    echo "  $0                    # Health check completo"
    echo "  $0 --verbose          # Modo verbose com logs detalhados"
    echo "  $0 --quick            # Verificação rápida apenas dos serviços"
    echo "  $0 --services-only    # Testar apenas endpoints dos serviços"
    echo "  $0 --system-only      # Verificar apenas recursos do sistema"
    echo "  $0 --auto-fix         # Executar troubleshooting automático"
    echo "  $0 --help             # Mostrar esta ajuda"
    echo ""
    echo -e "${YELLOW}💡 Exemplos:${NC}"
    echo "  $0                    # Verificação completa"
    echo "  $0 --verbose          # Com logs detalhados"
    echo "  $0 --quick            # Verificação rápida"
    echo ""
}

# Função para verificação rápida
quick_check() {
    echo -e "${BOLD}${YELLOW}⚡ VERIFICAÇÃO RÁPIDA${NC}"
    echo "============================================================"
    
    test_http_endpoint "Backend" "$BACKEND_URL/api/health" "200"
    test_http_endpoint "WhatsApp" "$WHATSAPP_URL/api/status" "200"
    test_http_endpoint "Frontend" "$FRONTEND_URL" "200"
    
    echo ""
    if [ $CRITICAL_ISSUES -eq 0 ]; then
        echo -e "${GREEN}✅ Verificação rápida: Todos os serviços OK${NC}"
    else
        echo -e "${RED}❌ Verificação rápida: $CRITICAL_ISSUES problema(s) encontrado(s)${NC}"
        echo -e "${YELLOW}💡 Execute sem parâmetros para verificação completa${NC}"
    fi
}

# Função principal
main() {
    # Verificar argumentos
    case "${1:-}" in
        --verbose|-v)
            show_banner
            verbose_mode
            ;;
        --quick|-q)
            show_banner
            quick_check
            ;;
        --services-only)
            show_banner
            echo -e "${BOLD}${PURPLE}🌐 TESTANDO APENAS SERVIÇOS${NC}"
            echo "============================================================"
            test_http_endpoint "Backend" "$BACKEND_URL/api/health" "200"
            test_http_endpoint "Backend Status" "$BACKEND_URL/api/status" "200"
            test_http_endpoint "WhatsApp Status" "$WHATSAPP_URL/api/status" "200"
            test_http_endpoint "WhatsApp QR" "$WHATSAPP_URL/qr" "200"
            test_http_endpoint "Frontend" "$FRONTEND_URL" "200"
            show_health_report
            ;;
        --system-only)
            show_banner
            check_system_resources
            detect_common_issues
            show_health_report
            ;;
        --auto-fix)
            show_banner
            run_health_check
            ;;
        --help|-h)
            show_help
            ;;
        "")
            show_banner
            run_health_check
            ;;
        *)
            echo -e "${RED}❌ Opção inválida: $1${NC}"
            echo -e "${YELLOW}💡 Use $0 --help para ver as opções disponíveis${NC}"
            exit 1
            ;;
    esac
}

# Trap para limpeza
trap 'echo -e "\n${YELLOW}🛑 Health check interrompido pelo usuário${NC}"; exit 130' SIGINT SIGTERM

# Executar função principal
main "$@"