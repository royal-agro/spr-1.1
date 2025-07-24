#!/bin/bash

# Script de Deploy - SPR WhatsApp Production
# Autor: SPR Team
# Data: $(date)

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
DOMAIN="whatsapp.royalnegociosagricolas.com.br"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE="config/production.env"
BACKUP_DIR="/opt/spr-backups"
LOG_FILE="/var/log/spr-deploy.log"

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Verificar se está rodando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Este script deve ser executado como root (sudo)"
    fi
}

# Verificar dependências
check_dependencies() {
    log "Verificando dependências..."
    
    command -v docker >/dev/null 2>&1 || error "Docker não está instalado"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose não está instalado"
    command -v nginx >/dev/null 2>&1 || warning "Nginx não encontrado (será usado container)"
    command -v certbot >/dev/null 2>&1 || warning "Certbot não encontrado (será usado container)"
    
    success "Dependências verificadas"
}

# Fazer backup dos dados atuais
backup_data() {
    log "Fazendo backup dos dados atuais..."
    
    mkdir -p "$BACKUP_DIR/$(date '+%Y%m%d_%H%M%S')"
    BACKUP_PATH="$BACKUP_DIR/$(date '+%Y%m%d_%H%M%S')"
    
    # Backup dos volumes Docker
    if docker volume ls | grep -q "whatsapp_sessions"; then
        docker run --rm -v whatsapp_sessions:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/sessions.tar.gz -C /data .
    fi
    
    if docker volume ls | grep -q "whatsapp_media"; then
        docker run --rm -v whatsapp_media:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/media.tar.gz -C /data .
    fi
    
    if docker volume ls | grep -q "postgres_data"; then
        docker exec spr-postgres-prod pg_dump -U spr_user spr_whatsapp > "$BACKUP_PATH/database.sql" 2>/dev/null || true
    fi
    
    success "Backup realizado em $BACKUP_PATH"
}

# Configurar SSL/HTTPS
setup_ssl() {
    log "Configurando SSL para $DOMAIN..."
    
    # Criar diretório para challenge
    mkdir -p ./ssl-challenge
    
    # Verificar se o domínio está apontando para o servidor
    if ! nslookup "$DOMAIN" | grep -q "$(curl -s ifconfig.me)"; then
        warning "O domínio $DOMAIN pode não estar apontando para este servidor"
        read -p "Deseja continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deploy cancelado pelo usuário"
        fi
    fi
    
    # Gerar certificado SSL
    docker-compose -f "$COMPOSE_FILE" run --rm certbot || warning "Falha ao gerar certificado SSL"
    
    success "SSL configurado"
}

# Configurar firewall
setup_firewall() {
    log "Configurando firewall..."
    
    # UFW rules
    ufw --force enable
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw allow 9090/tcp  # Prometheus (opcional)
    
    success "Firewall configurado"
}

# Deploy da aplicação
deploy_application() {
    log "Fazendo deploy da aplicação..."
    
    # Parar serviços existentes
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans || true
    
    # Limpar imagens antigas
    docker system prune -f
    
    # Build e start dos serviços
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Aguardar serviços ficarem prontos
    log "Aguardando serviços ficarem prontos..."
    sleep 30
    
    # Verificar saúde dos serviços
    for service in whatsapp-app nginx redis postgres; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "$service.*Up"; then
            success "Serviço $service está rodando"
        else
            error "Serviço $service falhou ao iniciar"
        fi
    done
    
    success "Aplicação deployada com sucesso"
}

# Verificar deployment
verify_deployment() {
    log "Verificando deployment..."
    
    # Teste de conectividade
    if curl -f -s "https://$DOMAIN/health" > /dev/null; then
        success "Aplicação está respondendo em https://$DOMAIN"
    else
        error "Aplicação não está respondendo"
    fi
    
    # Verificar logs
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 whatsapp-app
    
    success "Deployment verificado"
}

# Configurar monitoramento
setup_monitoring() {
    log "Configurando monitoramento..."
    
    # Iniciar serviços de monitoramento
    docker-compose -f "$COMPOSE_FILE" --profile monitoring up -d
    
    # Configurar logrotate
    cat > /etc/logrotate.d/spr-whatsapp << EOF
/var/log/spr-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    success "Monitoramento configurado"
}

# Configurar cron jobs
setup_cron() {
    log "Configurando tarefas automáticas..."
    
    # Renovação SSL automática
    (crontab -l 2>/dev/null; echo "0 3 * * * docker-compose -f $PWD/$COMPOSE_FILE run --rm certbot renew --quiet") | crontab -
    
    # Backup automático
    (crontab -l 2>/dev/null; echo "0 2 * * * $PWD/deploy.sh backup") | crontab -
    
    # Limpeza de logs
    (crontab -l 2>/dev/null; echo "0 1 * * 0 docker system prune -f") | crontab -
    
    success "Tarefas automáticas configuradas"
}

# Mostrar informações finais
show_info() {
    log "Deployment concluído com sucesso!"
    echo
    echo -e "${GREEN}=== INFORMAÇÕES DO DEPLOYMENT ===${NC}"
    echo -e "${BLUE}URL da Aplicação:${NC} https://$DOMAIN"
    echo -e "${BLUE}Logs:${NC} docker-compose -f $COMPOSE_FILE logs -f"
    echo -e "${BLUE}Status:${NC} docker-compose -f $COMPOSE_FILE ps"
    echo -e "${BLUE}Monitoramento:${NC} http://$DOMAIN:9090 (Prometheus)"
    echo
    echo -e "${YELLOW}Comandos úteis:${NC}"
    echo "  Parar: docker-compose -f $COMPOSE_FILE down"
    echo "  Reiniciar: docker-compose -f $COMPOSE_FILE restart"
    echo "  Logs: docker-compose -f $COMPOSE_FILE logs -f [service]"
    echo "  Backup: $0 backup"
    echo
}

# Função principal
main() {
    case "${1:-deploy}" in
        "deploy")
            log "Iniciando deploy do SPR WhatsApp..."
            check_root
            check_dependencies
            backup_data
            setup_ssl
            setup_firewall
            deploy_application
            verify_deployment
            setup_monitoring
            setup_cron
            show_info
            ;;
        "backup")
            log "Executando backup..."
            backup_data
            ;;
        "logs")
            docker-compose -f "$COMPOSE_FILE" logs -f "${2:-whatsapp-app}"
            ;;
        "status")
            docker-compose -f "$COMPOSE_FILE" ps
            ;;
        "stop")
            docker-compose -f "$COMPOSE_FILE" down
            ;;
        "restart")
            docker-compose -f "$COMPOSE_FILE" restart "${2:-}"
            ;;
        *)
            echo "Uso: $0 {deploy|backup|logs|status|stop|restart}"
            echo
            echo "Comandos:"
            echo "  deploy  - Deploy completo da aplicação"
            echo "  backup  - Fazer backup dos dados"
            echo "  logs    - Mostrar logs (opcional: nome do serviço)"
            echo "  status  - Mostrar status dos serviços"
            echo "  stop    - Parar todos os serviços"
            echo "  restart - Reiniciar serviços (opcional: nome do serviço)"
            exit 1
            ;;
    esac
}

# Executar função principal
main "$@" 