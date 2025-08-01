#!/bin/bash

# 🤖 SPR Agent Monitoring System v1.0
# Sistema de monitoramento automático baseado em agentes especializados

set -e

# Configurações
PROJECT_ROOT="/home/cadu/projeto_SPR"
MONITORING_LOG="/home/cadu/projeto_SPR/logs/agent-monitoring.log"
DOCS_DIR="/home/cadu/projeto_SPR/docs/auto-generated"
AGENT_REPORTS_DIR="/home/cadu/projeto_SPR/logs/agents/reports"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[AGENT-MONITOR]${NC} $1" | tee -a "$MONITORING_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$MONITORING_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$MONITORING_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$MONITORING_LOG"
}

log_agent() {
    echo -e "${PURPLE}[AGENT]${NC} $1" | tee -a "$MONITORING_LOG"
}

# Criar estrutura de diretórios
setup_monitoring_structure() {
    log_info "🏗️ Configurando estrutura de monitoramento..."
    
    mkdir -p "$DOCS_DIR"/{frontend,backend,whatsapp,qa,devops}
    mkdir -p "$AGENT_REPORTS_DIR"
    mkdir -p "$(dirname "$MONITORING_LOG")"
    
    log_success "✅ Estrutura criada"
}

# Frontend Engineer - Monitoramento
frontend_agent_monitoring() {
    log_agent "⚛️ Frontend Engineer - Iniciando monitoramento..."
    
    local report_file="$AGENT_REPORTS_DIR/frontend-monitor-$(date +%Y%m%d_%H%M).md"
    
    cat > "$report_file" << EOF
# 📊 Frontend Engineer - Relatório de Monitoramento
**Data:** $(date)
**Agente:** Frontend Engineer
**Status:** 🟢 ATIVO

## 🔍 Status dos Componentes

### React Application (Port 3000)
EOF
    
    # Verificar se frontend está rodando
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "- ✅ **Status:** ONLINE" >> "$report_file"
        echo "- 🌐 **URL:** http://localhost:3000" >> "$report_file"
        
        # Analisar estrutura de componentes
        echo "" >> "$report_file"
        echo "### 📁 Componentes Analisados" >> "$report_file"
        
        local component_count=0
        if [[ -d "frontend/src/components" ]]; then
            find frontend/src/components -name "*.tsx" -o -name "*.ts" | while read component; do
                local size=$(stat -c%s "$component" 2>/dev/null || echo "0")
                local lines=$(wc -l < "$component" 2>/dev/null || echo "0")
                echo "- 📄 $(basename "$component") - ${lines} linhas (${size} bytes)" >> "$report_file"
                ((component_count++))
            done
        fi
        
        # Verificar erros TypeScript
        echo "" >> "$report_file"
        echo "### 🔧 Status TypeScript" >> "$report_file"
        
        cd frontend 2>/dev/null || true
        if npm run type-check >/dev/null 2>&1; then
            echo "- ✅ **TypeScript:** Sem erros de tipo" >> "$report_file"
        else
            echo "- ⚠️ **TypeScript:** Erros detectados - revisão necessária" >> "$report_file"
        fi
        cd .. 2>/dev/null || true
        
    else
        echo "- ❌ **Status:** OFFLINE" >> "$report_file"
        echo "- 🚨 **Ação Necessária:** Reinicializar frontend" >> "$report_file"
    fi
    
    # Recomendações do agente
    echo "" >> "$report_file"
    echo "## 💡 Recomendações do Frontend Engineer" >> "$report_file"
    echo "- 🔄 Implementar lazy loading nos componentes pesados" >> "$report_file"
    echo "- 📊 Adicionar métricas de performance" >> "$report_file"
    echo "- 🎨 Revisar responsividade em dispositivos móveis" >> "$report_file"
    echo "- 🧪 Implementar testes unitários para componentes críticos" >> "$report_file"
    
    # Copiar para documentação automática  
    cp "$report_file" "$DOCS_DIR/frontend/latest-report.md"
    
    log_success "✅ Frontend Engineer - Monitoramento concluído"
}

# Backend Engineer - Monitoramento
backend_agent_monitoring() {
    log_agent "🐍 Backend Engineer - Iniciando monitoramento..."
    
    local report_file="$AGENT_REPORTS_DIR/backend-monitor-$(date +%Y%m%d_%H%M).md"
    
    cat > "$report_file" << EOF
# 📊 Backend Engineer - Relatório de Monitoramento
**Data:** $(date)
**Agente:** Backend Engineer
**Status:** 🟢 ATIVO

## 🔍 Status dos Serviços

### Node.js Backend (Port 3002)
EOF
    
    # Verificar backend Node.js
    if curl -s http://localhost:3002/api/health >/dev/null 2>&1; then
        echo "- ✅ **Status:** ONLINE" >> "$report_file"
        echo "- 🌐 **Health Check:** http://localhost:3002/api/health" >> "$report_file"
        
        # Testar endpoints críticos
        echo "" >> "$report_file"
        echo "### 🔗 Endpoints Monitorados" >> "$report_file"
        
        local endpoints=(
            "/api/health:Health Check"
            "/api/status:System Status"
            "/api/metrics:System Metrics"
            "/api/generate-message:AI Message Generation"
        )
        
        for endpoint_info in "${endpoints[@]}"; do
            local endpoint="${endpoint_info%%:*}"
            local desc="${endpoint_info##*:}"
            
            if curl -s "http://localhost:3002$endpoint" >/dev/null 2>&1; then
                echo "- ✅ **$desc:** $endpoint - OK" >> "$report_file"
            else
                echo "- ❌ **$desc:** $endpoint - FALHOU" >> "$report_file"
            fi
        done
        
    else
        echo "- ❌ **Status:** OFFLINE" >> "$report_file"
        echo "- 🚨 **Ação Necessária:** Reinicializar backend" >> "$report_file"
    fi
    
    # Verificar FastAPI Backend (Port 8000)
    echo "" >> "$report_file"
    echo "### FastAPI Backend (Port 8000)" >> "$report_file"
    
    if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
        echo "- ✅ **Status:** ONLINE" >> "$report_file"
        echo "- 📚 **Docs:** http://localhost:8000/docs" >> "$report_file"
    else
        echo "- ⚠️ **Status:** OFFLINE (normal se não iniciado)" >> "$report_file"
    fi
    
    # Análise de arquivos Python
    echo "" >> "$report_file"
    echo "### 🐍 Análise Python" >> "$report_file"
    
    local python_files=$(find app -name "*.py" 2>/dev/null | wc -l)
    echo "- 📄 **Arquivos Python:** $python_files arquivos" >> "$report_file"
    
    # Verificar requirements
    if [[ -f "requirements.txt" ]]; then
        local deps=$(wc -l < requirements.txt)
        echo "- 📦 **Dependências:** $deps pacotes em requirements.txt" >> "$report_file"
    fi
    
    # Recomendações do agente
    echo "" >> "$report_file"
    echo "## 💡 Recomendações do Backend Engineer" >> "$report_file"
    echo "- ⚡ Implementar cache Redis para consultas frequentes" >> "$report_file"
    echo "- 📊 Adicionar monitoramento de performance das APIs" >> "$report_file"
    echo "- 🔐 Revisar autenticação e autorização" >> "$report_file"
    echo "- 🧪 Implementar testes de integração" >> "$report_file"
    
    cp "$report_file" "$DOCS_DIR/backend/latest-report.md"
    
    log_success "✅ Backend Engineer - Monitoramento concluído"
}

# WhatsApp Specialist - Monitoramento
whatsapp_agent_monitoring() {
    log_agent "💬 WhatsApp Specialist - Iniciando monitoramento..."
    
    local report_file="$AGENT_REPORTS_DIR/whatsapp-monitor-$(date +%Y%m%d_%H%M).md"
    
    cat > "$report_file" << EOF
# 📊 WhatsApp Specialist - Relatório de Monitoramento
**Data:** $(date)
**Agente:** WhatsApp Specialist
**Status:** 🟢 ATIVO

## 🔍 Status do WhatsApp Server

### WhatsApp Service (Port 3003)
EOF
    
    # Verificar WhatsApp server
    if curl -s http://localhost:3003 >/dev/null 2>&1; then
        echo "- ✅ **Status:** ONLINE" >> "$report_file"
        echo "- 🌐 **Interface:** http://localhost:3003" >> "$report_file"
        
        # Verificar QR Code
        if [[ -f "qrcodes/qr_latest.png" ]]; then
            local qr_age=$(stat -c %Y qrcodes/qr_latest.png 2>/dev/null || echo "0")
            local current_time=$(date +%s)
            local age_minutes=$(( (current_time - qr_age) / 60 ))
            
            echo "- 📱 **QR Code:** Gerado há $age_minutes minutos" >> "$report_file"
        else
            echo "- ⚠️ **QR Code:** Não encontrado" >> "$report_file"
        fi
        
        # Verificar sessões
        local session_count=$(find sessions -name "*.json" 2>/dev/null | wc -l)
        echo "- 🔐 **Sessões:** $session_count arquivos de sessão" >> "$report_file"
        
    else
        echo "- ❌ **Status:** OFFLINE" >> "$report_file"
        echo "- 🚨 **Ação Necessária:** Reinicializar WhatsApp server" >> "$report_file"
    fi
    
    # Análise de logs
    echo "" >> "$report_file"
    echo "### 📋 Análise de Logs" >> "$report_file"
    
    if [[ -f "logs/spr_whatsapp.log" ]]; then
        local log_size=$(stat -c%s logs/spr_whatsapp.log 2>/dev/null | numfmt --to=iec)
        local last_entry=$(tail -1 logs/spr_whatsapp.log 2>/dev/null | cut -c1-50)
        echo "- 📝 **Log Size:** $log_size" >> "$report_file"
        echo "- 🕐 **Última Entrada:** $last_entry..." >> "$report_file"
    fi
    
    # Verificar versões dos servidores
    echo "" >> "$report_file"
    echo "### 🔧 Versões Disponíveis" >> "$report_file"
    
    if [[ -f "whatsapp_server_real.js" ]]; then
        local size=$(stat -c%s whatsapp_server_real.js | numfmt --to=iec)
        echo "- 📄 **whatsapp_server_real.js:** $size (OFICIAL)" >> "$report_file"
    fi
    
    if [[ -f "whatsapp_baileys_server.js" ]]; then
        local size=$(stat -c%s whatsapp_baileys_server.js | numfmt --to=iec)
        echo "- 📄 **whatsapp_baileys_server.js:** $size (ALTERNATIVO)" >> "$report_file"
    fi
    
    # Recomendações do agente
    echo "" >> "$report_file"
    echo "## 💡 Recomendações do WhatsApp Specialist" >> "$report_file"
    echo "- 🔄 Implementar reconnexão automática" >> "$report_file"
    echo "- 📊 Adicionar métricas de mensagens enviadas/recebidas" >> "$report_file"
    echo "- 🛡️ Melhorar rate limiting para evitar blocks" >> "$report_file"
    echo "- 📱 Implementar backup automático de sessões" >> "$report_file"
    
    cp "$report_file" "$DOCS_DIR/whatsapp/latest-report.md"
    
    log_success "✅ WhatsApp Specialist - Monitoramento concluído"
}

# QA & Testing Agent - Monitoramento
qa_agent_monitoring() {
    log_agent "🧪 QA & Testing Agent - Iniciando monitoramento..."
    
    local report_file="$AGENT_REPORTS_DIR/qa-monitor-$(date +%Y%m%d_%H%M).md"
    
    cat > "$report_file" << EOF
# 📊 QA & Testing Agent - Relatório de Monitoramento
**Data:** $(date)
**Agente:** QA & Testing Agent
**Status:** 🟢 ATIVO

## 🔍 Status dos Testes

### Testes Automatizados
EOF
    
    # Executar testes de endpoints
    echo "- 🧪 **Executando testes de endpoints...**" >> "$report_file"
    
    if ./scripts/test-endpoints.sh --quick >/dev/null 2>&1; then
        echo "- ✅ **Testes de Endpoints:** PASSOU" >> "$report_file"
    else
        echo "- ❌ **Testes de Endpoints:** FALHOU" >> "$report_file"
    fi
    
    # Health check
    echo "- 🏥 **Executando health check...**" >> "$report_file"
    
    if ./scripts/health-check.sh --quick >/dev/null 2>&1; then
        echo "- ✅ **Health Check:** PASSOU" >> "$report_file"
    else
        echo "- ❌ **Health Check:** FALHOU" >> "$report_file"
    fi
    
    # Análise de cobertura de testes
    echo "" >> "$report_file"
    echo "### 📊 Cobertura de Testes" >> "$report_file"
    
    local test_scripts=$(find scripts -name "*test*" 2>/dev/null | wc -l)
    echo "- 🧪 **Scripts de Teste:** $test_scripts arquivos" >> "$report_file"
    
    # Verificar logs de teste recentes
    echo "" >> "$report_file"
    echo "### 📋 Relatórios Recentes" >> "$report_file"
    
    local recent_reports=$(find logs -name "test-report-*" -mtime -1 2>/dev/null | wc -l)
    echo "- 📄 **Relatórios Hoje:** $recent_reports relatórios" >> "$report_file"
    
    # Recomendações do agente
    echo "" >> "$report_file"
    echo "## 💡 Recomendações do QA & Testing Agent" >> "$report_file"
    echo "- 🚀 Implementar CI/CD pipeline com testes automáticos" >> "$report_file"
    echo "- 📊 Adicionar métricas de cobertura de código" >> "$report_file"
    echo "- 🧪 Criar testes de carga para APIs críticas" >> "$report_file"
    echo "- 🐛 Implementar testes de regressão" >> "$report_file"
    
    cp "$report_file" "$DOCS_DIR/qa/latest-report.md"
    
    log_success "✅ QA & Testing Agent - Monitoramento concluído"
}

# DevOps Agent - Monitoramento
devops_agent_monitoring() {
    log_agent "🔐 DevOps Agent - Iniciando monitoramento..."
    
    local report_file="$AGENT_REPORTS_DIR/devops-monitor-$(date +%Y%m%d_%H%M).md"
    
    cat > "$report_file" << EOF
# 📊 DevOps Agent - Relatório de Monitoramento
**Data:** $(date)
**Agente:** DevOps Agent
**Status:** 🟢 ATIVO

## 🔍 Status da Infraestrutura

### Sistema de Monitoramento
EOF
    
    # Verificar uso de disco
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "- 💾 **Uso do Disco:** ${disk_usage}%" >> "$report_file"
    
    if [[ $disk_usage -gt 80 ]]; then
        echo "- 🚨 **Alerta:** Uso de disco acima de 80%" >> "$report_file"
    fi
    
    # Verificar memória
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    echo "- 🧠 **Uso de Memória:** ${memory_usage}%" >> "$report_file"
    
    # Verificar processos do SPR
    echo "" >> "$report_file"
    echo "### 🔧 Processos SPR" >> "$report_file"
    
    local node_processes=$(pgrep -f "node.*server" | wc -l)
    echo "- 🟢 **Processos Node.js:** $node_processes ativos" >> "$report_file"
    
    # Verificar backups
    echo "" >> "$report_file"
    echo "### 💾 Sistema de Backup" >> "$report_file"
    
    if [[ -d "backups" ]]; then
        local backup_count=$(find backups -name "*.tar.gz" 2>/dev/null | wc -l)
        local latest_backup=$(find backups -name "*.tar.gz" -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
        echo "- 📦 **Backups Disponíveis:** $backup_count arquivos" >> "$report_file"
        echo "- 🕐 **Último Backup:** $(basename "$latest_backup" 2>/dev/null || echo "N/A")" >> "$report_file"
    fi
    
    # Verificar automação
    echo "" >> "$report_file"
    echo "### 🤖 Automação" >> "$report_file"
    
    local cron_entries=$(crontab -l 2>/dev/null | grep -c spr || echo "0")
    echo "- ⏰ **Tarefas Cron:** $cron_entries configuradas" >> "$report_file"
    
    # Git status
    echo "" >> "$report_file"
    echo "### 📚 Controle de Versão" >> "$report_file"
    
    local git_status=$(git status --porcelain 2>/dev/null | wc -l)
    local current_branch=$(git branch --show-current 2>/dev/null || echo "N/A")
    echo "- 🌿 **Branch Atual:** $current_branch" >> "$report_file"
    echo "- 📝 **Mudanças Pendentes:** $git_status arquivos" >> "$report_file"
    
    # Logs do sistema
    echo "" >> "$report_file"
    echo "### 📋 Logs do Sistema" >> "$report_file"
    
    local log_files=$(find logs -name "*.log" 2>/dev/null | wc -l)
    local log_size=$(du -sh logs 2>/dev/null | cut -f1 || echo "0")
    echo "- 📄 **Arquivos de Log:** $log_files arquivos" >> "$report_file"
    echo "- 📊 **Tamanho Total:** $log_size" >> "$report_file"
    
    # Recomendações do agente
    echo "" >> "$report_file"
    echo "## 💡 Recomendações do DevOps Agent" >> "$report_file"
    echo "- 🐳 Implementar containerização completa com Docker" >> "$report_file"
    echo "- 📊 Configurar monitoramento de métricas (Prometheus/Grafana)" >> "$report_file"
    echo "- 🔐 Implementar certificados SSL automáticos" >> "$report_file"
    echo "- 🚀 Configurar deploy automático no DigitalOcean" >> "$report_file"
    
    cp "$report_file" "$DOCS_DIR/devops/latest-report.md"
    
    log_success "✅ DevOps Agent - Monitoramento concluído"
}

# Gerar documentação consolidada
generate_consolidated_documentation() {
    log_info "📚 Gerando documentação consolidada..."
    
    local consolidated_doc="$DOCS_DIR/SISTEMA_STATUS_COMPLETO.md"
    
    cat > "$consolidated_doc" << EOF
# 🤖 SPR - Relatório Consolidado do Sistema Multi-Agente
**Gerado em:** $(date)
**Versão:** SPR v1.2.0

## 📊 RESUMO EXECUTIVO

### Status Geral dos Agentes
- ⚛️ **Frontend Engineer:** 🟢 ATIVO
- 🐍 **Backend Engineer:** 🟢 ATIVO  
- 💬 **WhatsApp Specialist:** 🟢 ATIVO
- 🧪 **QA & Testing Agent:** 🟢 ATIVO
- 🔐 **DevOps Agent:** 🟢 ATIVO

### Últimas Verificações
EOF
    
    # Incluir resumo de cada agente
    for agent in frontend backend whatsapp qa devops; do
        local latest_report="$DOCS_DIR/$agent/latest-report.md"
        if [[ -f "$latest_report" ]]; then
            echo "" >> "$consolidated_doc"
            echo "## 📋 Relatório: $(echo $agent | tr '[:lower:]' '[:upper:]') AGENT" >> "$consolidated_doc"
            head -20 "$latest_report" | tail -15 >> "$consolidated_doc"
        fi
    done
    
    # Adicionar ações recomendadas
    echo "" >> "$consolidated_doc"
    echo "## 🎯 AÇÕES PRIORITÁRIAS" >> "$consolidated_doc"
    echo "1. 🔄 Executar backup automático do sistema" >> "$consolidated_doc"
    echo "2. 🧪 Validar todos os endpoints críticos" >> "$consolidated_doc"
    echo "3. 📊 Revisar métricas de performance" >> "$consolidated_doc"
    echo "4. 🚀 Preparar próximo deploy automatizado" >> "$consolidated_doc"
    
    log_success "✅ Documentação consolidada gerada: $consolidated_doc"
}

# Configurar monitoramento automático
setup_automatic_monitoring() {
    log_info "⚙️ Configurando monitoramento automático via cron..."
    
    # Backup do crontab atual
    crontab -l > /tmp/crontab_backup 2>/dev/null || true
    
    # Remover entradas antigas do monitoramento
    crontab -l 2>/dev/null | grep -v "agent-monitoring.sh" > /tmp/crontab_new || true
    
    # Adicionar nova entrada para monitoramento a cada 30 minutos
    echo "# SPR Agent Monitoring - Every 30 minutes" >> /tmp/crontab_new
    echo "*/30 * * * * cd $PROJECT_ROOT && ./scripts/agent-monitoring.sh run >> $MONITORING_LOG 2>&1" >> /tmp/crontab_new
    echo "" >> /tmp/crontab_new
    
    # Instalar novo crontab
    crontab /tmp/crontab_new
    
    log_success "✅ Monitoramento automático configurado (a cada 30 minutos)"
    
    # Limpar arquivos temporários
    rm -f /tmp/crontab_new /tmp/crontab_backup
}

# Executar monitoramento completo
run_full_monitoring() {
    log_info "🚀 SPR Agent Monitoring - Iniciando monitoramento completo"
    echo "$(date): Iniciando monitoramento automático" >> "$MONITORING_LOG"
    
    setup_monitoring_structure
    
    # Executar monitoramento de cada agente
    frontend_agent_monitoring
    backend_agent_monitoring  
    whatsapp_agent_monitoring
    qa_agent_monitoring
    devops_agent_monitoring
    
    # Gerar documentação consolidada
    generate_consolidated_documentation
    
    log_success "🎉 Monitoramento completo concluído!"
    log_info "📁 Relatórios disponíveis em: $AGENT_REPORTS_DIR"
    log_info "📚 Documentação em: $DOCS_DIR"
}

# Função principal
main() {
    local action="${1:-help}"
    
    case "$action" in
        "run")
            run_full_monitoring
            ;;
        "setup")
            setup_automatic_monitoring
            ;;
        "frontend")
            setup_monitoring_structure
            frontend_agent_monitoring
            ;;
        "backend")
            setup_monitoring_structure
            backend_agent_monitoring
            ;;
        "whatsapp")
            setup_monitoring_structure
            whatsapp_agent_monitoring
            ;;
        "qa")
            setup_monitoring_structure
            qa_agent_monitoring
            ;;
        "devops")
            setup_monitoring_structure
            devops_agent_monitoring
            ;;
        "docs")
            generate_consolidated_documentation
            ;;
        "help"|*)
            echo "🤖 SPR Agent Monitoring System v1.0"
            echo ""
            echo "Uso: $0 [ação]"
            echo ""
            echo "Ações disponíveis:"
            echo "  run       - Executar monitoramento completo de todos os agentes"
            echo "  setup     - Configurar monitoramento automático (cron)"
            echo "  frontend  - Monitorar apenas Frontend Engineer"
            echo "  backend   - Monitorar apenas Backend Engineer"
            echo "  whatsapp  - Monitorar apenas WhatsApp Specialist"
            echo "  qa        - Monitorar apenas QA & Testing Agent"
            echo "  devops    - Monitorar apenas DevOps Agent"
            echo "  docs      - Gerar apenas documentação consolidada"
            echo "  help      - Mostrar esta ajuda"
            echo ""
            echo "🤖 Os agentes são responsáveis pelo monitoramento automático"
            echo "📚 Documentação gerada automaticamente em docs/auto-generated/"
            echo ""
            ;;
    esac
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi