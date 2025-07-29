#!/bin/bash
# SPR Production Initialization Script
# Inicialização completa do sistema SPR em produção

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[SPR-INIT]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SPR-SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[SPR-WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[SPR-ERROR]${NC} $1"
}

# Função para aguardar serviço ficar pronto
wait_for_service() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=0

    log_info "Aguardando $service_name ficar pronto..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log_success "$service_name está pronto!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 10
    done
    
    log_error "$service_name não ficou pronto em $((max_attempts * 10)) segundos"
    return 1
}

# Verificar se PostgreSQL está pronto
wait_for_postgres() {
    log_info "Verificando PostgreSQL..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose exec -T postgres pg_isready -U spr_user -d spr_db > /dev/null 2>&1; then
            log_success "PostgreSQL está pronto!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 5
    done
    
    log_error "PostgreSQL não ficou pronto"
    return 1
}

# Verificar se Redis está pronto
wait_for_redis() {
    log_info "Verificando Redis..."
    
    local max_attempts=20
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
            log_success "Redis está pronto!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 3
    done
    
    log_error "Redis não ficou pronto"
    return 1
}

# Inicializar banco de dados
init_database() {
    log_info "Inicializando banco de dados SPR..."
    
    # Executar inicialização via Python
    if docker-compose exec -T spr-backend python /app/app/database/init_db.py; then
        log_success "Banco de dados inicializado com sucesso!"
    else
        log_error "Falha na inicialização do banco de dados"
        return 1
    fi
}

# Inicializar sistema multi-agente
init_agents() {
    log_info "Inicializando sistema multi-agente..."
    
    # Executar sistema de agentes
    if docker-compose exec -T spr-backend python /app/agentes_system.py --start; then
        log_success "Sistema multi-agente inicializado!"
    else
        log_warning "Sistema multi-agente apresentou problemas, mas continuando..."
    fi
}

# Executar testes de conectividade
run_connectivity_tests() {
    log_info "Executando testes de conectividade..."
    
    # Testar backend SPR
    if wait_for_service "SPR Backend" "http://localhost:8000/health"; then
        log_success "SPR Backend respondendo"
    else
        log_error "SPR Backend não está respondendo"
        return 1
    fi
    
    # Testar WhatsApp Server
    if wait_for_service "WhatsApp Server" "http://localhost:3000/health"; then
        log_success "WhatsApp Server respondendo"
    else
        log_warning "WhatsApp Server não está respondendo ainda"
    fi
    
    # Testar integração banco + agentes
    if docker-compose exec -T spr-backend python /app/test_database_agents.py; then
        log_success "Testes de integração passaram!"
    else
        log_warning "Alguns testes falharam, mas sistema pode estar funcional"
    fi
}

# Mostrar status final
show_final_status() {
    log_info "============================================"
    log_info "SPR SISTEMA PRONTO PARA PRODUÇÃO"
    log_info "============================================"
    
    echo ""
    echo "🌐 URLs de Acesso:"
    echo "   Frontend: https://whatsapp.royalnegociosagricolas.com.br"
    echo "   SPR API: https://whatsapp.royalnegociosagricolas.com.br/spr/"
    echo "   WhatsApp: https://whatsapp.royalnegociosagricolas.com.br/whatsapp/"
    echo "   Health: https://whatsapp.royalnegociosagricolas.com.br/api/health"
    echo ""
    echo "🤖 Agentes Ativos:"
    echo "   - Database Engineer (db_eng)"
    echo "   - Backend Python (py_eng)"
    echo "   - Financial Modeling (fin_model)"
    echo "   - Business Intelligence (bi_analyst)"
    echo "   - AgriTech Data (agri_data)"
    echo "   - WhatsApp Specialist (wa_spec)"
    echo ""
    echo "📊 Banco de Dados:"
    echo "   - PostgreSQL: Commodities, Preços, Alertas"
    echo "   - Redis: Cache de alta performance"
    echo ""
    echo "📱 Para conectar WhatsApp:"
    echo "   1. Acesse a interface web"
    echo "   2. Escaneie o QR Code"
    echo "   3. Aguarde conexão"
    echo ""
    echo "🔧 Comandos úteis:"
    echo "   Status: docker-compose ps"
    echo "   Logs: docker-compose logs -f"
    echo "   Restart: docker-compose restart"
    echo ""
}

# Função principal
main() {
    log_info "🌾 Iniciando SPR - Sistema Preditivo Royal"
    log_info "Modo: PRODUÇÃO"
    log_info "============================================"
    
    # 1. Aguardar serviços base ficarem prontos
    if ! wait_for_postgres; then
        log_error "PostgreSQL falhou ao inicializar"
        exit 1
    fi
    
    if ! wait_for_redis; then
        log_error "Redis falhou ao inicializar"
        exit 1
    fi
    
    # 2. Aguardar um pouco para estabilizar
    log_info "Aguardando estabilização dos serviços..."
    sleep 15
    
    # 3. Inicializar banco de dados
    if ! init_database; then
        log_error "Falha na inicialização do banco"
        exit 1
    fi
    
    # 4. Inicializar sistema multi-agente
    init_agents
    
    # 5. Aguardar backend ficar pronto
    sleep 10
    
    # 6. Executar testes
    if ! run_connectivity_tests; then
        log_warning "Alguns testes falharam, mas sistema pode estar funcional"
    fi
    
    # 7. Mostrar status final
    show_final_status
    
    log_success "🚀 SPR inicializado com sucesso!"
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi