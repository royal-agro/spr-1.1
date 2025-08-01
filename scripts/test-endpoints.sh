#!/bin/bash

# 🧪 SPR - Script de Teste Completo de APIs
# Testa todas as APIs do backend, WhatsApp server e frontend
# Gera relatório detalhado com timing e validação de respostas

# Configurações globais
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
TEST_LOG="$LOG_DIR/test-endpoints.log"
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

# Configurações de teste
HTTP_TIMEOUT=15
VERBOSE_MODE=false
GENERATE_REPORT=true
SAVE_RESPONSES=false

# Contadores de testes
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Arrays para armazenar resultados
declare -A TEST_RESULTS
declare -A TEST_TIMING
declare -A TEST_ERRORS
declare -A TEST_RESPONSES

# Função para exibir banner colorido
show_banner() {
    clear
    echo -e "${BOLD}${BLUE}"
    echo "████████████████████████████████████████████████████████████████"
    echo "██                                                            ██"
    echo "██    🧪 SPR - Sistema Preditivo Royal                       ██"
    echo "██    📊 Teste Completo de APIs - Endpoint Testing           ██"
    echo "██                                                            ██"
    echo "██    🔧 Backend    → http://localhost:3002                   ██"
    echo "██    📱 WhatsApp   → http://localhost:3003                   ██"
    echo "██    🎨 Frontend   → http://localhost:3000                   ██"
    echo "██                                                            ██"
    echo "████████████████████████████████████████████████████████████████"
    echo -e "${NC}"
    echo -e "${CYAN}📅 $(date)${NC}"
    echo -e "${CYAN}📍 Diretório: $PROJECT_ROOT${NC}"
    echo -e "${CYAN}📝 Log: $TEST_LOG${NC}"
    echo ""
}

# Função para logging
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$TEST_LOG"
}

# Função para executar teste HTTP
execute_test() {
    local test_name=$1
    local method=$2
    local url=$3
    local expected_status=${4:-"200"}
    local payload=${5:-""}
    local content_type=${6:-"application/json"}
    
    ((TOTAL_TESTS++))
    
    echo -e "${YELLOW}🔍 Testando: $test_name${NC}"
    if [ "$VERBOSE_MODE" = true ]; then
        echo -e "${CYAN}   Método: $method${NC}"
        echo -e "${CYAN}   URL: $url${NC}"
        echo -e "${CYAN}   Status esperado: $expected_status${NC}"
    fi
    
    log_message "INFO" "Starting test: $test_name ($method $url)"
    
    local start_time=$(date +%s%3N)
    local temp_file=$(mktemp)
    local response_file=$(mktemp)
    
    # Construir comando curl
    local curl_cmd="curl -s -w '%{http_code},%{time_total},%{size_download}' --max-time $HTTP_TIMEOUT"
    
    if [ -n "$payload" ]; then
        curl_cmd="$curl_cmd -X $method -H 'Content-Type: $content_type' -d '$payload'"
    else
        curl_cmd="$curl_cmd -X $method"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    # Executar teste
    local response=$(eval "$curl_cmd" -o "$response_file" 2>"$temp_file")
    local curl_exit_code=$?
    local end_time=$(date +%s%3N)
    
    # Processar resultado
    if [ $curl_exit_code -eq 0 ]; then
        local http_code=$(echo "$response" | cut -d',' -f1)
        local time_total=$(echo "$response" | cut -d',' -f2)
        local size_download=$(echo "$response" | cut -d',' -f3)
        local response_body=$(cat "$response_file")
        
        # Converter tempo para ms
        local time_ms=$(echo "$time_total * 1000" | bc -l 2>/dev/null || echo "0")
        time_ms=${time_ms%.*}
        
        TEST_TIMING["$test_name"]="${time_ms}ms"
        
        if [ "$SAVE_RESPONSES" = true ]; then
            TEST_RESPONSES["$test_name"]="$response_body"
        fi
        
        # Validar status code
        if [[ "$expected_status" == *"$http_code"* ]]; then
            echo -e "${GREEN}✅ $test_name - HTTP $http_code (${time_ms}ms, ${size_download} bytes)${NC}"
            TEST_RESULTS["$test_name"]="PASS"
            ((PASSED_TESTS++))
            log_message "SUCCESS" "$test_name passed - HTTP $http_code in ${time_ms}ms"
            
            # Validações adicionais baseadas no endpoint
            validate_response_content "$test_name" "$http_code" "$response_body" "$url"
            
        else
            echo -e "${RED}❌ $test_name - HTTP $http_code (esperado: $expected_status)${NC}"
            TEST_RESULTS["$test_name"]="FAIL"
            TEST_ERRORS["$test_name"]="HTTP $http_code (esperado: $expected_status)"
            ((FAILED_TESTS++))
            log_message "ERROR" "$test_name failed - HTTP $http_code, expected $expected_status"
        fi
        
        if [ "$VERBOSE_MODE" = true ]; then
            echo -e "${CYAN}   Tempo de resposta: ${time_ms}ms${NC}"
            echo -e "${CYAN}   Tamanho da resposta: ${size_download} bytes${NC}"
            if [ ${#response_body} -lt 200 ]; then
                echo -e "${CYAN}   Resposta: $response_body${NC}"
            else
                echo -e "${CYAN}   Resposta: $(echo "$response_body" | cut -c1-100)...${NC}"
            fi
        fi
        
    else
        local error_msg=$(cat "$temp_file")
        echo -e "${RED}❌ $test_name - Erro de conexão ou timeout${NC}"
        TEST_RESULTS["$test_name"]="ERROR"
        TEST_ERRORS["$test_name"]="Conexão falhou: $error_msg"
        ((FAILED_TESTS++))
        log_message "ERROR" "$test_name error - Connection failed: $error_msg"
        
        if [ "$VERBOSE_MODE" = true ]; then
            echo -e "${RED}   Erro: $error_msg${NC}"
        fi
    fi
    
    # Limpeza
    rm -f "$temp_file" "$response_file"
    echo ""
}

# Função para validar conteúdo da resposta
validate_response_content() {
    local test_name=$1
    local http_code=$2
    local response_body=$3
    local url=$4
    
    # Validação específica por endpoint
    case "$url" in
        *"/api/health")
            if echo "$response_body" | grep -q "status.*ok\|healthy\|running" 2>/dev/null; then
                echo -e "${GREEN}   ✓ Resposta de saúde válida${NC}"
                log_message "SUCCESS" "$test_name - Health response is valid"
            else
                echo -e "${YELLOW}   ⚠ Resposta de saúde pode estar incompleta${NC}"
                log_message "WARNING" "$test_name - Health response may be incomplete"
            fi
            ;;
        *"/api/status")
            if echo "$response_body" | grep -q "status\|state\|connected" 2>/dev/null; then
                echo -e "${GREEN}   ✓ Resposta de status válida${NC}"
                log_message "SUCCESS" "$test_name - Status response is valid"
            else
                echo -e "${YELLOW}   ⚠ Resposta de status pode estar incompleta${NC}"
                log_message "WARNING" "$test_name - Status response may be incomplete"
            fi
            ;;
        *"/api/dashboard")
            if echo "$response_body" | grep -q "data\|metrics\|stats" 2>/dev/null; then
                echo -e "${GREEN}   ✓ Dados do dashboard encontrados${NC}"
                log_message "SUCCESS" "$test_name - Dashboard data found"
            else
                echo -e "${YELLOW}   ⚠ Dados do dashboard podem estar ausentes${NC}"
                log_message "WARNING" "$test_name - Dashboard data may be missing"
            fi
            ;;
        *"/qr")
            if [ ${#response_body} -gt 100 ]; then
                echo -e "${GREEN}   ✓ QR Code parece estar presente${NC}"
                log_message "SUCCESS" "$test_name - QR code appears to be present"
            else
                echo -e "${YELLOW}   ⚠ QR Code pode não estar disponível${NC}"
                log_message "WARNING" "$test_name - QR code may not be available"
            fi
            ;;
        *"/api/chats")
            if echo "$response_body" | grep -q "\[\|\{" 2>/dev/null; then
                echo -e "${GREEN}   ✓ Lista de chats retornada${NC}"
                log_message "SUCCESS" "$test_name - Chat list returned"
            else
                echo -e "${YELLOW}   ⚠ Lista de chats pode estar vazia${NC}"
                log_message "WARNING" "$test_name - Chat list may be empty"
            fi
            ;;
        *)
            if [ "$http_code" = "200" ] && [ ${#response_body} -gt 0 ]; then
                echo -e "${GREEN}   ✓ Resposta não vazia recebida${NC}"
                log_message "SUCCESS" "$test_name - Non-empty response received"
            fi
            ;;
    esac
}

# Função para testar APIs do Backend
test_backend_apis() {
    echo -e "${BOLD}${PURPLE}🔧 TESTANDO APIs DO BACKEND (porta $BACKEND_PORT)${NC}"
    echo "============================================================"
    
    # Teste básico de saúde
    execute_test "Backend Health Check" "GET" "$BACKEND_URL/api/health" "200"
    
    # Teste de status
    execute_test "Backend Status" "GET" "$BACKEND_URL/api/status" "200"
    
    # Teste do dashboard
    execute_test "Backend Dashboard Data" "GET" "$BACKEND_URL/api/dashboard" "200"
    
    # Teste de geração de mensagem (POST com payload)
    local test_payload='{"tipo": "previsao", "commodity": "soja", "regiao": "MT", "periodo": "7_dias"}'
    execute_test "Generate Message API" "POST" "$BACKEND_URL/api/generate-message" "200" "$test_payload"
    
    # Teste de endpoints adicionais se existirem
    execute_test "Backend Root" "GET" "$BACKEND_URL/" "200,404"
    
    # Teste de CORS preflight
    execute_test "Backend CORS Preflight" "OPTIONS" "$BACKEND_URL/api/health" "200,204"
    
    echo -e "${GREEN}✅ Testes do Backend concluídos${NC}"
    echo ""
}

# Função para testar APIs do WhatsApp Server
test_whatsapp_apis() {
    echo -e "${BOLD}${PURPLE}📱 TESTANDO APIs DO WHATSAPP SERVER (porta $WHATSAPP_PORT)${NC}"
    echo "============================================================"
    
    # Teste de status
    execute_test "WhatsApp Status" "GET" "$WHATSAPP_URL/api/status" "200"
    
    # Teste do QR Code
    execute_test "WhatsApp QR Code" "GET" "$WHATSAPP_URL/qr" "200"
    
    # Teste da lista de chats
    execute_test "WhatsApp Chat List" "GET" "$WHATSAPP_URL/api/chats" "200"
    
    # Teste de health check se disponível
    execute_test "WhatsApp Health" "GET" "$WHATSAPP_URL/api/health" "200,404"
    
    # Teste de conexão WebSocket (simulado via HTTP)
    execute_test "WhatsApp Connection Info" "GET" "$WHATSAPP_URL/api/connection" "200,404"
    
    # Teste do root
    execute_test "WhatsApp Root" "GET" "$WHATSAPP_URL/" "200,404"
    
    echo -e "${GREEN}✅ Testes do WhatsApp Server concluídos${NC}"
    echo ""
}

# Função para testar Frontend
test_frontend() {
    echo -e "${BOLD}${PURPLE}🎨 TESTANDO FRONTEND (porta $FRONTEND_PORT)${NC}"
    echo "============================================================"
    
    # Teste de carregamento da página principal
    execute_test "Frontend Main Page" "GET" "$FRONTEND_URL/" "200"
    
    # Teste de recursos estáticos
    execute_test "Frontend Manifest" "GET" "$FRONTEND_URL/manifest.json" "200,404"
    
    # Teste de favicon
    execute_test "Frontend Favicon" "GET" "$FRONTEND_URL/favicon.ico" "200,404"
    
    # Teste de assets básicos
    execute_test "Frontend Static Assets" "GET" "$FRONTEND_URL/static/" "200,404"
    
    echo -e "${GREEN}✅ Testes do Frontend concluídos${NC}"
    echo ""
}

# Função para testar integração entre serviços
test_integration() {
    echo -e "${BOLD}${PURPLE}🔗 TESTANDO INTEGRAÇÃO ENTRE SERVIÇOS${NC}"
    echo "============================================================"
    
    # Verificar se Backend pode acessar dados necessários
    echo -e "${YELLOW}🔍 Testando fluxo Backend → Dados${NC}"
    execute_test "Backend Data Flow" "GET" "$BACKEND_URL/api/dashboard" "200"
    
    # Verificar comunicação WhatsApp → Backend (simulada)
    echo -e "${YELLOW}🔍 Testando fluxo WhatsApp → Backend${NC}"
    local integration_payload='{"source": "whatsapp", "test": true}'
    execute_test "WhatsApp-Backend Integration" "POST" "$BACKEND_URL/api/webhook" "200,404" "$integration_payload"
    
    # Testar endpoints de notificação
    echo -e "${YELLOW}🔍 Testando sistema de notificações${NC}"
    execute_test "Notification System" "GET" "$BACKEND_URL/api/notifications" "200,404"
    
    # Testar autenticação/autorização se disponível
    echo -e "${YELLOW}🔍 Testando sistema de autenticação${NC}"
    execute_test "Auth System" "GET" "$BACKEND_URL/api/auth/status" "200,401,404"
    
    echo -e "${GREEN}✅ Testes de integração concluídos${NC}"
    echo ""
}

# Função para teste de carga básico
basic_load_test() {
    echo -e "${BOLD}${PURPLE}⚡ TESTE DE CARGA BÁSICO${NC}"
    echo "============================================================"
    
    local concurrent_requests=5
    local total_requests=20
    
    echo -e "${YELLOW}🔍 Executando $total_requests requisições concorrentes (batches de $concurrent_requests)${NC}"
    
    local start_load_time=$(date +%s)
    local batch_count=$((total_requests / concurrent_requests))
    
    for ((batch=1; batch<=batch_count; batch++)); do
        echo -e "${CYAN}📊 Batch $batch/$batch_count${NC}"
        
        # Executar requisições concorrentes
        for ((i=1; i<=concurrent_requests; i++)); do
            (
                local response=$(curl -s -w "%{time_total}" --max-time $HTTP_TIMEOUT "$BACKEND_URL/api/health" 2>/dev/null)
                local time_total=$(echo "$response" | tail -c 10)
                local time_ms=$(echo "$time_total * 1000" | bc -l 2>/dev/null || echo "0")
                echo "Request $i: ${time_ms%.*}ms"
            ) &
        done
        
        # Aguardar todas as requisições do batch
        wait
        
        # Pausa entre batches
        sleep 1
    done
    
    local end_load_time=$(date +%s)
    local load_duration=$((end_load_time - start_load_time))
    
    echo -e "${GREEN}✅ Teste de carga concluído em ${load_duration}s${NC}"
    echo ""
}

# Função para gerar relatório detalhado
generate_report() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    echo -e "${BOLD}${WHITE}📊 RELATÓRIO DETALHADO DE TESTES${NC}"
    echo "============================================================"
    
    # Resumo geral
    echo -e "${BOLD}📈 RESUMO GERAL:${NC}"
    echo -e "${GREEN}✅ Testes Aprovados: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Testes Falharam: $FAILED_TESTS${NC}"
    echo -e "${YELLOW}⏭️  Testes Pulados: $SKIPPED_TESTS${NC}"
    echo -e "${CYAN}📊 Total de Testes: $TOTAL_TESTS${NC}"
    
    # Taxa de sucesso
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo -e "${BOLD}🎯 Taxa de Sucesso: ${success_rate}%${NC}"
    
    if [ $success_rate -ge 90 ]; then
        echo -e "${BOLD}${GREEN}🎉 EXCELENTE: Sistema está funcionando muito bem!${NC}"
    elif [ $success_rate -ge 70 ]; then
        echo -e "${BOLD}${YELLOW}⚠️  BOM: Alguns ajustes podem ser necessários${NC}"
    else
        echo -e "${BOLD}${RED}🚨 ATENÇÃO: Sistema com problemas significativos${NC}"
    fi
    
    echo ""
    
    # Detalhes dos testes
    echo -e "${BOLD}📋 DETALHES DOS TESTES:${NC}"
    echo "------------------------------------------------------------"
    
    for test in "${!TEST_RESULTS[@]}"; do
        local result=${TEST_RESULTS[$test]}
        local timing=${TEST_TIMING[$test]:-"N/A"}
        
        case $result in
            "PASS")
                echo -e "${GREEN}✅ $test - $timing${NC}"
                ;;
            "FAIL")
                local error=${TEST_ERRORS[$test]:-"Erro desconhecido"}
                echo -e "${RED}❌ $test - $error${NC}"
                ;;
            "ERROR")
                local error=${TEST_ERRORS[$test]:-"Erro de conexão"}
                echo -e "${RED}🔌 $test - $error${NC}"
                ;;
            *)
                echo -e "${YELLOW}❓ $test - Status desconhecido${NC}"
                ;;
        esac
    done
    
    echo ""
    
    # Análise de performance
    echo -e "${BOLD}⚡ ANÁLISE DE PERFORMANCE:${NC}"
    echo "------------------------------------------------------------"
    
    local fastest_time=999999
    local slowest_time=0
    local total_time=0
    local test_count=0
    local fastest_test=""
    local slowest_test=""
    
    for test in "${!TEST_TIMING[@]}"; do
        local timing=${TEST_TIMING[$test]}
        local time_num=$(echo "$timing" | sed 's/ms//')
        
        if [ "$time_num" -lt "$fastest_time" ]; then
            fastest_time=$time_num
            fastest_test=$test
        fi
        
        if [ "$time_num" -gt "$slowest_time" ]; then
            slowest_time=$time_num
            slowest_test=$test
        fi
        
        total_time=$((total_time + time_num))
        ((test_count++))
    done
    
    if [ $test_count -gt 0 ]; then
        local avg_time=$((total_time / test_count))
        echo -e "${GREEN}🚀 Mais Rápido: $fastest_test (${fastest_time}ms)${NC}"
        echo -e "${YELLOW}🐌 Mais Lento: $slowest_test (${slowest_time}ms)${NC}"
        echo -e "${CYAN}📊 Tempo Médio: ${avg_time}ms${NC}"
        
        # Alertas de performance
        if [ $slowest_time -gt 5000 ]; then
            echo -e "${RED}⚠️  ALERTA: Alguns testes muito lentos (>5s)${NC}"
        elif [ $slowest_time -gt 2000 ]; then
            echo -e "${YELLOW}⚠️  ATENÇÃO: Alguns testes lentos (>2s)${NC}"
        fi
    fi
    
    echo ""
    
    # Recomendações
    echo -e "${BOLD}💡 RECOMENDAÇÕES:${NC}"
    echo "------------------------------------------------------------"
    
    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "${RED}🔧 Corrija os testes que falharam antes de fazer deploy${NC}"
        echo -e "${YELLOW}📝 Verifique os logs para mais detalhes sobre as falhas${NC}"
    fi
    
    if [ $slowest_time -gt 3000 ]; then
        echo -e "${YELLOW}⚡ Considere otimizar endpoints com tempo de resposta >3s${NC}"
    fi
    
    if [ $success_rate -lt 100 ]; then
        echo -e "${YELLOW}🏥 Execute o health-check.sh para diagnóstico detalhado${NC}"
    fi
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎯 Sistema está pronto para uso em produção!${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}⏱️  Tempo total de execução: ${total_duration}s${NC}"
    echo -e "${CYAN}📝 Log completo salvo em: $TEST_LOG${NC}"
    echo "============================================================"
    
    # Salvar relatório em arquivo
    if [ "$GENERATE_REPORT" = true ]; then
        local report_file="$LOG_DIR/test-report-$(date +%Y%m%d_%H%M%S).txt"
        echo "Relatório de Testes SPR - $(date)" > "$report_file"
        echo "========================================" >> "$report_file"
        echo "Total de Testes: $TOTAL_TESTS" >> "$report_file"
        echo "Aprovados: $PASSED_TESTS" >> "$report_file"
        echo "Falharam: $FAILED_TESTS" >> "$report_file"
        echo "Taxa de Sucesso: ${success_rate}%" >> "$report_file"
        echo "Tempo de Execução: ${total_duration}s" >> "$report_file"
        echo "" >> "$report_file"
        
        for test in "${!TEST_RESULTS[@]}"; do
            echo "$test: ${TEST_RESULTS[$test]} - ${TEST_TIMING[$test]:-N/A}" >> "$report_file"
        done
        
        echo -e "${CYAN}📄 Relatório salvo em: $report_file${NC}"
    fi
}

# Função para modo verbose
enable_verbose() {
    VERBOSE_MODE=true
    SAVE_RESPONSES=true
    echo -e "${BOLD}${CYAN}🐛 MODO VERBOSE ATIVADO${NC}"
    echo "============================================================"
    echo -e "${CYAN}📝 Informações detalhadas serão exibidas${NC}"
    echo -e "${CYAN}💾 Respostas serão salvas para análise${NC}"
    echo -e "${CYAN}⏱️  Timing detalhado será mostrado${NC}"
    echo ""
}

# Função para teste rápido
quick_test() {
    echo -e "${BOLD}${YELLOW}⚡ TESTE RÁPIDO DOS ENDPOINTS PRINCIPAIS${NC}"
    echo "============================================================"
    
    execute_test "Backend Health" "GET" "$BACKEND_URL/api/health" "200"
    execute_test "WhatsApp Status" "GET" "$WHATSAPP_URL/api/status" "200"
    execute_test "Frontend Load" "GET" "$FRONTEND_URL/" "200"
    
    echo -e "${CYAN}⏱️  Teste rápido concluído${NC}"
    generate_report
}

# Função para exibir ajuda
show_help() {
    show_banner
    echo -e "${CYAN}📚 Uso do script:${NC}"
    echo ""
    echo "  $0                    # Teste completo de todos os endpoints"
    echo "  $0 --verbose          # Modo verbose com detalhes completos"
    echo "  $0 --quick            # Teste rápido dos endpoints principais"
    echo "  $0 --backend-only     # Testar apenas APIs do backend"
    echo "  $0 --whatsapp-only    # Testar apenas APIs do WhatsApp"
    echo "  $0 --frontend-only    # Testar apenas o frontend"
    echo "  $0 --load-test        # Incluir teste de carga básico"
    echo "  $0 --no-report        # Não gerar relatório detalhado"
    echo "  $0 --save-responses   # Salvar respostas para análise"
    echo "  $0 --help             # Mostrar esta ajuda"
    echo ""
    echo -e "${YELLOW}💡 Exemplos:${NC}"
    echo "  $0                    # Teste completo"
    echo "  $0 --verbose          # Com logs detalhados"
    echo "  $0 --quick --verbose  # Teste rápido com detalhes"
    echo "  $0 --backend-only -v  # Apenas backend com verbose"
    echo ""
}

# Função principal de execução dos testes
run_all_tests() {
    # Criar diretório de logs se não existir
    mkdir -p "$LOG_DIR"
    
    # Inicializar log
    log_message "INFO" "Starting endpoint tests"
    
    echo -e "${BOLD}${YELLOW}🧪 INICIANDO TESTES COMPLETOS DE ENDPOINTS${NC}"
    echo "============================================================"
    
    # Executar todos os conjuntos de testes
    test_backend_apis
    test_whatsapp_apis
    test_frontend
    test_integration
    
    # Teste de carga se solicitado
    if [[ "$*" == *"--load-test"* ]]; then
        basic_load_test
    fi
    
    # Gerar relatório final
    if [ "$GENERATE_REPORT" = true ]; then
        generate_report
    fi
    
    log_message "INFO" "Endpoint tests completed - Total: $TOTAL_TESTS, Passed: $PASSED_TESTS, Failed: $FAILED_TESTS"
}

# Função principal
main() {
    # Processar argumentos
    for arg in "$@"; do
        case $arg in
            --verbose|-v)
                enable_verbose
                ;;
            --quick|-q)
                show_banner
                quick_test
                exit 0
                ;;
            --backend-only)
                show_banner
                test_backend_apis
                generate_report
                exit 0
                ;;
            --whatsapp-only)
                show_banner
                test_whatsapp_apis
                generate_report
                exit 0
                ;;
            --frontend-only)
                show_banner
                test_frontend
                generate_report
                exit 0
                ;;
            --no-report)
                GENERATE_REPORT=false
                ;;
            --save-responses)
                SAVE_RESPONSES=true
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            --load-test)
                # Processado em run_all_tests
                ;;
            *)
                echo -e "${RED}❌ Opção inválida: $arg${NC}"
                echo -e "${YELLOW}💡 Use $0 --help para ver as opções disponíveis${NC}"
                exit 1
                ;;
        esac
    done
    
    # Se nenhum argumento específico foi passado, executar todos os testes
    if [ $# -eq 0 ] || [[ "$*" == *"--verbose"* ]] || [[ "$*" == *"--load-test"* ]] || [[ "$*" == *"--no-report"* ]] || [[ "$*" == *"--save-responses"* ]]; then
        show_banner
        run_all_tests "$@"
    fi
}

# Trap para limpeza
trap 'echo -e "\n${YELLOW}🛑 Testes interrompidos pelo usuário${NC}"; exit 130' SIGINT SIGTERM

# Executar função principal
main "$@"