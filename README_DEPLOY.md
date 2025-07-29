esta# 🌐 SPR 1.1 - Guia de Deploy Remoto

## 📋 Visão Geral

Este guia explica como fazer deploy do **SPR WhatsApp** para acesso remoto usando **DigitalOcean** e **GitHub Actions**, seguindo as **premissas estratégicas SPR** de execução 100% real.

## 🚀 Opções de Deploy

### 1. **Deploy Automatizado com Script** (Recomendado)
```bash
# Executar deploy completo
./deploy_digitalocean.sh

# Configurar SSL depois
./deploy_digitalocean.sh ssl

# Verificar status
./deploy_digitalocean.sh status
```

### 2. **Deploy Automático via GitHub Actions**
- Push para branch `main` ou `master`
- Deploy automático com CI/CD
- Testes automatizados incluídos

### 3. **Deploy Manual com Docker Compose**
```bash
# No servidor remoto
docker-compose up -d
```

## 🔧 Pré-requisitos

### **Para Deploy Automatizado:**
```bash
# Instalar DigitalOcean CLI
sudo snap install doctl

# Autenticar
doctl auth init

# Verificar
doctl account get
```

### **Para GitHub Actions:**
Configurar secrets no repositório:
- `DIGITALOCEAN_ACCESS_TOKEN`
- `SSH_PRIVATE_KEY`
- `SSH_KEY_ID`
- `DROPLET_IP` (opcional)

## 📊 Custos DigitalOcean

| Configuração | vCPUs | RAM | Preço/mês | Recomendado |
|-------------|-------|-----|-----------|-------------|
| Basic | 1 | 1GB | $6 | ❌ Não |
| **Standard** | 2 | 4GB | $24 | ✅ **Sim** |
| Performance | 4 | 8GB | $48 | ⚡ Alta demanda |

## 🌐 Acessos Após Deploy

### **URLs Principais:**
```
🏠 Interface Principal:    http://SEU-IP/
📱 WhatsApp Interface:     http://SEU-IP/whatsapp/
🔧 API Backend:           http://SEU-IP/api/
📊 Health Check:          http://SEU-IP/health
📈 Nginx Status:          http://SEU-IP/nginx_status
```

### **Endpoints API:**
```
GET  /health                    - Status geral
GET  /api/status               - Status WhatsApp
GET  /api/qr                   - QR Code atual
POST /api/send                 - Enviar mensagem
POST /api/send-media          - Enviar mídia
POST /api/broadcast           - Envio em massa
GET  /api/contacts            - Lista de contatos
GET  /api/chats               - Lista de conversas
```

## 🔐 Configuração SSL/HTTPS

### **Automática (Let's Encrypt):**
```bash
# Após deploy
./deploy_digitalocean.sh ssl
```

### **Manual:**
```bash
# No servidor
certbot --nginx -d seudominio.com
```

## 📱 Conectando WhatsApp

1. **Acessar interface:** `http://SEU-IP/`
2. **Aguardar QR Code** aparecer
3. **Escanear com WhatsApp:**
   - Abrir WhatsApp no celular
   - Ir em **Configurações** > **Dispositivos Conectados**
   - Tocar em **Conectar um dispositivo**
   - Escanear o QR Code
4. **Aguardar conexão** ser estabelecida

## 🔧 Comandos Úteis

### **Gerenciamento do Servidor:**
```bash
# SSH no servidor
ssh root@SEU-IP

# Ver logs
docker-compose logs -f

# Reiniciar serviços
docker-compose restart

# Parar tudo
docker-compose down

# Iniciar novamente
docker-compose up -d

# Status dos containers
docker-compose ps
```

### **Monitoramento:**
```bash
# Logs do WhatsApp
docker-compose logs whatsapp-server

# Logs do Backend
docker-compose logs spr-backend

# Logs do Nginx
docker-compose logs nginx

# Uso de recursos
docker stats
```

## 🏗️ Estrutura de Arquivos no Servidor

```
/opt/spr/
├── docker-compose.yml      # Configuração dos serviços
├── nginx.conf             # Configuração do Nginx
├── sessions/              # Sessões do WhatsApp
├── logs/                  # Logs do sistema
├── media/                 # Mídias enviadas/recebidas
├── qrcodes/              # QR Codes gerados
├── data/                 # Dados da aplicação
└── ssl/                  # Certificados SSL
```

## 🔍 Troubleshooting

### **WhatsApp não conecta:**
```bash
# Verificar logs
docker-compose logs whatsapp-server

# Limpar sessão
rm -rf sessions/*
docker-compose restart whatsapp-server
```

### **API não responde:**
```bash
# Verificar backend
curl http://SEU-IP/health

# Reiniciar backend
docker-compose restart spr-backend
```

### **Nginx não funciona:**
```bash
# Verificar configuração
nginx -t

# Reiniciar nginx
docker-compose restart nginx
```

### **Problemas de SSL:**
```bash
# Verificar certificados
certbot certificates

# Renovar certificados
certbot renew
```

## 🔄 Atualizações

### **Via GitHub Actions:**
- Fazer push para `main`
- Deploy automático

### **Manual:**
```bash
# Atualizar imagens
docker-compose pull

# Reiniciar com novas imagens
docker-compose up -d
```

## 🛡️ Segurança

### **Firewall Configurado:**
- **SSH (22):** Acesso administrativo
- **HTTP (80):** Acesso web
- **HTTPS (443):** Acesso seguro

### **Rate Limiting:**
- **API:** 10 req/s
- **WhatsApp:** 5 req/s

### **Headers de Segurança:**
- HSTS habilitado
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

## 📈 Monitoramento

### **Health Checks:**
```bash
# Status geral
curl http://SEU-IP/health

# Status específico do WhatsApp
curl http://SEU-IP/api/status
```

### **Logs Centralizados:**
```bash
# Todos os logs
docker-compose logs -f

# Logs específicos
docker-compose logs -f whatsapp-server
```

## 🆘 Suporte

### **Logs Importantes:**
```bash
# Localização dos logs
/opt/spr/logs/

# Estrutura:
├── whatsapp.log          # Logs do WhatsApp
├── backend.log           # Logs do Backend
├── nginx/access.log      # Logs de acesso
└── nginx/error.log       # Logs de erro
```

### **Backup Automático:**
```bash
# Backup das sessões (importante!)
tar -czf backup-$(date +%Y%m%d).tar.gz sessions/ data/

# Restaurar backup
tar -xzf backup-YYYYMMDD.tar.gz
```

## 🎯 Próximos Passos

1. **✅ Deploy realizado**
2. **📱 WhatsApp conectado**
3. **🔐 SSL configurado**
4. **📊 Monitoramento ativo**
5. **🔄 Atualizações automáticas**

---

**🌾 SPR 1.1 - Sistema de Previsão Rural**  
*Execução 100% real com GitHub + DigitalOcean* 