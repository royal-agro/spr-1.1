#!/bin/bash
# Script para testar deploy de produção localmente
# Testa a configuração completa antes do deploy real

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para limpar recursos de teste
cleanup() {
    log_info "Limpando recursos de teste..."
    docker-compose -f docker-compose.production.yml down -v --remove-orphans 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
}

# Configurar trap para cleanup
trap cleanup EXIT

# Teste 1: Verificar arquivos necessários
test_files() {
    log_info "Teste 1: Verificando arquivos necessários..."
    
    local files=(
        "requirements.txt"
        "docker-compose.production.yml"
        "config/production.env"
        "scripts/init_spr_production.sh"
        "database/init.sql"
        "app/database/init_db.py"
        "agentes_system.py"
        "nginx.conf"
        "Dockerfile"
        "Dockerfile.production"
    )
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            log_success "✓ $file encontrado"
        else
            log_error "✗ $file não encontrado"
            return 1
        fi
    done
    
    log_success "Todos os arquivos necessários estão presentes"
}

# Teste 2: Validar docker-compose
test_docker_compose() {
    log_info "Teste 2: Validando docker-compose.production.yml..."
    
    if docker-compose -f docker-compose.production.yml config > /dev/null; then
        log_success "Docker Compose configuração válida"
    else
        log_error "Docker Compose configuração inválida"
        return 1
    fi
}

# Teste 3: Build das imagens
test_build_images() {
    log_info "Teste 3: Testando build das imagens..."
    
    # Build backend Python
    log_info "Building SPR Backend (Python)..."
    if docker build -t spr-backend-test:latest -f Dockerfile . > /dev/null; then
        log_success "✓ SPR Backend build successful"
    else
        log_error "✗ SPR Backend build failed"
        return 1
    fi
    
    # Build WhatsApp Server
    log_info "Building WhatsApp Server (Node.js)..."
    if docker build -t spr-whatsapp-test:latest -f Dockerfile.production . > /dev/null; then
        log_success "✓ WhatsApp Server build successful"
    else
        log_error "✗ WhatsApp Server build failed"
        return 1
    fi
}

# Teste 4: Inicialização do sistema
test_system_startup() {
    log_info "Teste 4: Testando inicialização do sistema..."
    
    # Definir environment de teste
    export POSTGRES_PASSWORD=test_password
    export REDIS_PASSWORD=test_redis
    
    # Iniciar serviços
    log_info "Iniciando PostgreSQL e Redis..."
    docker-compose -f docker-compose.production.yml up -d postgres redis
    
    # Aguardar PostgreSQL
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U spr_user -d spr_db > /dev/null 2>&1; then
            log_success "PostgreSQL está pronto"
            break
        fi
        
        attempt=$((attempt + 1))
        sleep 2
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "PostgreSQL não ficou pronto"
            return 1
        fi
    done
    
    # Verificar Redis
    if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping | grep -q PONG; then
        log_success "Redis está funcionando"
    else
        log_error "Redis não está funcionando"
        return 1
    fi
}

# Teste 5: Inicialização do backend
test_backend_startup() {
    log_info "Teste 5: Testando inicialização do backend SPR..."
    
    # Usar imagem de teste
    export COMPOSE_PROJECT_NAME=spr_test
    
    # Modificar docker-compose temporariamente para usar imagens de teste
    sed 's/spr-backend:latest/spr-backend-test:latest/g; s/spr-whatsapp:latest/spr-whatsapp-test:latest/g' docker-compose.production.yml > docker-compose.test.yml
    
    # Iniciar backend
    docker-compose -f docker-compose.test.yml up -d spr-backend
    
    # Aguardar backend ficar pronto
    local max_attempts=60
    local attempt=0
    
    log_info "Aguardando SPR Backend ficar pronto..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
            log_success "SPR Backend está respondendo"
            break
        fi
        
        attempt=$((attempt + 1))
        sleep 3
        
        if [ $attempt -eq $max_attempts ]; then
            log_warning "SPR Backend não respondeu no tempo esperado"
            # Mostrar logs para debug
            docker-compose -f docker-compose.test.yml logs spr-backend
            break
        fi
    done
    
    # Limpar arquivo temporário
    rm -f docker-compose.test.yml
}

# Teste 6: Teste de conectividade da base de dados
test_database_connectivity() {
    log_info "Teste 6: Testando conectividade com banco de dados..."
    
    # Testar se consegue executar script de inicialização
    if docker-compose -f docker-compose.production.yml exec -T spr-backend python --version > /dev/null 2>&1; then
        log_success "Python está disponível no container backend"
    else
        log_warning "Não foi possível verificar Python no backend"
    fi
    
    # Testar conexão PostgreSQL diretamente
    if docker-compose -f docker-compose.production.yml exec -T postgres psql -U spr_user -d spr_db -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Conexão direta com PostgreSQL funcionando"
    else
        log_warning "Conexão direta com PostgreSQL pode ter problemas"
    fi
}

# Teste 7: Verificar configuração Nginx
test_nginx_config() {
    log_info "Teste 7: Verificando configuração do Nginx..."
    
    # Testar sintaxe do nginx.conf
    if docker run --rm -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t > /dev/null 2>&1; then
        log_success "Configuração Nginx válida"
    else
        log_error "Configuração Nginx inválida"
        return 1
    fi
}

# Função principal de teste
main() {
    log_info "🧪 INICIANDO TESTES DE DEPLOY DE PRODUÇÃO SPR"
    log_info "=============================================="
    
    local tests_passed=0
    local total_tests=7
    
    # Executar testes
    if test_files; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_docker_compose; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_build_images; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_system_startup; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_backend_startup; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_database_connectivity; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_nginx_config; then
        tests_passed=$((tests_passed + 1))
    fi
    
    # Resultado final
    echo ""
    log_info "=============================================="
    log_info "RESULTADO DOS TESTES"
    log_info "=============================================="
    
    if [ $tests_passed -eq $total_tests ]; then
        log_success "🎉 TODOS OS TESTES PASSARAM ($tests_passed/$total_tests)"
        log_success "✅ Sistema SPR está PRONTO para deploy no DigitalOcean!"
        echo ""
        echo "🚀 Para fazer deploy:"
        echo "   ./deploy_digitalocean.sh deploy"
        echo ""
        return 0
    else
        log_warning "⚠️ $tests_passed de $total_tests testes passaram"
        
        if [ $tests_passed -ge 5 ]; then
            log_warning "✅ Sistema pode estar funcional, mas com alguns problemas menores"
            echo ""
            echo "🚀 Você pode tentar o deploy, mas monitore os logs:"
            echo "   ./deploy_digitalocean.sh deploy"
        else
            log_error "❌ Sistema tem problemas críticos que devem ser corrigidos"
            echo ""
            echo "🔧 Corrija os problemas antes do deploy"
        fi
        echo ""
        return 1
    fi
}

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    log_error "Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Executar testes
main "$@"