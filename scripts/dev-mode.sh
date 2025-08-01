#!/bin/bash

# 🚀 SPR - Script para Modo Desenvolvimento
# Inicia todos os serviços com hot-reload, logs detalhados e monitoramento
# Interface de desenvolvimento com restart automático e debugging avançado

# Configurações globais
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
DEV_LOG="$LOG_DIR/dev-mode.log"
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

# Configurações de desenvolvimento
DEBUG_MODE=true
HOT_RELOAD=true
AUTO_RESTART=true
BROWSER_AUTO_OPEN=true
WATCH_FILES=true
MONITOR_INTERVAL=5

# PIDs dos processos
BACKEND_PID=""
WHATSAPP_PID=""
FRONTEND_PID=""
WATCHER_PID=""
MONITOR_PID=""

# Arrays para monitoramento
declare -A SERVICE_STATUS
declare -A SERVICE_RESTARTS
declare -A SERVICE_LAST_RESTART
declare -A WATCHED_FILES

# Função para exibir banner colorido
show_banner() {
    clear
    echo -e "${BOLD}${BLUE}"
    echo "████████████████████████████████████████████████████████████████"
    echo "██                                                            ██"
    echo "██    🚀 SPR - Sistema Preditivo Royal                       ██"
    echo "██    👨‍💻 Modo Desenvolvimento - Dev Mode                       ██"
    echo "██                                                            ██"
    echo "██    🔧 Backend    → http://localhost:3002 (Hot Reload)     ██"
    echo "██    📱 WhatsApp   → http://localhost:3003 (Auto Restart)   ██"
    echo "██    🎨 Frontend   → http://localhost:3000 (Live Reload)    ██"
    echo "██                                                            ██"
    echo "████████████████████████████████████████████████████████████████"
    echo -e "${NC}"
    echo -e "${CYAN}📅 $(date)${NC}"
    echo -e "${CYAN}📍 Diretório: $PROJECT_ROOT${NC}"
    echo -e "${CYAN}📝 Log: $DEV_LOG${NC}"
    echo -e "${CYAN}🐛 Debug Mode: ${DEBUG_MODE}${NC}"
    echo -e "${CYAN}🔥 Hot Reload: ${HOT_RELOAD}${NC}"
    echo ""
}

# Função para logging com diferentes níveis
log_message() {
    local level=$1
    local service=$2
    local message=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_entry="[$timestamp] [$level] [$service] $message"
    
    echo "$log_entry" >> "$DEV_LOG"
    
    # Output colorido no console baseado no nível
    case $level in
        "DEBUG")
            if [ "$DEBUG_MODE" = true ]; then
                echo -e "${CYAN}[DEBUG] [$service] $message${NC}"
            fi
            ;;
        "INFO")
            echo -e "${BLUE}[INFO] [$service] $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN] [$service] $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR] [$service] $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS] [$service] $message${NC}"
            ;;
    esac
}

# Função para detectar mudanças em arquivos
setup_file_watchers() {
    if [ "$WATCH_FILES" != true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}📁 Configurando watchers de arquivos...${NC}"
    log_message "INFO" "WATCHER" "Setting up file watchers"
    
    # Arquivos principais para monitorar
    WATCHED_FILES=(
        "$PROJECT_ROOT/backend_server_fixed.js"
        "$PROJECT_ROOT/whatsapp_server_real.js"
        "$PROJECT_ROOT/package.json"
        "$PROJECT_ROOT/frontend/src/"
        "$PROJECT_ROOT/frontend/package.json"
        "$PROJECT_ROOT/app/"
        "$PROJECT_ROOT/config/"
    )
    
    # Verificar se inotify-tools está disponível
    if command -v inotifywait &> /dev/null; then
        echo -e "${GREEN}✅ inotify-tools encontrado - usando watchers nativos${NC}"
        start_inotify_watcher &
        WATCHER_PID=$!
        log_message "SUCCESS" "WATCHER" "Native file watchers started (PID: $WATCHER_PID)"
    else
        echo -e "${YELLOW}⚠️  inotify-tools não encontrado - usando polling${NC}"
        echo -e "${CYAN}💡 Para melhor performance: sudo apt-get install inotify-tools${NC}"
        start_polling_watcher &
        WATCHER_PID=$!
        log_message "WARN" "WATCHER" "Falling back to polling watcher (PID: $WATCHER_PID)"
    fi
}

# Watcher usando inotify (mais eficiente)
start_inotify_watcher() {
    while true; do
        # Monitorar arquivos principais
        inotifywait -r -e modify,create,delete,move \
            "$PROJECT_ROOT/backend_server_fixed.js" \
            "$PROJECT_ROOT/whatsapp_server_real.js" \
            "$PROJECT_ROOT/app/" \
            "$PROJECT_ROOT/config/" \
            2>/dev/null | while read path action file; do
            
            local full_path="$path$file"
            log_message "DEBUG" "WATCHER" "File changed: $full_path ($action)"
            
            # Decidir qual serviço reiniciar baseado no arquivo
            if [[ "$full_path" == *"backend_server_fixed.js"* ]] || [[ "$full_path" == *"/app/"* ]]; then
                log_message "INFO" "WATCHER" "Backend file changed, restarting backend"
                restart_service "backend"
            elif [[ "$full_path" == *"whatsapp_server_real.js"* ]]; then
                log_message "INFO" "WATCHER" "WhatsApp file changed, restarting WhatsApp"
                restart_service "whatsapp"
            elif [[ "$full_path" == *"/config/"* ]]; then
                log_message "INFO" "WATCHER" "Config changed, restarting all services"
                restart_all_services
            fi
        done
        
        sleep 1
    done
}

# Watcher usando polling (fallback)
start_polling_watcher() {
    local -A file_timestamps
    
    # Inicializar timestamps
    for file in "${WATCHED_FILES[@]}"; do
        if [ -f "$file" ]; then
            file_timestamps["$file"]=$(stat -c %Y "$file" 2>/dev/null || echo "0")
        elif [ -d "$file" ]; then
            file_timestamps["$file"]=$(find "$file" -type f -exec stat -c %Y {} \; | sort -n | tail -1 2>/dev/null || echo "0")
        fi
    done
    
    while true; do
        for file in "${WATCHED_FILES[@]}"; do
            local current_timestamp
            
            if [ -f "$file" ]; then
                current_timestamp=$(stat -c %Y "$file" 2>/dev/null || echo "0")
            elif [ -d "$file" ]; then
                current_timestamp=$(find "$file" -type f -exec stat -c %Y {} \; | sort -n | tail -1 2>/dev/null || echo "0")
            else
                continue
            fi
            
            local old_timestamp=${file_timestamps["$file"]:-"0"}
            
            if [ "$current_timestamp" -gt "$old_timestamp" ]; then
                file_timestamps["$file"]=$current_timestamp
                log_message "DEBUG" "WATCHER" "File changed (polling): $file"
                
                # Decidir qual serviço reiniciar
                if [[ "$file" == *"backend_server_fixed.js"* ]] || [[ "$file" == *"/app/"* ]]; then
                    restart_service "backend"
                elif [[ "$file" == *"whatsapp_server_real.js"* ]]; then
                    restart_service "whatsapp"
                elif [[ "$file" == *"/config/"* ]]; then
                    restart_all_services
                fi
            fi
        done
        
        sleep $MONITOR_INTERVAL
    done
}

# Função para iniciar um serviço específico
start_service() {
    local service=$1
    local service_name=""
    local script_path=""
    local port=""
    local log_file=""
    local start_cmd=""
    
    case $service in
        "backend")
            service_name="Backend"
            script_path="backend_server_fixed.js"
            port=$BACKEND_PORT
            log_file="$LOG_DIR/dev-backend.log"
            start_cmd="node --inspect=0.0.0.0:9229 backend_server_fixed.js"
            ;;
        "whatsapp")
            service_name="WhatsApp"
            script_path="whatsapp_server_real.js"
            port=$WHATSAPP_PORT
            log_file="$LOG_DIR/dev-whatsapp.log"
            start_cmd="node --inspect=0.0.0.0:9230 whatsapp_server_real.js"
            ;;
        "frontend")
            service_name="Frontend"
            script_path="frontend"
            port=$FRONTEND_PORT
            log_file="$LOG_DIR/dev-frontend.log"
            start_cmd="npm start"
            ;;
        *)
            log_message "ERROR" "SYSTEM" "Unknown service: $service"
            return 1
            ;;
    esac
    
    echo -e "${BLUE}🚀 Iniciando $service_name (modo desenvolvimento)...${NC}"
    log_message "INFO" "$service_name" "Starting in development mode"
    
    # Verificar se a porta está ocupada
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Porta $port ocupada, tentando liberar...${NC}"
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t | head -1)
        kill -TERM $pid 2>/dev/null || kill -KILL $pid 2>/dev/null
        sleep 2
    fi
    
    # Preparar ambiente de desenvolvimento
    cd "$PROJECT_ROOT"
    
    # Configurar variáveis de ambiente para desenvolvimento
    export DEBUG=true
    export NODE_ENV=development
    export FORCE_COLOR=1
    export DEBUG_COLORS=true
    
    case $service in
        "backend")
            export DEBUG_PORT=9229
            node --inspect=0.0.0.0:9229 backend_server_fixed.js > "$log_file" 2>&1 &
            BACKEND_PID=$!
            ;;
        "whatsapp")
            export DEBUG_PORT=9230
            node --inspect=0.0.0.0:9230 whatsapp_server_real.js > "$log_file" 2>&1 &
            WHATSAPP_PID=$!
            ;;
        "frontend")
            cd frontend
            export BROWSER=none  # Controlar abertura do browser manualmente
            export FAST_REFRESH=true
            export GENERATE_SOURCEMAP=true
            npm start > "$log_file" 2>&1 &
            FRONTEND_PID=$!
            cd ..
            ;;
    esac
    
    local service_pid=$!
    
    # Atualizar status
    SERVICE_STATUS[$service]="starting"
    SERVICE_RESTARTS[$service]=${SERVICE_RESTARTS[$service]:-0}
    SERVICE_LAST_RESTART[$service]=$(date +%s)
    
    echo -e "${GREEN}✅ $service_name iniciado (PID: $service_pid)${NC}"
    echo -e "${CYAN}   🐛 Debug disponível na porta: $([ "$service" = "backend" ] && echo "9229" || echo "9230")${NC}"
    echo -e "${CYAN}   📝 Logs: $log_file${NC}"
    
    log_message "SUCCESS" "$service_name" "Started with PID $service_pid"
    
    # Aguardar um pouco para o serviço inicializar
    sleep 3
    
    # Verificar se realmente iniciou
    if kill -0 $service_pid 2>/dev/null; then
        SERVICE_STATUS[$service]="running"
        log_message "SUCCESS" "$service_name" "Service is running successfully"
        
        # Tentar testar endpoint se disponível
        local health_url=""
        case $service in
            "backend")
                health_url="$BACKEND_URL/api/health"
                ;;
            "whatsapp")
                health_url="$WHATSAPP_URL/api/status"
                ;;
            "frontend")
                health_url="$FRONTEND_URL"
                ;;
        esac
        
        if [ -n "$health_url" ]; then
            if curl -s --max-time 5 "$health_url" >/dev/null 2>&1; then
                echo -e "${GREEN}   ✅ $service_name respondendo em $health_url${NC}"
                log_message "SUCCESS" "$service_name" "Health check passed"
            else
                echo -e "${YELLOW}   ⚠️  $service_name ainda inicializando...${NC}"
                log_message "WARN" "$service_name" "Health check failed, service may still be starting"
            fi
        fi
    else
        SERVICE_STATUS[$service]="failed"
        echo -e "${RED}❌ Falha ao iniciar $service_name${NC}"
        log_message "ERROR" "$service_name" "Failed to start"
        return 1
    fi
}

# Função para parar um serviço específico
stop_service() {
    local service=$1
    local service_name=""
    local service_pid=""
    
    case $service in
        "backend")
            service_name="Backend"
            service_pid=$BACKEND_PID
            ;;
        "whatsapp")
            service_name="WhatsApp"
            service_pid=$WHATSAPP_PID
            ;;
        "frontend")
            service_name="Frontend"
            service_pid=$FRONTEND_PID
            ;;
        *)
            log_message "ERROR" "SYSTEM" "Unknown service: $service"
            return 1
            ;;
    esac
    
    if [ -n "$service_pid" ] && kill -0 $service_pid 2>/dev/null; then
        echo -e "${YELLOW}🔄 Parando $service_name (PID: $service_pid)...${NC}"
        log_message "INFO" "$service_name" "Stopping service (PID: $service_pid)"
        
        # Tentar parar graciosamente
        kill -TERM $service_pid 2>/dev/null
        
        # Aguardar até 10 segundos
        local count=0
        while [ $count -lt 10 ] && kill -0 $service_pid 2>/dev/null; do
            sleep 1
            ((count++))
        done
        
        # Forçar se necessário
        if kill -0 $service_pid 2>/dev/null; then
            echo -e "${RED}⚡ Forçando parada do $service_name...${NC}"
            kill -KILL $service_pid 2>/dev/null
            log_message "WARN" "$service_name" "Forced stop required"
        fi
        
        SERVICE_STATUS[$service]="stopped"
        echo -e "${GREEN}✅ $service_name parado${NC}"
        log_message "SUCCESS" "$service_name" "Service stopped"
    else
        echo -e "${YELLOW}⚠️  $service_name não estava rodando${NC}"
        log_message "WARN" "$service_name" "Service was not running"
    fi
}

# Função para reiniciar um serviço
restart_service() {
    local service=$1
    local service_name=""
    
    case $service in
        "backend")
            service_name="Backend"
            ;;
        "whatsapp")
            service_name="WhatsApp"
            ;;
        "frontend")
            service_name="Frontend"
            ;;
        *)
            log_message "ERROR" "SYSTEM" "Unknown service for restart: $service"
            return 1
            ;;
    esac
    
    echo -e "${CYAN}🔄 Reiniciando $service_name...${NC}"
    log_message "INFO" "$service_name" "Restarting service"
    
    # Incrementar contador de restarts
    SERVICE_RESTARTS[$service]=$((${SERVICE_RESTARTS[$service]:-0} + 1))
    
    stop_service "$service"
    sleep 2
    start_service "$service"
    
    SERVICE_LAST_RESTART[$service]=$(date +%s)
    log_message "SUCCESS" "$service_name" "Service restarted (total restarts: ${SERVICE_RESTARTS[$service]})"
}

# Função para reiniciar todos os serviços
restart_all_services() {
    echo -e "${CYAN}🔄 Reiniciando todos os serviços...${NC}"
    log_message "INFO" "SYSTEM" "Restarting all services"
    
    restart_service "backend"
    sleep 2
    restart_service "whatsapp"
    sleep 2
    restart_service "frontend"
    
    log_message "SUCCESS" "SYSTEM" "All services restarted"
}

# Função de monitoramento contínuo
start_monitoring() {
    echo -e "${YELLOW}📊 Iniciando monitoramento em tempo real...${NC}"
    log_message "INFO" "MONITOR" "Starting real-time monitoring"
    
    {
        while true; do
            # Verificar status dos serviços
            for service in "backend" "whatsapp" "frontend"; do
                local service_pid=""
                local health_url=""
                local service_name=""
                
                case $service in
                    "backend")
                        service_pid=$BACKEND_PID
                        health_url="$BACKEND_URL/api/health"
                        service_name="Backend"
                        ;;
                    "whatsapp")
                        service_pid=$WHATSAPP_PID
                        health_url="$WHATSAPP_URL/api/status"
                        service_name="WhatsApp"
                        ;;
                    "frontend")
                        service_pid=$FRONTEND_PID
                        health_url="$FRONTEND_URL"
                        service_name="Frontend"
                        ;;
                esac
                
                # Verificar se o processo ainda existe
                if [ -n "$service_pid" ] && ! kill -0 $service_pid 2>/dev/null; then
                    echo -e "${RED}🚨 $service_name crashou! Reiniciando automaticamente...${NC}"
                    log_message "ERROR" "$service_name" "Service crashed, auto-restarting"
                    
                    if [ "$AUTO_RESTART" = true ]; then
                        restart_service "$service"
                    else
                        SERVICE_STATUS[$service]="crashed"
                    fi
                fi
                
                # Verificar conectividade HTTP
                if [ -n "$health_url" ] && [ "${SERVICE_STATUS[$service]}" = "running" ]; then
                    if ! curl -s --max-time 3 "$health_url" >/dev/null 2>&1; then
                        log_message "WARN" "$service_name" "Health check failed"
                        
                        # Se falhar múltiplas vezes, reiniciar
                        local health_failures=${SERVICE_HEALTH_FAILURES[$service]:-0}
                        SERVICE_HEALTH_FAILURES[$service]=$((health_failures + 1))
                        
                        if [ ${SERVICE_HEALTH_FAILURES[$service]} -gt 3 ] && [ "$AUTO_RESTART" = true ]; then
                            echo -e "${YELLOW}⚠️  $service_name não respondendo, reiniciando...${NC}"
                            log_message "WARN" "$service_name" "Multiple health check failures, restarting"
                            restart_service "$service"
                            SERVICE_HEALTH_FAILURES[$service]=0
                        fi
                    else
                        SERVICE_HEALTH_FAILURES[$service]=0
                    fi
                fi
            done
            
            sleep $MONITOR_INTERVAL
        done
    } &
    
    MONITOR_PID=$!
    log_message "SUCCESS" "MONITOR" "Real-time monitoring started (PID: $MONITOR_PID)"
}

# Função para abrir URLs no browser
open_browser() {
    if [ "$BROWSER_AUTO_OPEN" != true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}🌐 Abrindo URLs no navegador...${NC}"
    log_message "INFO" "BROWSER" "Opening URLs in browser"
    
    # Aguardar serviços ficarem prontos
    sleep 5
    
    # Detectar comando do browser
    local browser_cmd=""
    if command -v xdg-open &> /dev/null; then
        browser_cmd="xdg-open"
    elif command -v open &> /dev/null; then
        browser_cmd="open"
    elif command -v wslview &> /dev/null; then
        browser_cmd="wslview"
    else
        echo -e "${YELLOW}⚠️  Comando de browser não encontrado${NC}"
        log_message "WARN" "BROWSER" "Browser command not found"
        return 1
    fi
    
    # Abrir URLs
    $browser_cmd "$FRONTEND_URL" 2>/dev/null &
    sleep 2
    $browser_cmd "$BACKEND_URL/api/health" 2>/dev/null &
    sleep 2
    $browser_cmd "$WHATSAPP_URL/qr" 2>/dev/null &
    
    echo -e "${GREEN}✅ URLs abertas no navegador${NC}"
    log_message "SUCCESS" "BROWSER" "URLs opened in browser"
}

# Função para exibir dashboard em tempo real
show_dashboard() {
    while true; do
        clear
        show_banner
        
        echo -e "${BOLD}${WHITE}📊 DASHBOARD DE DESENVOLVIMENTO EM TEMPO REAL${NC}"
        echo "============================================================"
        
        local current_time=$(date +%s)
        local uptime=$((current_time - START_TIME))
        local uptime_formatted=$(printf '%02d:%02d:%02d' $((uptime/3600)) $(((uptime%3600)/60)) $((uptime%60)))
        
        echo -e "${CYAN}⏱️  Uptime: $uptime_formatted${NC}"
        echo -e "${CYAN}🔄 Auto Restart: $AUTO_RESTART${NC}"
        echo -e "${CYAN}🐛 Debug Mode: $DEBUG_MODE${NC}"
        echo ""
        
        # Status dos serviços
        echo -e "${BOLD}🏥 STATUS DOS SERVIÇOS:${NC}"
        echo "------------------------------------------------------------"
        
        for service in "backend" "whatsapp" "frontend"; do
            local service_name=""
            local service_pid=""
            local port=""
            local debug_port=""
            
            case $service in
                "backend")
                    service_name="Backend"
                    service_pid=$BACKEND_PID
                    port=$BACKEND_PORT
                    debug_port="9229"
                    ;;
                "whatsapp")
                    service_name="WhatsApp"
                    service_pid=$WHATSAPP_PID
                    port=$WHATSAPP_PORT
                    debug_port="9230"
                    ;;
                "frontend")
                    service_name="Frontend"
                    service_pid=$FRONTEND_PID
                    port=$FRONTEND_PORT
                    debug_port="N/A"
                    ;;
            esac
            
            local status=${SERVICE_STATUS[$service]:-"unknown"}
            local restarts=${SERVICE_RESTARTS[$service]:-0}
            local last_restart=${SERVICE_LAST_RESTART[$service]:-0}
            
            # Status colorido
            case $status in
                "running")
                    echo -e "${GREEN}✅ $service_name${NC} - Porta $port - ${GREEN}RODANDO${NC} (PID: $service_pid)"
                    ;;
                "starting")
                    echo -e "${YELLOW}🔄 $service_name${NC} - Porta $port - ${YELLOW}INICIANDO...${NC}"
                    ;;
                "crashed")
                    echo -e "${RED}💥 $service_name${NC} - Porta $port - ${RED}CRASHOU${NC}"
                    ;;
                "stopped")
                    echo -e "${YELLOW}⏸️  $service_name${NC} - Porta $port - ${YELLOW}PARADO${NC}"
                    ;;
                *)
                    echo -e "${YELLOW}❓ $service_name${NC} - Porta $port - ${YELLOW}DESCONHECIDO${NC}"
                    ;;
            esac
            
            echo -e "   🔄 Restarts: $restarts | 🐛 Debug: $debug_port"
            
            if [ $last_restart -gt 0 ]; then
                local restart_ago=$((current_time - last_restart))
                echo -e "   ⏰ Último restart: ${restart_ago}s atrás"
            fi
            
            echo ""
        done
        
        # URLs importantes
        echo -e "${BOLD}🔗 LINKS DE DESENVOLVIMENTO:${NC}"
        echo "------------------------------------------------------------"
        echo -e "${GREEN}🎨 Frontend:${NC}      $FRONTEND_URL"
        echo -e "${GREEN}🔧 Backend API:${NC}   $BACKEND_URL/api/health"
        echo -e "${GREEN}📱 WhatsApp QR:${NC}   $WHATSAPP_URL/qr"
        echo -e "${GREEN}🐛 Backend Debug:${NC} chrome://inspect (port 9229)"
        echo -e "${GREEN}🐛 WhatsApp Debug:${NC} chrome://inspect (port 9230)"
        echo -e "${GREEN}📊 Logs:${NC}          $LOG_DIR/"
        echo ""
        
        # Comandos disponíveis
        echo -e "${BOLD}⌨️  COMANDOS DISPONÍVEIS:${NC}"
        echo "------------------------------------------------------------"
        echo -e "${CYAN}r${NC} - Reiniciar todos os serviços"
        echo -e "${CYAN}b${NC} - Reiniciar apenas Backend"
        echo -e "${CYAN}w${NC} - Reiniciar apenas WhatsApp"
        echo -e "${CYAN}f${NC} - Reiniciar apenas Frontend"
        echo -e "${CYAN}l${NC} - Ver logs em tempo real"
        echo -e "${CYAN}t${NC} - Executar testes de endpoint"
        echo -e "${CYAN}h${NC} - Executar health check"
        echo -e "${CYAN}o${NC} - Abrir URLs no navegador"
        echo -e "${CYAN}q${NC} - Sair do modo desenvolvimento"
        echo ""
        
        # Aguardar comando do usuário com timeout
        read -t 5 -n 1 -s command
        
        case $command in
            "r"|"R")
                restart_all_services
                sleep 3
                ;;
            "b"|"B")
                restart_service "backend"
                sleep 2
                ;;
            "w"|"W")
                restart_service "whatsapp"
                sleep 2
                ;;
            "f"|"F")
                restart_service "frontend"
                sleep 2
                ;;
            "l"|"L")
                echo -e "${CYAN}📝 Abrindo logs em tempo real (Ctrl+C para voltar)...${NC}"
                tail -f "$DEV_LOG" "$LOG_DIR/dev-"*.log 2>/dev/null
                ;;
            "t"|"T")
                echo -e "${CYAN}🧪 Executando testes de endpoint...${NC}"
                bash "$SCRIPT_DIR/test-endpoints.sh" --quick
                read -p "Pressione Enter para continuar..."
                ;;
            "h"|"H")
                echo -e "${CYAN}🏥 Executando health check...${NC}"
                bash "$SCRIPT_DIR/health-check.sh" --quick
                read -p "Pressione Enter para continuar..."
                ;;
            "o"|"O")
                open_browser
                ;;
            "q"|"Q")
                echo -e "${YELLOW}👋 Saindo do modo desenvolvimento...${NC}"
                cleanup_and_exit
                ;;
        esac
    done
}

# Função para limpeza e saída
cleanup_and_exit() {
    echo -e "\n${YELLOW}🧹 Limpando processos do modo desenvolvimento...${NC}"
    log_message "INFO" "SYSTEM" "Cleaning up development mode"
    
    # Parar monitoramento
    if [ -n "$MONITOR_PID" ] && kill -0 $MONITOR_PID 2>/dev/null; then
        echo -e "${YELLOW}🔄 Parando monitoramento...${NC}"
        kill -TERM $MONITOR_PID 2>/dev/null
    fi
    
    # Parar watcher
    if [ -n "$WATCHER_PID" ] && kill -0 $WATCHER_PID 2>/dev/null; then
        echo -e "${YELLOW}🔄 Parando file watcher...${NC}"
        kill -TERM $WATCHER_PID 2>/dev/null
    fi
    
    # Parar serviços
    stop_service "frontend"
    stop_service "whatsapp"
    stop_service "backend"
    
    echo -e "${GREEN}✅ Limpeza concluída${NC}"
    log_message "SUCCESS" "SYSTEM" "Development mode cleanup completed"
    
    local end_time=$(date +%s)
    local total_time=$((end_time - START_TIME))
    echo -e "${CYAN}⏱️  Tempo total em modo desenvolvimento: ${total_time}s${NC}"
    
    exit 0
}

# Função para exibir ajuda
show_help() {
    show_banner
    echo -e "${CYAN}📚 Uso do script:${NC}"
    echo ""
    echo "  $0                    # Modo desenvolvimento completo"
    echo "  $0 --no-browser       # Não abrir URLs automaticamente"
    echo "  $0 --no-watch         # Desabilitar file watchers"
    echo "  $0 --no-restart       # Desabilitar restart automático"
    echo "  $0 --monitor-only     # Apenas monitorar serviços existentes"
    echo "  $0 --help             # Mostrar esta ajuda"
    echo ""
    echo -e "${YELLOW}💡 Características do Modo Desenvolvimento:${NC}"
    echo "  • Hot reload automático para mudanças em arquivos"
    echo "  • Logs detalhados com debug habilitado"
    echo "  • Restart automático em caso de crash"
    echo "  • Interface de monitoramento em tempo real"
    echo "  • Debug ports habilitados (Backend: 9229, WhatsApp: 9230)"
    echo "  • File watchers para código-fonte"
    echo "  • Abertura automática de URLs no navegador"
    echo ""
    echo -e "${YELLOW}🔧 Para usar debugger do Chrome:${NC}"
    echo "  1. Abra chrome://inspect no Chrome"
    echo "  2. Procure por 'localhost:9229' (Backend) ou 'localhost:9230' (WhatsApp)"
    echo "  3. Clique em 'inspect' para iniciar debugging"
    echo ""
}

# Função principal
main() {
    # Processar argumentos
    for arg in "$@"; do
        case $arg in
            --no-browser)
                BROWSER_AUTO_OPEN=false
                ;;
            --no-watch)
                WATCH_FILES=false
                ;;
            --no-restart)
                AUTO_RESTART=false
                ;;
            --monitor-only)
                echo -e "${CYAN}📊 Modo apenas monitoramento${NC}"
                show_dashboard
                exit 0
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Opção inválida: $arg${NC}"
                echo -e "${YELLOW}💡 Use $0 --help para ver as opções disponíveis${NC}"
                exit 1
                ;;
        esac
    done
    
    # Criar diretório de logs
    mkdir -p "$LOG_DIR"
    
    # Inicializar log
    log_message "INFO" "SYSTEM" "Starting development mode"
    
    # Configurar trap para limpeza
    trap cleanup_and_exit SIGINT SIGTERM
    
    show_banner
    
    echo -e "${BOLD}${YELLOW}🚀 INICIANDO MODO DESENVOLVIMENTO${NC}"
    echo "============================================================"
    
    # Verificar pré-requisitos
    echo -e "${YELLOW}🔍 Verificando pré-requisitos...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js não encontrado${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm não encontrado${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Pré-requisitos OK${NC}"
    
    # Instalar dependências se necessário
    echo -e "${YELLOW}📦 Verificando dependências...${NC}"
    
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependências do backend...${NC}"
        cd "$PROJECT_ROOT" && npm install
    fi
    
    if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependências do frontend...${NC}"
        cd "$PROJECT_ROOT/frontend" && npm install
        cd "$PROJECT_ROOT"
    fi
    
    echo -e "${GREEN}✅ Dependências OK${NC}"
    echo ""
    
    # Iniciar serviços
    echo -e "${BOLD}🚀 INICIANDO SERVIÇOS EM MODO DESENVOLVIMENTO${NC}"
    echo "============================================================"
    
    start_service "backend"
    sleep 2
    start_service "whatsapp"
    sleep 2
    start_service "frontend"
    
    # Configurar file watchers
    setup_file_watchers
    
    # Iniciar monitoramento
    start_monitoring
    
    # Abrir browser se solicitado
    if [ "$BROWSER_AUTO_OPEN" = true ]; then
        open_browser
    fi
    
    echo ""
    echo -e "${BOLD}${GREEN}🎉 MODO DESENVOLVIMENTO ATIVO!${NC}"
    echo "============================================================"
    echo -e "${GREEN}✅ Todos os serviços estão rodando em modo desenvolvimento${NC}"
    echo -e "${CYAN}🔥 Hot reload ativo - mudanças serão detectadas automaticamente${NC}"
    echo -e "${YELLOW}📊 Dashboard interativo será exibido em 3 segundos...${NC}"
    echo -e "${YELLOW}💡 Use Ctrl+C para sair do modo desenvolvimento${NC}"
    echo ""
    
    sleep 3
    
    # Exibir dashboard interativo
    show_dashboard
}

# Executar função principal
main "$@"