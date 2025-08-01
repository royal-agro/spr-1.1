#!/bin/bash

# 🚀 SPR - Script Master de Inicialização Completa
# Inicia todos os serviços do Sistema Preditivo Royal
# Sequência: Backend (3002) → WhatsApp (3003) → Frontend (3000)

# Configurações globais
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
DEBUG_MODE=false
START_TIME=$(date +%s)

# Cores ANSI para output colorido
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# URLs e portas dos serviços
BACKEND_PORT=3002
WHATSAPP_PORT=3003
FRONTEND_PORT=3000
BACKEND_URL="http://localhost:$BACKEND_PORT"
WHATSAPP_URL="http://localhost:$WHATSAPP_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

# PIDs dos processos iniciados
BACKEND_PID=""
WHATSAPP_PID=""
FRONTEND_PID=""

# Array para armazenar status dos serviços
declare -A SERVICE_STATUS
declare -A SERVICE_START_TIME

# Função para exibir banner colorido
show_banner() {
    clear
    echo -e "${BOLD}${BLUE}"
    echo "████████████████████████████████████████████████████████████████"
    echo "██                                                            ██"
    echo "██    🚀 SPR - Sistema Preditivo Royal                       ██"
    echo "██    📊 Script Master de Inicialização Completa             ██"
    echo "██                                                            ██"
    echo "██    🔧 Backend    → http://localhost:3002                   ██"
    echo "██    📱 WhatsApp   → http://localhost:3003                   ██"
    echo "██    🎨 Frontend   → http://localhost:3000                   ██"
    echo "██                                                            ██"
    echo "████████████████████████████████████████████████████████████████"
    echo -e "${NC}"
    echo -e "${CYAN}📅 $(date)${NC}"
    echo -e "${CYAN}📍 Diretório: $PROJECT_ROOT${NC}"
    echo ""
}

# Função para verificar pré-requisitos
check_prerequisites() {
    echo -e "${YELLOW}🔍 Verificando pré-requisitos...${NC}"
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js não está instalado${NC}"
        echo -e "${YELLOW}💡 Instale Node.js: https://nodejs.org/${NC}"
        return 1
    fi
    
    local node_version=$(node --version)
    echo -e "${GREEN}✅ Node.js encontrado: $node_version${NC}"
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm não está instalado${NC}"
        return 1
    fi
    
    local npm_version=$(npm --version)
    echo -e "${GREEN}✅ npm encontrado: $npm_version${NC}"
    
    # Verificar se estamos no diretório correto
    if [ ! -f "$PROJECT_ROOT/backend_server_fixed.js" ]; then
        echo -e "${RED}❌ Erro: backend_server_fixed.js não encontrado${NC}"
        echo -e "${YELLOW}💡 Execute este script a partir do diretório do projeto SPR${NC}"
        return 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/whatsapp_server_real.js" ]; then
        echo -e "${RED}❌ Erro: whatsapp_server_real.js não encontrado${NC}"
        return 1
    fi
    
    if [ ! -d "$PROJECT_ROOT/frontend" ]; then
        echo -e "${RED}❌ Erro: Diretório frontend/ não encontrado${NC}"
        return 1
    fi
    
    # Criar diretórios necessários
    mkdir -p "$LOG_DIR" "$PROJECT_ROOT/sessions" "$PROJECT_ROOT/qrcodes"
    echo -e "${GREEN}✅ Diretórios necessários criados/verificados${NC}"
    
    # Verificar portas ocupadas
    local ports_in_use=()
    for port in $BACKEND_PORT $WHATSAPP_PORT $FRONTEND_PORT; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            ports_in_use+=($port)
        fi
    done
    
    if [ ${#ports_in_use[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Portas já em uso: ${ports_in_use[*]}${NC}"
        echo -e "${YELLOW}💡 Use a opção 5 (Parar Todos os Serviços) primeiro${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Todas as portas estão livres${NC}"
    echo ""
    return 0
}

# Função para aguardar serviço ficar online
wait_for_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-60}
    local counter=0
    
    echo -e "${YELLOW}⏳ Aguardando $service_name ficar online...${NC}"
    
    # Progress bar
    local progress=0
    local total=20
    
    while [ $counter -lt $timeout ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "\n${GREEN}✅ $service_name está online!${NC}"
            SERVICE_STATUS[$service_name]="online"
            return 0
        fi
        
        # Atualizar progress bar
        progress=$((counter * total / timeout))
        printf "\r${CYAN}["
        for ((i=0; i<progress; i++)); do printf "="; done
        for ((i=progress; i<total; i++)); do printf " "; done
        printf "] %d/%ds${NC}" $counter $timeout
        
        sleep 1
        ((counter++))
    done
    
    echo -e "\n${RED}❌ Timeout: $service_name não respondeu em ${timeout}s${NC}"
    SERVICE_STATUS[$service_name]="timeout"
    return 1
}

# Função para iniciar serviço específico
start_service() {
    local service_name=$1
    local script_path=$2
    local port=$3
    local health_url=$4
    
    echo -e "${BLUE}🚀 Iniciando $service_name (porta $port)...${NC}"
    SERVICE_STATUS[$service_name]="starting"
    SERVICE_START_TIME[$service_name]=$(date +%s)
    
    # Logs específicos para cada serviço
    local log_file="$LOG_DIR/spr_${service_name,,}.log"
    
    if [ "$DEBUG_MODE" = true ]; then
        echo -e "${CYAN}🐛 Modo debug ativo para $service_name${NC}"
        echo -e "${CYAN}📝 Log: $log_file${NC}"
    fi
    
    # Iniciar serviço em background
    cd "$PROJECT_ROOT"
    case $service_name in
        "Backend")
            node backend_server_fixed.js > "$log_file" 2>&1 &
            BACKEND_PID=$!
            ;;
        "WhatsApp")
            node whatsapp_server_real.js > "$log_file" 2>&1 &
            WHATSAPP_PID=$!
            ;;
        "Frontend")
            cd frontend
            npm start > "$log_file" 2>&1 &
            FRONTEND_PID=$!
            cd ..
            ;;
    esac
    
    local service_pid=$!
    echo -e "${GREEN}✅ $service_name iniciado (PID: $service_pid)${NC}"
    
    # Aguardar serviço ficar online
    if wait_for_service "$service_name" "$health_url" 90; then
        local start_time=${SERVICE_START_TIME[$service_name]}
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        echo -e "${GREEN}⚡ $service_name online em ${elapsed}s${NC}"
        return 0
    else
        echo -e "${RED}❌ Falha ao iniciar $service_name${NC}"
        SERVICE_STATUS[$service_name]="failed"
        return 1
    fi
}

# Função para mostrar status em tempo real
show_status() {
    clear
    show_banner
    
    echo -e "${BOLD}${PURPLE}📊 STATUS DOS SERVIÇOS${NC}"
    echo "=================================================="
    
    # Função helper para mostrar status colorido
    show_service_status() {
        local service=$1
        local port=$2
        local url=$3
        local status=${SERVICE_STATUS[$service]:-"stopped"}
        
        case $status in
            "online")
                echo -e "${GREEN}✅ $service${NC} - Porta $port - ${GREEN}ONLINE${NC}"
                echo -e "   🌐 $url"
                ;;
            "starting")
                echo -e "${YELLOW}🔄 $service${NC} - Porta $port - ${YELLOW}INICIANDO...${NC}"
                echo -e "   🌐 $url"
                ;;
            "failed")
                echo -e "${RED}❌ $service${NC} - Porta $port - ${RED}FALHOU${NC}"
                echo -e "   🌐 $url"
                ;;
            "timeout")
                echo -e "${RED}⏰ $service${NC} - Porta $port - ${RED}TIMEOUT${NC}"
                echo -e "   🌐 $url"
                ;;
            *)
                echo -e "${YELLOW}⏸️  $service${NC} - Porta $port - ${YELLOW}PARADO${NC}"
                echo -e "   🌐 $url"
                ;;
        esac
        echo ""
    }
    
    show_service_status "Backend" $BACKEND_PORT "$BACKEND_URL"
    show_service_status "WhatsApp" $WHATSAPP_PORT "$WHATSAPP_URL"
    show_service_status "Frontend" $FRONTEND_PORT "$FRONTEND_URL"
    
    echo "=================================================="
    
    # Mostrar tempo total decorrido
    local current_time=$(date +%s)
    local total_elapsed=$((current_time - START_TIME))
    echo -e "${CYAN}⏱️  Tempo total decorrido: ${total_elapsed}s${NC}"
    
    # Mostrar URLs importantes
    echo -e "${BOLD}${BLUE}🔗 LINKS IMPORTANTES:${NC}"
    echo -e "${GREEN}🎨 Frontend:${NC}     $FRONTEND_URL"
    echo -e "${GREEN}🔧 Backend:${NC}      $BACKEND_URL/api/health"
    echo -e "${GREEN}📱 WhatsApp:${NC}     $WHATSAPP_URL/qr"
    echo -e "${GREEN}📊 Logs:${NC}         $LOG_DIR/"
    echo ""
}

# Função para limpeza em caso de erro
cleanup() {
    echo -e "\n${YELLOW}🧹 Limpando processos...${NC}"
    
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${YELLOW}🔄 Parando Backend (PID: $BACKEND_PID)...${NC}"
        kill -TERM $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$WHATSAPP_PID" ] && kill -0 $WHATSAPP_PID 2>/dev/null; then
        echo -e "${YELLOW}🔄 Parando WhatsApp (PID: $WHATSAPP_PID)...${NC}"
        kill -TERM $WHATSAPP_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${YELLOW}🔄 Parando Frontend (PID: $FRONTEND_PID)...${NC}"
        kill -TERM $FRONTEND_PID 2>/dev/null
    fi
    
    echo -e "${GREEN}✅ Limpeza concluída${NC}"
    exit 1
}

# Instalar dependências se necessário
install_dependencies() {
    echo -e "${YELLOW}📦 Verificando dependências...${NC}"
    
    # Backend
    cd "$PROJECT_ROOT"
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependências do backend...${NC}"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Erro ao instalar dependências do backend${NC}"
            return 1
        fi
    fi
    
    # Frontend
    cd "$PROJECT_ROOT/frontend"
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependências do frontend...${NC}"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Erro ao instalar dependências do frontend${NC}"
            return 1
        fi
    fi
    
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✅ Dependências verificadas${NC}"
    return 0
}

# Função para inicialização completa
full_initialization() {
    echo -e "${BOLD}${GREEN}🚀 INICIALIZAÇÃO COMPLETA DO SPR${NC}"
    echo "=================================================="
    
    if ! check_prerequisites; then
        echo -e "${RED}❌ Pré-requisitos não atendidos${NC}"
        return 1
    fi
    
    if ! install_dependencies; then
        echo -e "${RED}❌ Erro na instalação de dependências${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📋 Sequência de inicialização:${NC}"
    echo -e "${BLUE}   1. Backend (porta 3002)${NC}"
    echo -e "${BLUE}   2. WhatsApp (porta 3003)${NC}"
    echo -e "${BLUE}   3. Frontend (porta 3000)${NC}"
    echo ""
    
    # Configurar trap para limpeza
    trap cleanup SIGINT SIGTERM
    
    # 1. Iniciar Backend
    if ! start_service "Backend" "backend_server_fixed.js" $BACKEND_PORT "$BACKEND_URL/api/health"; then
        echo -e "${RED}❌ Falha crítica: Backend não iniciou${NC}"
        cleanup
        return 1
    fi
    
    echo -e "${GREEN}✅ Backend iniciado com sucesso${NC}"
    echo ""
    
    # 2. Iniciar WhatsApp
    if ! start_service "WhatsApp" "whatsapp_server_real.js" $WHATSAPP_PORT "$WHATSAPP_URL/api/status"; then
        echo -e "${RED}❌ Falha crítica: WhatsApp Server não iniciou${NC}"
        cleanup
        return 1
    fi
    
    echo -e "${GREEN}✅ WhatsApp Server iniciado com sucesso${NC}"
    echo ""
    
    # 3. Iniciar Frontend
    if ! start_service "Frontend" "npm start" $FRONTEND_PORT "$FRONTEND_URL"; then
        echo -e "${RED}❌ Falha crítica: Frontend não iniciou${NC}"
        cleanup
        return 1
    fi
    
    echo -e "${GREEN}✅ Frontend iniciado com sucesso${NC}"
    echo ""
    
    # Mostrar status final
    show_status
    
    echo -e "${BOLD}${GREEN}🎉 TODOS OS SERVIÇOS SPR ESTÃO ONLINE!${NC}"
    echo "=================================================="
    echo -e "${GREEN}🎯 Sistema pronto para uso${NC}"
    echo -e "${YELLOW}💡 Pressione Ctrl+C para parar todos os serviços${NC}"
    echo -e "${CYAN}📝 Logs disponíveis em: $LOG_DIR/${NC}"
    echo ""
    
    # Aguardar indefinidamente (até Ctrl+C)
    while true; do
        sleep 5
        # Verificar se todos os serviços ainda estão rodando
        if ! curl -s "$BACKEND_URL/api/health" >/dev/null 2>&1; then
            echo -e "${RED}⚠️  Backend não está respondendo!${NC}"
        fi
        if ! curl -s "$WHATSAPP_URL/api/status" >/dev/null 2>&1; then
            echo -e "${RED}⚠️  WhatsApp Server não está respondendo!${NC}"
        fi
        if ! curl -s "$FRONTEND_URL" >/dev/null 2>&1; then
            echo -e "${RED}⚠️  Frontend não está respondendo!${NC}"
        fi
    done
}

# Função para inicialização individual
individual_initialization() {
    echo -e "${BOLD}${YELLOW}🎯 INICIALIZAÇÃO INDIVIDUAL${NC}"
    echo "=================================================="
    echo "Escolha o serviço para iniciar:"
    echo ""
    echo "1) Backend (porta 3002)"
    echo "2) WhatsApp Server (porta 3003)"
    echo "3) Frontend (porta 3000)"
    echo "4) Voltar ao menu principal"
    echo ""
    read -p "Opção: " choice
    
    case $choice in
        1)
            echo -e "${BLUE}🔧 Iniciando apenas o Backend...${NC}"
            if check_prerequisites && install_dependencies; then
                start_service "Backend" "backend_server_fixed.js" $BACKEND_PORT "$BACKEND_URL/api/health"
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ Backend iniciado com sucesso!${NC}"
                    echo -e "${GREEN}🌐 Acesse: $BACKEND_URL${NC}"
                    echo -e "${YELLOW}💡 Pressione Ctrl+C para parar${NC}"
                    wait
                fi
            fi
            ;;
        2)
            echo -e "${BLUE}📱 Iniciando apenas o WhatsApp Server...${NC}"
            if check_prerequisites && install_dependencies; then
                start_service "WhatsApp" "whatsapp_server_real.js" $WHATSAPP_PORT "$WHATSAPP_URL/api/status"
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ WhatsApp Server iniciado com sucesso!${NC}"
                    echo -e "${GREEN}🌐 Acesse: $WHATSAPP_URL${NC}"
                    echo -e "${GREEN}📱 QR Code: $WHATSAPP_URL/qr${NC}"
                    echo -e "${YELLOW}💡 Pressione Ctrl+C para parar${NC}"
                    wait
                fi
            fi
            ;;
        3)
            echo -e "${BLUE}🎨 Iniciando apenas o Frontend...${NC}"
            if check_prerequisites && install_dependencies; then
                start_service "Frontend" "npm start" $FRONTEND_PORT "$FRONTEND_URL"
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ Frontend iniciado com sucesso!${NC}"
                    echo -e "${GREEN}🌐 Acesse: $FRONTEND_URL${NC}"
                    echo -e "${YELLOW}💡 Pressione Ctrl+C para parar${NC}"
                    wait
                fi
            fi
            ;;
        4)
            return 0
            ;;
        *)
            echo -e "${RED}❌ Opção inválida${NC}"
            ;;
    esac
}

# Função para modo debug
debug_mode() {
    DEBUG_MODE=true
    echo -e "${BOLD}${PURPLE}🐛 MODO DEBUG ATIVADO${NC}"
    echo "=================================================="
    echo -e "${CYAN}📝 Logs detalhados serão exibidos${NC}"
    echo -e "${CYAN}🔍 Verificações extras serão realizadas${NC}"
    echo ""
    
    full_initialization
}

# Função para parar todos os serviços
stop_all_services() {
    echo -e "${BOLD}${RED}🛑 PARANDO TODOS OS SERVIÇOS SPR${NC}"
    echo "=================================================="
    
    # Executar script de parada
    if [ -f "$SCRIPT_DIR/stop-all.sh" ]; then
        bash "$SCRIPT_DIR/stop-all.sh"
    else
        echo -e "${YELLOW}⚠️  Script stop-all.sh não encontrado${NC}"
        echo -e "${YELLOW}🔧 Parando serviços manualmente...${NC}"
        
        for port in $FRONTEND_PORT $BACKEND_PORT $WHATSAPP_PORT; do
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo -e "${YELLOW}🔄 Parando serviço na porta $port...${NC}"
                pids=$(lsof -Pi :$port -sTCP:LISTEN -t)
                for pid in $pids; do
                    kill -TERM $pid 2>/dev/null
                    sleep 2
                    if kill -0 $pid 2>/dev/null; then
                        kill -KILL $pid 2>/dev/null
                    fi
                done
                echo -e "${GREEN}✅ Serviço na porta $port parado${NC}"
            else
                echo -e "${GREEN}✅ Porta $port já está livre${NC}"
            fi
        done
    fi
    
    echo -e "${GREEN}✅ Todos os serviços foram parados${NC}"
}

# Menu principal
show_menu() {
    while true; do
        show_banner
        
        echo -e "${BOLD}${CYAN}📋 MENU DE OPÇÕES${NC}"
        echo "=================================================="
        echo ""
        echo "1) 🚀 Inicialização Completa (recomendado)"
        echo "2) 🎯 Inicialização Individual"
        echo "3) 🐛 Modo Debug (logs detalhados)"
        echo "4) 📊 Verificar Status"
        echo "5) 🛑 Parar Todos os Serviços"
        echo "6) ❌ Sair"
        echo ""
        echo "=================================================="
        read -p "Escolha uma opção [1-6]: " option
        
        case $option in
            1)
                full_initialization
                ;;
            2)
                individual_initialization
                ;;
            3)
                debug_mode
                ;;
            4)
                show_status
                echo ""
                read -p "Pressione Enter para continuar..."
                ;;
            5)
                stop_all_services
                echo ""
                read -p "Pressione Enter para continuar..."
                ;;
            6)
                echo -e "${GREEN}👋 Até logo!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Opção inválida. Tente novamente.${NC}"
                sleep 2
                ;;
        esac
    done
}

# Função principal
main() {
    # Verificar se foi executado com argumentos
    if [ $# -gt 0 ]; then
        case $1 in
            --full|--complete|-f)
                show_banner
                full_initialization
                ;;
            --debug|-d)
                show_banner
                debug_mode
                ;;
            --status|-s)
                show_status
                ;;
            --stop)
                stop_all_services
                ;;
            --help|-h)
                show_banner
                echo -e "${CYAN}📚 Uso do script:${NC}"
                echo ""
                echo "  $0                    # Menu interativo"
                echo "  $0 --full             # Inicialização completa"
                echo "  $0 --debug            # Modo debug"
                echo "  $0 --status           # Verificar status"
                echo "  $0 --stop             # Parar todos os serviços"
                echo "  $0 --help             # Mostrar esta ajuda"
                echo ""
                ;;
            *)
                echo -e "${RED}❌ Opção inválida: $1${NC}"
                echo -e "${YELLOW}💡 Use $0 --help para ver as opções disponíveis${NC}"
                exit 1
                ;;
        esac
    else
        # Menu interativo
        show_menu
    fi
}

# Inicializar variáveis de status
SERVICE_STATUS["Backend"]="stopped"
SERVICE_STATUS["WhatsApp"]="stopped"
SERVICE_STATUS["Frontend"]="stopped"

# Executar função principal
main "$@"