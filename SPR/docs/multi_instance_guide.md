# 🌐 SPR Multi-Instance WhatsApp Server

## Visão Geral

O SPR Multi-Instance WhatsApp Server permite que múltiplas contas WhatsApp sejam executadas simultaneamente em um único servidor, ideal para:

- **Múltiplas empresas** usando o mesmo sistema
- **Diferentes departamentos** com WhatsApp separados
- **Escalabilidade** para atender mais clientes
- **Redundância** e alta disponibilidade

## 🚀 Funcionalidades

### ✅ Suporte Completo Multi-Instância
- Cada instância tem sua própria sessão WhatsApp
- Isolamento completo entre contas
- QR Codes individuais para cada instância
- Logs separados por instância

### ✅ Interface Web Intuitiva
- Painel de controle para gerenciar instâncias
- Visualização de status em tempo real
- Criação/remoção de instâncias via web
- QR Codes acessíveis via browser

### ✅ API RESTful Completa
- Endpoints para gerenciar instâncias
- Envio de mensagens por instância
- Consulta de mensagens e contatos
- Integração fácil com outros sistemas

## 🔧 Instalação e Configuração

### Pré-requisitos
```bash
# Node.js 16+ instalado
node --version

# NPM ou Yarn
npm --version
```

### Instalação
```bash
# Navegar para o diretório do WhatsApp server
cd SPR/whatsapp_server

# Instalar dependências
npm install

# Iniciar servidor multi-instância
npm run multi
```

### Configuração de Ambiente
```bash
# Criar arquivo .env (opcional)
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
```

## 📱 Como Usar

### 1. Iniciar o Servidor
```bash
# Desenvolvimento
npm run multi-dev

# Produção
npm run multi
```

### 2. Acessar Interface Web
```
http://localhost:3000
```

### 3. Criar Nova Instância
1. Acesse a interface web
2. Preencha o formulário:
   - **ID da Sessão**: Identificador único (ex: "empresa1", "vendas", "suporte")
   - **Nome do Cliente**: Nome descritivo (ex: "Empresa ABC", "Departamento Vendas")
3. Clique em "Criar Instância"

### 4. Conectar WhatsApp
1. Clique em "Ver QR Code" na instância criada
2. Escaneie o QR Code com seu WhatsApp
3. Aguarde a confirmação de conexão

## 🔗 API Endpoints

### Gerenciamento de Instâncias

#### Listar Instâncias
```http
GET /api/instances
```

**Resposta:**
```json
[
  {
    "sessionId": "empresa1",
    "clientName": "Empresa ABC",
    "isReady": true,
    "isActive": true,
    "contactsCount": 150,
    "messagesCount": 45,
    "lastActivity": "2025-01-10T15:30:00Z"
  }
]
```

#### Criar Instância
```http
POST /api/instances
Content-Type: application/json

{
  "sessionId": "nova_empresa",
  "clientName": "Nova Empresa Ltda"
}
```

#### Remover Instância
```http
DELETE /api/instances/{sessionId}
```

### Mensagens

#### Enviar Mensagem
```http
POST /api/instances/{sessionId}/send
Content-Type: application/json

{
  "to": "5511999999999@c.us",
  "message": "Olá! Previsão da soja para hoje..."
}
```

#### Obter Mensagens
```http
GET /api/instances/{sessionId}/messages
```

### QR Code

#### Visualizar QR Code
```http
GET /qr/{sessionId}
```

## 🌐 Deploy na Internet

### Opção 1: DigitalOcean Droplet

```bash
# 1. Criar Droplet Ubuntu 22.04
# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar PM2 para gerenciamento de processos
npm install -g pm2

# 4. Clonar repositório
git clone https://github.com/seu-usuario/spr-1.1.git
cd spr-1.1/SPR/whatsapp_server

# 5. Instalar dependências
npm install

# 6. Iniciar com PM2
pm2 start multi_instance_server.js --name "spr-multi"
pm2 startup
pm2 save
```

### Opção 2: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "multi_instance_server.js"]
```

```bash
# Build e run
docker build -t spr-multi .
docker run -d -p 3000:3000 -v $(pwd)/sessions:/app/sessions spr-multi
```

### Opção 3: Heroku

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login e criar app
heroku login
heroku create spr-multi-whatsapp

# Deploy
git push heroku master
```

## 🔒 Segurança Multi-Instância

### Isolamento de Sessões
- Cada instância tem diretório próprio em `./sessions/{sessionId}/`
- Não há compartilhamento de dados entre instâncias
- Logs separados por instância

### Autenticação
- Cada WhatsApp precisa ser autenticado individualmente
- QR Codes únicos por instância
- Sessões persistem entre reinicializações

### Limitações
- WhatsApp Web limita 4 dispositivos conectados por conta
- Cada instância conta como 1 dispositivo
- Recomendado máximo 3-4 instâncias por servidor

## 📊 Monitoramento

### Logs
```bash
# Logs em tempo real
tail -f logs/combined.log

# Logs por instância
tail -f logs/instance_empresa1.log
```

### Métricas
- Status de conexão por instância
- Número de mensagens processadas
- Última atividade
- Contatos carregados

### Alertas
- Desconexões automáticas
- Falhas de autenticação
- Erros de envio de mensagem

## 🚨 Cenários de Uso

### Cenário 1: Múltiplas Empresas
```
Servidor na Internet
├── Instância "empresa_a" (WhatsApp A)
├── Instância "empresa_b" (WhatsApp B)
└── Instância "empresa_c" (WhatsApp C)
```

### Cenário 2: Departamentos
```
Empresa XYZ
├── Instância "vendas" (WhatsApp Vendas)
├── Instância "suporte" (WhatsApp Suporte)
└── Instância "financeiro" (WhatsApp Financeiro)
```

### Cenário 3: Regiões
```
Agronegócio Nacional
├── Instância "sul" (WhatsApp Região Sul)
├── Instância "sudeste" (WhatsApp Região Sudeste)
└── Instância "centro_oeste" (WhatsApp Centro-Oeste)
```

## 🔧 Troubleshooting

### Instância não conecta
1. Verificar se WhatsApp Web não está aberto em outro lugar
2. Gerar novo QR Code
3. Verificar logs da instância

### Mensagens não enviam
1. Verificar se instância está "ready"
2. Verificar formato do número de telefone
3. Verificar se contato existe

### Performance
1. Limitar número de instâncias simultâneas
2. Monitorar uso de memória
3. Fazer backup regular das sessões

## 📞 Suporte

Para dúvidas ou problemas:
- Verificar logs em `./logs/`
- Consultar documentação da API
- Revisar configurações de rede/firewall

---

**SPR - Sistema Preditivo Royal**  
*Múltiplas instâncias, infinitas possibilidades* 🌾 