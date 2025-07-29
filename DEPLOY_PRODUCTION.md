# 🚀 Deploy em Produção - SPR WhatsApp

## 📋 Pré-requisitos

### Servidor
- **Ubuntu 20.04+ ou CentOS 8+**
- **Mínimo 4GB RAM, 2 CPU cores**
- **20GB de espaço em disco**
- **Acesso root (sudo)**

### Domínio
- **Domínio configurado**: `whatsapp.royalnegociosagricolas.com.br`
- **DNS apontando para o servidor**
- **Portas liberadas**: 80, 443, 22

### Dependências
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version
```

## 🔧 Configuração Inicial

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/spr-1.1.git
cd spr-1.1/SPR
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp config/production.env.example config/production.env

# Editar configurações
nano config/production.env
```

**Configurações importantes:**
- `DOMAIN`: Seu domínio
- `POSTGRES_PASSWORD`: Senha segura do banco
- `REDIS_PASSWORD`: Senha segura do Redis
- `SESSION_SECRET`: Chave secreta para sessões
- `JWT_SECRET`: Chave secreta para JWT
- `ADMIN_EMAIL`: Email do administrador

### 3. Configurar DNS
Certifique-se que o domínio está apontando para o IP do servidor:
```bash
nslookup whatsapp.royalnegociosagricolas.com.br
```

## 🚀 Deploy Automatizado

### Deploy Completo
```bash
sudo ./deploy.sh deploy
```

Este comando irá:
1. ✅ Verificar dependências
2. 💾 Fazer backup dos dados existentes
3. 🔒 Configurar SSL/HTTPS
4. 🔥 Configurar firewall
5. 🐳 Deploy da aplicação
6. ✅ Verificar deployment
7. 📊 Configurar monitoramento
8. ⏰ Configurar tarefas automáticas

### Comandos Úteis
```bash
# Ver status dos serviços
sudo ./deploy.sh status

# Ver logs
sudo ./deploy.sh logs
sudo ./deploy.sh logs nginx

# Fazer backup manual
sudo ./deploy.sh backup

# Reiniciar serviços
sudo ./deploy.sh restart
sudo ./deploy.sh restart whatsapp-app

# Parar todos os serviços
sudo ./deploy.sh stop
```

## 🏗️ Deploy Manual (Avançado)

### 1. Build da Aplicação
```bash
docker-compose -f docker-compose.production.yml build --no-cache
```

### 2. Iniciar Serviços
```bash
docker-compose -f docker-compose.production.yml up -d
```

### 3. Configurar SSL
```bash
# Gerar certificado Let's Encrypt
docker-compose -f docker-compose.production.yml run --rm certbot

# Verificar certificado
docker-compose -f docker-compose.production.yml exec nginx nginx -t
docker-compose -f docker-compose.production.yml restart nginx
```

### 4. Verificar Deployment
```bash
# Verificar serviços
docker-compose -f docker-compose.production.yml ps

# Testar conectividade
curl -I https://whatsapp.royalnegociosagricolas.com.br

# Ver logs
docker-compose -f docker-compose.production.yml logs -f whatsapp-app
```

## 📊 Monitoramento

### Serviços Disponíveis
- **Aplicação**: `https://whatsapp.royalnegociosagricolas.com.br`
- **Prometheus**: `http://whatsapp.royalnegociosagricolas.com.br:9090`
- **Grafana**: `http://whatsapp.royalnegociosagricolas.com.br:3001`

### Health Checks
```bash
# Status da aplicação
curl https://whatsapp.royalnegociosagricolas.com.br/health

# Métricas
curl https://whatsapp.royalnegociosagricolas.com.br/metrics
```

### Logs
```bash
# Logs da aplicação
docker-compose -f docker-compose.production.yml logs -f whatsapp-app

# Logs do Nginx
docker-compose -f docker-compose.production.yml logs -f nginx

# Logs do sistema
tail -f /var/log/spr-deploy.log
```

## 🔒 Segurança

### SSL/HTTPS
- ✅ Certificado Let's Encrypt automático
- ✅ Renovação automática (cron job)
- ✅ Redirecionamento HTTP → HTTPS
- ✅ Headers de segurança

### Firewall
```bash
# Verificar regras UFW
sudo ufw status

# Regras configuradas:
# 22/tcp   - SSH
# 80/tcp   - HTTP
# 443/tcp  - HTTPS
# 9090/tcp - Prometheus
```

### Backup Automático
- ✅ Backup diário às 2:00 AM
- ✅ Retenção de 7 dias
- ✅ Backup de sessões, mídia e banco

## 🔄 Manutenção

### Atualizações
```bash
# Atualizar código
git pull origin main

# Rebuild e restart
sudo ./deploy.sh deploy
```

### Backup/Restore
```bash
# Backup manual
sudo ./deploy.sh backup

# Restore (manual)
docker run --rm -v whatsapp_sessions:/data -v /opt/spr-backups/20250710_120000:/backup alpine tar xzf /backup/sessions.tar.gz -C /data
```

### Limpeza
```bash
# Limpar containers não utilizados
docker system prune -f

# Limpar volumes órfãos
docker volume prune -f
```

## 🆘 Troubleshooting

### Problemas Comuns

#### 1. Erro de SSL
```bash
# Verificar certificado
docker-compose -f docker-compose.production.yml run --rm certbot certificates

# Renovar certificado
docker-compose -f docker-compose.production.yml run --rm certbot renew
```

#### 2. Aplicação não responde
```bash
# Verificar logs
docker-compose -f docker-compose.production.yml logs whatsapp-app

# Reiniciar serviço
docker-compose -f docker-compose.production.yml restart whatsapp-app
```

#### 3. Erro de banco de dados
```bash
# Verificar PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres psql -U spr_user -d spr_whatsapp -c "SELECT 1;"

# Restaurar backup
docker exec -i spr-postgres-prod psql -U spr_user spr_whatsapp < /opt/spr-backups/20250710_120000/database.sql
```

#### 4. Erro de sessão WhatsApp
```bash
# Limpar sessão
docker-compose -f docker-compose.production.yml down
docker volume rm whatsapp_sessions
docker-compose -f docker-compose.production.yml up -d
```

### Contato Suporte
- **Email**: admin@royalnegociosagricolas.com.br
- **Logs**: `/var/log/spr-deploy.log`
- **Monitoramento**: Prometheus + Grafana

## 📈 Performance

### Otimizações Aplicadas
- ✅ Nginx com gzip compression
- ✅ Cache de arquivos estáticos
- ✅ Rate limiting
- ✅ Connection pooling
- ✅ Logs estruturados

### Métricas Importantes
- **Tempo de resposta**: < 200ms
- **Uptime**: > 99.9%
- **Uso de memória**: < 2GB
- **Uso de CPU**: < 50%

## 🎯 Próximos Passos

1. **Configurar domínio DNS**
2. **Executar deploy**: `sudo ./deploy.sh deploy`
3. **Verificar funcionamento**
4. **Configurar monitoramento**
5. **Testar backup/restore**

---

**✅ Pronto para produção!** 🚀

O SPR WhatsApp está configurado para funcionar 24/7 em produção com:
- **SSL/HTTPS automático**
- **Backup automático**
- **Monitoramento completo**
- **Alta disponibilidade**
- **Segurança avançada** 