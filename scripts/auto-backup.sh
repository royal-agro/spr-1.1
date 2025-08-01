#!/bin/bash

# 🔄 SPR Auto-Backup System v1.0
# Cria pontos de restauração automáticos para prevenir retrabalho

set -e

# Configurações
BACKUP_DIR="/home/cadu/projeto_SPR/backups"
PROJECT_ROOT="/home/cadu/projeto_SPR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MAX_BACKUPS=10

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[BACKUP]${NC} $1"
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

# Criar diretório de backup
create_backup_structure() {
    log_info "Criando estrutura de backup..."
    mkdir -p "$BACKUP_DIR"/{frontend,backend,database,config,full}
    mkdir -p "$BACKUP_DIR"/restore_points
    log_success "Estrutura criada"
}

# Backup do frontend
backup_frontend() {
    log_info "Backup do Frontend..."
    
    local frontend_backup="$BACKUP_DIR/frontend/frontend_backup_$TIMESTAMP.tar.gz"
    
    cd "$PROJECT_ROOT"
    tar -czf "$frontend_backup" \
        frontend/src \
        frontend/public \
        frontend/package.json \
        frontend/package-lock.json \
        frontend/tsconfig.json \
        --exclude="frontend/node_modules" \
        --exclude="frontend/build" \
        --exclude="frontend/.env"
    
    log_success "Frontend backup: $(basename "$frontend_backup")"
    echo "$frontend_backup" >> "$BACKUP_DIR/frontend/latest.txt"
}

# Backup do backend
backup_backend() {
    log_info "Backup do Backend..."
    
    local backend_backup="$BACKUP_DIR/backend/backend_backup_$TIMESTAMP.tar.gz"
    
    cd "$PROJECT_ROOT"
    tar -czf "$backend_backup" \
        app \
        backend_server_fixed.js \
        whatsapp_server_real.js \
        whatsapp_baileys_server.js \
        package.json \
        requirements.txt \
        --exclude="app/__pycache__" \
        --exclude="*.pyc"
    
    log_success "Backend backup: $(basename "$backend_backup")"
    echo "$backend_backup" >> "$BACKUP_DIR/backend/latest.txt"
}

# Backup das configurações
backup_config() {
    log_info "Backup das Configurações..."
    
    local config_backup="$BACKUP_DIR/config/config_backup_$TIMESTAMP.tar.gz"
    
    cd "$PROJECT_ROOT"
    tar -czf "$config_backup" \
        config \
        scripts \
        docker-compose*.yml \
        nginx.conf \
        .gitignore \
        2>/dev/null || true
    
    log_success "Config backup: $(basename "$config_backup")"
    echo "$config_backup" >> "$BACKUP_DIR/config/latest.txt"
}

# Backup completo do sistema
backup_full_system() {
    log_info "Backup Completo do Sistema..."
    
    local full_backup="$BACKUP_DIR/full/spr_full_backup_$TIMESTAMP.tar.gz"
    
    cd "$PROJECT_ROOT"
    tar -czf "$full_backup" \
        . \
        --exclude="node_modules" \
        --exclude="frontend/node_modules" \
        --exclude="frontend/build" \
        --exclude="__pycache__" \
        --exclude="*.pyc" \
        --exclude=".git" \
        --exclude="logs" \
        --exclude="sessions" \
        --exclude="qrcodes" \
        --exclude="backups" \
        --exclude="spr_env"
    
    log_success "Full backup: $(basename "$full_backup")"
    echo "$full_backup" >> "$BACKUP_DIR/full/latest.txt"
}

# Criar ponto de restauração
create_restore_point() {
    local description="$1"
    [[ -z "$description" ]] && description="Auto restore point"
    
    log_info "Criando ponto de restauração: $description"
    
    local restore_point="$BACKUP_DIR/restore_points/restore_$TIMESTAMP"
    mkdir -p "$restore_point"
    
    # Informações do ponto de restauração
    cat > "$restore_point/INFO.md" << EOF
# 🔄 SPR Restore Point - $TIMESTAMP

**Descrição:** $description
**Data:** $(date)
**Git Commit:** $(git rev-parse HEAD 2>/dev/null || echo "N/A")
**Git Branch:** $(git branch --show-current 2>/dev/null || echo "N/A")

## Status dos Serviços
- Frontend: $(curl -s http://localhost:3000 >/dev/null && echo "✅ ONLINE" || echo "❌ OFFLINE")
- Backend: $(curl -s http://localhost:3002/api/health >/dev/null && echo "✅ ONLINE" || echo "❌ OFFLINE")
- WhatsApp: $(curl -s http://localhost:3003 >/dev/null && echo "✅ ONLINE" || echo "❌ OFFLINE")

## Arquivos Críticos
EOF
    
    # Listar arquivos críticos com checksums
    echo "### Frontend" >> "$restore_point/INFO.md"
    find frontend/src -name "*.tsx" -o -name "*.ts" 2>/dev/null | head -10 | while read file; do
        echo "- $file ($(md5sum "$file" 2>/dev/null | cut -d' ' -f1))" >> "$restore_point/INFO.md"
    done
    
    echo "### Backend" >> "$restore_point/INFO.md"
    echo "- backend_server_fixed.js ($(md5sum backend_server_fixed.js 2>/dev/null | cut -d' ' -f1))" >> "$restore_point/INFO.md"
    echo "- whatsapp_server_real.js ($(md5sum whatsapp_server_real.js 2>/dev/null | cut -d' ' -f1))" >> "$restore_point/INFO.md"
    
    # Backup rápido dos arquivos mais críticos
    cp -r frontend/src "$restore_point/" 2>/dev/null || true
    cp backend_server_fixed.js whatsapp_server_real.js "$restore_point/" 2>/dev/null || true
    cp -r app "$restore_point/" 2>/dev/null || true
    
    log_success "Ponto de restauração criado: $restore_point"
    echo "$restore_point" >> "$BACKUP_DIR/restore_points/latest.txt"
}

# Limpar backups antigos
cleanup_old_backups() {
    log_info "Limpando backups antigos (mantendo $MAX_BACKUPS)..."
    
    for dir in frontend backend config full; do
        local backup_dir="$BACKUP_DIR/$dir"
        if [[ -d "$backup_dir" ]]; then
            local count=$(ls -1 "$backup_dir"/*.tar.gz 2>/dev/null | wc -l)
            if [[ $count -gt $MAX_BACKUPS ]]; then
                ls -1t "$backup_dir"/*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
                log_success "Removidos $((count - MAX_BACKUPS)) backups antigos de $dir"
            fi
        fi
    done
    
    # Limpar pontos de restauração antigos
    local restore_count=$(ls -1d "$BACKUP_DIR"/restore_points/restore_* 2>/dev/null | wc -l)
    if [[ $restore_count -gt $MAX_BACKUPS ]]; then
        ls -1td "$BACKUP_DIR"/restore_points/restore_* | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf
        log_success "Removidos $((restore_count - MAX_BACKUPS)) pontos de restauração antigos"
    fi
}

# Função principal
main() {
    local backup_type="${1:-full}"
    local description="$2"
    
    log_info "🔄 SPR Auto-Backup System - Iniciando backup: $backup_type"
    
    create_backup_structure
    
    case "$backup_type" in
        "frontend")
            backup_frontend
            ;;
        "backend")
            backup_backend
            ;;
        "config")
            backup_config
            ;;
        "restore-point")
            create_restore_point "$description"
            ;;
        "full"|*)
            backup_frontend
            backup_backend
            backup_config
            backup_full_system
            create_restore_point "$description"
            ;;
    esac
    
    cleanup_old_backups
    
    log_success "🎉 Backup concluído com sucesso!"
    echo
    echo "📁 Backups disponíveis em: $BACKUP_DIR"
    echo "🔄 Para restaurar, use: ./scripts/restore.sh"
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi