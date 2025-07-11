#!/bin/bash
# 📦 SPR 1.1 - Script de Deploy DigitalOcean
# Automatiza o deploy completo do sistema no DigitalOcean

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Configurações
DROPLET_NAME="spr-whatsapp-server"
DROPLET_SIZE="s-2vcpu-4gb"
DROPLET_IMAGE="docker-20-04"
DROPLET_REGION="nyc1"
SSH_KEY_NAME="spr-deploy-key"

# Verificar dependências
check_dependencies() {
    log_info "Verificando dependências..."
    
    # Verificar doctl
    if ! command -v doctl &> /dev/null; then
        log_error "doctl não está instalado. Instale com: sudo snap install doctl"
        exit 1
    fi
    
    # Verificar docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi
    
    # Verificar git
    if ! command -v git &> /dev/null; then
        log_error "Git não está instalado"
        exit 1
    fi
    
    log_success "Dependências verificadas"
}

# Configurar DigitalOcean
setup_digitalocean() {
    log_info "Configurando DigitalOcean..."
    
    # Verificar autenticação
    if ! doctl account get &> /dev/null; then
        log_error "DigitalOcean não está autenticado"
        log_info "Execute: doctl auth init"
        exit 1
    fi
    
    log_success "DigitalOcean configurado"
}

# Criar chave SSH se não existir
create_ssh_key() {
    log_info "Verificando chave SSH..."
    
    if ! doctl compute ssh-key list --format Name --no-header | grep -q "$SSH_KEY_NAME"; then
        log_info "Criando nova chave SSH..."
        
        # Gerar chave SSH
        ssh-keygen -t rsa -b 4096 -f ~/.ssh/$SSH_KEY_NAME -N "" -C "spr-deploy@digitalocean"
        
        # Adicionar ao DigitalOcean
        doctl compute ssh-key import $SSH_KEY_NAME --public-key-file ~/.ssh/${SSH_KEY_NAME}.pub
        
        log_success "Chave SSH criada e adicionada"
    else
        log_success "Chave SSH já existe"
    fi
}

# Criar Droplet
create_droplet() {
    log_info "Verificando Droplet..."
    
    # Verificar se droplet já existe
    if doctl compute droplet list --format Name --no-header | grep -q "$DROPLET_NAME"; then
        log_warning "Droplet $DROPLET_NAME já existe"
        DROPLET_IP=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep "$DROPLET_NAME" | awk '{print $2}')
        log_info "IP do Droplet: $DROPLET_IP"
        return 0
    fi
    
    log_info "Criando Droplet $DROPLET_NAME..."
    
    # Criar droplet
    doctl compute droplet create $DROPLET_NAME \
        --size $DROPLET_SIZE \
        --image $DROPLET_IMAGE \
        --region $DROPLET_REGION \
        --ssh-keys $(doctl compute ssh-key list --format ID --no-header | grep -v "^$" | tr '\n' ',') \
        --enable-monitoring \
        --enable-ipv6 \
        --wait
    
    # Obter IP
    DROPLET_IP=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep "$DROPLET_NAME" | awk '{print $2}')
    
    log_success "Droplet criado com IP: $DROPLET_IP"
    
    # Aguardar SSH ficar disponível
    log_info "Aguardando SSH ficar disponível..."
    while ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH ready'" &> /dev/null; do
        sleep 5
        echo -n "."
    done
    echo ""
    log_success "SSH disponível"
}

# Configurar servidor
setup_server() {
    log_info "Configurando servidor..."
    
    # Script de configuração remota
    ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'EOF'
        # Atualizar sistema
        apt-get update && apt-get upgrade -y
        
        # Instalar dependências
        apt-get install -y curl git nginx certbot python3-certbot-nginx
        
        # Configurar firewall
        ufw allow OpenSSH
        ufw allow 80
        ufw allow 443
        ufw --force enable
        
        # Configurar Docker (já vem instalado na imagem)
        systemctl enable docker
        systemctl start docker
        
        # Instalar Docker Compose
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        
        # Criar diretório do projeto
        mkdir -p /opt/spr
        chown root:root /opt/spr
EOF
    
    log_success "Servidor configurado"
}

# Deploy da aplicação
deploy_application() {
    log_info "Fazendo deploy da aplicação..."
    
    # Criar arquivo temporário com docker-compose
    cat > /tmp/docker-compose.prod.yml << EOF
version: '3.8'

services:
  whatsapp-server:
    image: spr-whatsapp:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DEBUG=false
    volumes:
      - ./sessions:/app/sessions
      - ./logs:/app/logs
      - ./media:/app/media
      - ./qrcodes:/app/qrcodes
    restart: unless-stopped
    networks:
      - spr-network

  spr-backend:
    image: spr-backend:latest
    ports:
      - "8000:8000"
    environment:
      - SPR_ENVIRONMENT=production
      - DEBUG=false
      - WHATSAPP_SERVER_URL=http://whatsapp-server:3000
    depends_on:
      - whatsapp-server
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    restart: unless-stopped
    networks:
      - spr-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - whatsapp-server
      - spr-backend
    restart: unless-stopped
    networks:
      - spr-network

networks:
  spr-network:
    driver: bridge
EOF

    # Copiar arquivos para o servidor
    scp -o StrictHostKeyChecking=no /tmp/docker-compose.prod.yml root@$DROPLET_IP:/opt/spr/docker-compose.yml
    scp -o StrictHostKeyChecking=no nginx.conf root@$DROPLET_IP:/opt/spr/
    
    # Build e push das imagens (simplificado - usar registry)
    log_info "Construindo imagens Docker..."
    
    # Build WhatsApp Server
    docker build -t spr-whatsapp:latest ./whatsapp_server/
    
    # Build Backend
    docker build -t spr-backend:latest .
    
    # Salvar imagens e transferir
    docker save spr-whatsapp:latest | ssh root@$DROPLET_IP "docker load"
    docker save spr-backend:latest | ssh root@$DROPLET_IP "docker load"
    
    # Iniciar serviços no servidor
    ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'EOF'
        cd /opt/spr
        
        # Criar diretórios necessários
        mkdir -p sessions logs media qrcodes data ssl
        
        # Iniciar serviços
        docker-compose up -d
        
        # Verificar status
        docker-compose ps
EOF
    
    log_success "Deploy concluído"
}

# Configurar SSL
setup_ssl() {
    log_info "Configurando SSL com Let's Encrypt..."
    
    read -p "Digite seu domínio (ex: spr.yourdomain.com): " DOMAIN
    
    if [[ -n "$DOMAIN" ]]; then
        ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << EOF
            # Obter certificado SSL
            certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
            
            # Configurar renovação automática
            echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
EOF
        log_success "SSL configurado para $DOMAIN"
    else
        log_warning "SSL não configurado - domínio não fornecido"
    fi
}

# Mostrar informações finais
show_final_info() {
    log_success "Deploy concluído com sucesso!"
    echo ""
    echo "🌐 Informações de Acesso:"
    echo "   IP do Servidor: $DROPLET_IP"
    echo "   Interface WhatsApp: http://$DROPLET_IP"
    echo "   API Backend: http://$DROPLET_IP/api"
    echo "   Health Check: http://$DROPLET_IP/health"
    echo ""
    echo "🔧 Comandos úteis:"
    echo "   SSH: ssh root@$DROPLET_IP"
    echo "   Logs: ssh root@$DROPLET_IP 'cd /opt/spr && docker-compose logs -f'"
    echo "   Restart: ssh root@$DROPLET_IP 'cd /opt/spr && docker-compose restart'"
    echo ""
    echo "📱 Para conectar WhatsApp:"
    echo "   1. Acesse http://$DROPLET_IP"
    echo "   2. Escaneie o QR Code com seu WhatsApp"
    echo "   3. Aguarde a conexão ser estabelecida"
    echo ""
    echo "🔒 Para configurar domínio personalizado:"
    echo "   1. Aponte seu domínio para $DROPLET_IP"
    echo "   2. Execute novamente com --ssl"
}

# Função principal
main() {
    echo "🌾 SPR 1.1 - Deploy DigitalOcean"
    echo "=================================="
    
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            setup_digitalocean
            create_ssh_key
            create_droplet
            setup_server
            deploy_application
            show_final_info
            ;;
        "ssl")
            if [[ -z "$DROPLET_IP" ]]; then
                DROPLET_IP=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep "$DROPLET_NAME" | awk '{print $2}')
            fi
            setup_ssl
            ;;
        "destroy")
            log_warning "Destruindo Droplet $DROPLET_NAME..."
            doctl compute droplet delete $DROPLET_NAME --force
            log_success "Droplet destruído"
            ;;
        "status")
            if doctl compute droplet list --format Name --no-header | grep -q "$DROPLET_NAME"; then
                DROPLET_IP=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep "$DROPLET_NAME" | awk '{print $2}')
                log_info "Droplet Status: RUNNING"
                log_info "IP: $DROPLET_IP"
                log_info "WhatsApp: http://$DROPLET_IP"
            else
                log_warning "Droplet não encontrado"
            fi
            ;;
        *)
            echo "Uso: $0 [deploy|ssl|destroy|status]"
            echo ""
            echo "Comandos:"
            echo "  deploy  - Deploy completo (padrão)"
            echo "  ssl     - Configurar SSL/HTTPS"
            echo "  destroy - Destruir droplet"
            echo "  status  - Verificar status"
            exit 1
            ;;
    esac
}

# Executar
main "$@" 