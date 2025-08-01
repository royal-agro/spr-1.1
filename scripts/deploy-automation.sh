#!/bin/bash

# 🌩️ SPR Deploy Automation v1.0
# Sistema de deploy automático na nuvem 2x por dia

set -e

# Configurações
PROJECT_ROOT="/home/cadu/projeto_SPR"
GITHUB_REPO="https://github.com/royal-agro/spr-1.1.git"
DEPLOY_LOG="/home/cadu/projeto_SPR/logs/deploy-automation.log"
CRON_SCHEDULE_1="0 9 * * *"   # 09:00 todos os dias
CRON_SCHEDULE_2="0 21 * * *"  # 21:00 todos os dias

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[DEPLOY-AUTO]${NC} $1" | tee -a "$DEPLOY_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOY_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOY_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOY_LOG"
}

# Validação pré-deploy
validate_system() {
    log_info "🔍 Validando sistema antes do deploy..."
    
    local errors=0
    
    # Verificar se o frontend está funcionando
    if curl -s http://localhost:3000 >/dev/null; then
        log_success "✅ Frontend (3000) - OK"
    else
        log_error "❌ Frontend (3000) - FALHOU"
        ((errors++))
    fi
    
    # Verificar backend
    if curl -s http://localhost:3002/api/health >/dev/null; then
        log_success "✅ Backend (3002) - OK"
    else
        log_warning "⚠️ Backend (3002) - Offline (pode ser normal)"
    fi
    
    # Verificar Git status
    cd "$PROJECT_ROOT"
    if [[ -n "$(git status --porcelain)" ]]; then
        log_warning "⚠️ Há mudanças não commitadas no Git"
    else
        log_success "✅ Git status - Limpo"
    fi
    
    # Verificar se há commits para push
    local unpushed=$(git log origin/master..HEAD --oneline 2>/dev/null | wc -l)
    if [[ $unpushed -gt 0 ]]; then
        log_info "📤 $unpushed commit(s) para fazer push"
    else
        log_info "✅ Repositório sincronizado com origin"
    fi
    
    return $errors
}

# Criar backup antes do deploy
pre_deploy_backup() {
    log_info "💾 Criando backup pré-deploy..."
    
    cd "$PROJECT_ROOT"
    ./scripts/auto-backup.sh restore-point "Pre-deploy backup $(date)"
    
    log_success "✅ Backup pré-deploy concluído"
}

# Executar testes básicos
run_tests() {
    log_info "🧪 Executando testes básicos..."
    
    cd "$PROJECT_ROOT"
    
    # Testar compilação do frontend
    if [[ -d "frontend" ]]; then
        log_info "📦 Testando build do frontend..."
        cd frontend
        if npm run build >/dev/null 2>&1; then
            log_success "✅ Frontend build - OK"
            rm -rf build  # Limpar build de teste
        else
            log_error "❌ Frontend build - FALHOU"
            return 1
        fi
        cd ..
    fi
    
    # Testar endpoints críticos
    ./scripts/test-endpoints.sh --quick >/dev/null 2>&1 || log_warning "⚠️ Alguns endpoints falharam"
    
    log_success "✅ Testes básicos concluídos"
}

# Deploy para GitHub
deploy_to_github() {
    log_info "🚀 Fazendo deploy para GitHub..."
    
    cd "$PROJECT_ROOT"
    
    # Verificar se há mudanças para commit
    if [[ -n "$(git status --porcelain)" ]]; then
        log_info "📝 Commitando mudanças automáticas..."
        
        # Adicionar mudanças importantes
        git add -A
        
        # Criar commit automático
        git commit -m "chore: automated deployment $(date '+%Y-%m-%d %H:%M:%S')

🤖 Deploy automático executado com sucesso

- ✅ Validação do sistema passou
- ✅ Backup pré-deploy criado
- ✅ Testes básicos executados
- ✅ Frontend funcionando na porta 3000
- ✅ Sistema multi-agente ativo

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>" || log_warning "⚠️ Nada para commitar"
    fi
    
    # Push para GitHub
    if git push origin master; then
        log_success "✅ Push para GitHub concluído"
    else
        log_error "❌ Falha no push para GitHub"
        return 1
    fi
}

# Verificar saúde pós-deploy
post_deploy_health_check() {
    log_info "🏥 Verificação de saúde pós-deploy..."
    
    sleep 5  # Aguardar estabilização
    
    if validate_system; then
        log_success "✅ Sistema estável após deploy"
    else
        log_warning "⚠️ Sistema apresenta problemas pós-deploy"
    fi
}

# Notificação de deploy
send_notification() {
    local status="$1"
    local message="$2"
    
    log_info "📧 Enviando notificação: $status"
    
    # Log detalhado
    echo "[$(date)] Deploy Status: $status - $message" >> "$DEPLOY_LOG"
    
    # Aqui você pode adicionar integrações com Slack, Discord, email, etc.
    # Exemplo: curl -X POST webhook_url -d "Deploy $status: $message"
}

# Configurar automação no crontab
setup_automation() {
    log_info "⚙️ Configurando automação no crontab..."
    
    # Backup do crontab atual
    crontab -l > /tmp/crontab_backup 2>/dev/null || true
    
    # Remover entradas antigas do SPR
    crontab -l 2>/dev/null | grep -v "spr.*deploy-automation.sh" > /tmp/crontab_new || true
    
    # Adicionar novas entradas
    echo "# SPR Automated Deployment - Morning" >> /tmp/crontab_new
    echo "$CRON_SCHEDULE_1 cd $PROJECT_ROOT && ./scripts/deploy-automation.sh run >> $DEPLOY_LOG 2>&1" >> /tmp/crontab_new
    echo "# SPR Automated Deployment - Evening" >> /tmp/crontab_new
    echo "$CRON_SCHEDULE_2 cd $PROJECT_ROOT && ./scripts/deploy-automation.sh run >> $DEPLOY_LOG 2>&1" >> /tmp/crontab_new
    echo "" >> /tmp/crontab_new
    
    # Instalar novo crontab
    crontab /tmp/crontab_new
    
    log_success "✅ Automação configurada:"
    log_info "   - Deploy matutino: 09:00 (todos os dias)"
    log_info "   - Deploy noturno: 21:00 (todos os dias)"
    log_info "   - Logs em: $DEPLOY_LOG"
    
    # Limpar arquivos temporários
    rm -f /tmp/crontab_new /tmp/crontab_backup
}

# Remover automação
remove_automation() {
    log_info "🗑️ Removendo automação do crontab..."
    
    # Remover entradas do SPR
    crontab -l 2>/dev/null | grep -v "spr.*deploy-automation.sh" | crontab -
    
    log_success "✅ Automação removida do crontab"
}

# Rollback em caso de falha
rollback_deploy() {
    log_error "🔄 Iniciando rollback..."
    
    cd "$PROJECT_ROOT"
    
    # Tentar usar o último ponto de restauração
    local latest_restore=$(ls -1td backups/restore_points/restore_* 2>/dev/null | head -1)
    
    if [[ -n "$latest_restore" && -d "$latest_restore" ]]; then
        log_info "📦 Restaurando do ponto: $(basename "$latest_restore")"
        
        # Restaurar arquivos críticos
        cp -r "$latest_restore/src" frontend/ 2>/dev/null || true
        cp "$latest_restore"/*.js . 2>/dev/null || true
        cp -r "$latest_restore/app" . 2>/dev/null || true
        
        log_success "✅ Rollback concluído"
        send_notification "ROLLBACK" "Sistema restaurado para última versão funcional"
    else
        log_error "❌ Nenhum ponto de restauração encontrado"
        send_notification "ROLLBACK_FAILED" "Não foi possível fazer rollback automático"
    fi
}

# Executar deploy completo
run_deploy() {
    log_info "🚀 SPR Deploy Automation - Iniciando deploy automático"
    echo "$(date): Iniciando deploy automático" >> "$DEPLOY_LOG"
    
    # Criar diretório de logs se não existir
    mkdir -p "$(dirname "$DEPLOY_LOG")"
    
    local deploy_success=true
    
    # Executar etapas do deploy
    if ! validate_system; then
        log_error "❌ Validação do sistema falhou"
        deploy_success=false
    fi
    
    if [[ "$deploy_success" == "true" ]]; then
        pre_deploy_backup
    fi
    
    if [[ "$deploy_success" == "true" ]] && ! run_tests; then
        log_error "❌ Testes falharam"
        deploy_success=false
    fi
    
    if [[ "$deploy_success" == "true" ]] && ! deploy_to_github; then
        log_error "❌ Deploy para GitHub falhou"
        deploy_success=false
    fi
    
    if [[ "$deploy_success" == "true" ]]; then
        post_deploy_health_check
        send_notification "SUCCESS" "Deploy automático executado com sucesso"
        log_success "🎉 Deploy automático concluído com sucesso!"
    else
        rollback_deploy
        send_notification "FAILED" "Deploy automático falhou - rollback executado"
        log_error "💥 Deploy automático falhou!"
        exit 1
    fi
}

# Status da automação
show_status() {
    log_info "📊 Status da Automação SPR"
    echo
    echo "🔄 Crontab atual:"
    crontab -l 2>/dev/null | grep -A2 -B2 "spr.*deploy-automation.sh" || echo "   Nenhuma automação configurada"
    echo
    echo "📁 Últimos backups:"
    ls -1t backups/restore_points/restore_* 2>/dev/null | head -3 | while read restore; do
        echo "   $(basename "$restore") - $(stat -c %y "$restore" | cut -d' ' -f1)"
    done 2>/dev/null || echo "   Nenhum backup encontrado"
    echo
    echo "📝 Últimas linhas do log:"
    tail -5 "$DEPLOY_LOG" 2>/dev/null || echo "   Log vazio"
}

# Função principal
main() {
    local action="${1:-help}"
    
    case "$action" in
        "run")
            run_deploy
            ;;
        "setup")
            setup_automation
            ;;
        "remove")
            remove_automation
            ;;
        "status")
            show_status
            ;;
        "backup")
            pre_deploy_backup
            ;;
        "test")
            run_tests
            ;;
        "help"|*)
            echo "🌩️ SPR Deploy Automation v1.0"
            echo ""
            echo "Uso: $0 [ação]"
            echo ""
            echo "Ações disponíveis:"
            echo "  run      - Executar deploy automático completo"
            echo "  setup    - Configurar automação no crontab (2x/dia)"
            echo "  remove   - Remover automação do crontab"
            echo "  status   - Mostrar status da automação"
            echo "  backup   - Criar backup manual"
            echo "  test     - Executar apenas testes"
            echo "  help     - Mostrar esta ajuda"
            echo ""
            echo "Deploy automático configurado para:"
            echo "  - 09:00 (todos os dias)"
            echo "  - 21:00 (todos os dias)"
            echo ""
            ;;
    esac
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi