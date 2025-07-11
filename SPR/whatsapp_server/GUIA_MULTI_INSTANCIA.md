# 🔥 Guia Completo: Sistema Multi-Instância WhatsApp SPR

## 📋 Visão Geral

O Sistema Multi-Instância WhatsApp do SPR permite gerenciar múltiplas contas WhatsApp simultaneamente, cada uma com sua própria sessão, QR Code e configurações. Ideal para empresas que precisam gerenciar diferentes clientes ou departamentos.

## 🎯 Premissas Estratégicas SPR Aplicadas

- **Execução 100% Real**: Funciona com WhatsApp Web real
- **Automação Máxima**: Gerenciamento automático de sessões
- **Estrutura Modular**: Cada instância é independente
- **Transparência**: Logs detalhados de cada instância
- **Visão de Mercado Total**: Suporte a múltiplos clientes

## 🚀 Como Iniciar o Sistema

### 1. Navegue para o Diretório Correto
```powershell
cd SPR/whatsapp_server
```

### 2. Instale as Dependências (se necessário)
```powershell
npm install
```

### 3. Inicie o Servidor Multi-Instância
```powershell
npm run multi
```

### 4. Acesse a Interface Web
Abra seu navegador e acesse: `http://localhost:3000`

## 📱 Padrões de Configuração

### Estrutura de Instâncias
```
SPR/whatsapp_server/
├── sessions/
│   ├── instance_1/
│   ├── instance_2/
│   └── instance_N/
├── qrcodes/
│   ├── qr_instance_1.png
│   ├── qr_instance_2.png
│   └── qr_instance_N.png
└── logs/
    ├── instance_1.log
    ├── instance_2.log
    └── instance_N.log
```

### Padrão de Nomenclatura
- **ID da Sessão**: `cliente_departamento_numero` (ex: `royal_vendas_01`)
- **Nome do Cliente**: Nome descritivo (ex: `Royal Vendas - Soja`)
- **Logs**: Arquivo separado por instância

## 🔧 Configuração de Nova Instância

### 1. Criar Nova Instância
1. Acesse `http://localhost:3000`
2. Preencha os campos:
   - **ID da Sessão**: `royal_soja_01`
   - **Nome do Cliente**: `Royal Agro - Soja`
3. Clique em "Criar Instância"

### 2. Conectar WhatsApp
1. Será gerado um QR Code único
2. Abra o WhatsApp no celular
3. Vá em "Dispositivos Conectados"
4. Escaneie o QR Code
5. Aguarde a conexão ser estabelecida

### 3. Verificar Status
- ✅ **Conectado**: Pronto para enviar mensagens
- ⏳ **Conectando**: Aguardando QR Code
- ❌ **Desconectado**: Precisa reconectar

## 📊 Monitoramento e Logs

### Logs por Instância
Cada instância gera logs separados em:
```
SPR/whatsapp_server/logs/instance_[ID].log
```

### Informações Registradas
- Conexões e desconexões
- Mensagens enviadas e recebidas
- Erros e avisos
- Status da sessão

## 🔄 Comandos Disponíveis

### Iniciar Servidor Multi-Instância
```powershell
npm run multi
```

### Desenvolvimento com Auto-Reload
```powershell
npm run multi-dev
```

### Servidor Único (Padrão)
```powershell
npm start
```

## 📡 API Endpoints

### Gerenciamento de Instâncias
```http
POST /api/instances
GET /api/instances
DELETE /api/instances/:id
```

### Envio de Mensagens
```http
POST /api/instances/:id/send
```

### QR Codes
```http
GET /qr/:id
```

## 🛡️ Segurança e Boas Práticas

### 1. Isolamento de Sessões
- Cada instância tem sessão completamente isolada
- Não há interferência entre contas
- Dados separados por cliente

### 2. Backup de Sessões
```powershell
# Fazer backup das sessões
xcopy "sessions" "backup_sessions" /E /I /H /Y
```

### 3. Limpeza de Sessões Antigas
```powershell
# Remover sessões antigas (cuidado!)
rmdir "sessions/instance_antiga" /S /Q
```

## 🔍 Solução de Problemas

### Problema: QR Code não aparece
**Solução**: Reinicie a instância específica

### Problema: Sessão desconecta frequentemente
**Solução**: 
1. Verifique conexão com internet
2. Reinicie a instância
3. Reescaneie o QR Code

### Problema: Mensagens não são enviadas
**Solução**:
1. Verifique se a instância está conectada
2. Confirme o número do destinatário
3. Verifique os logs da instância

## 📈 Escalabilidade

### Limites Recomendados
- **Desenvolvimento**: Até 5 instâncias
- **Produção**: Até 20 instâncias por servidor
- **Enterprise**: Múltiplos servidores com load balancer

### Monitoramento de Performance
- CPU: Cada instância usa ~50MB RAM
- Rede: Depende do volume de mensagens
- Disco: Sessões ocupam ~10MB cada

## 🎨 Interface Web

### Painel de Controle
- Lista todas as instâncias ativas
- Status em tempo real
- Botões para criar/remover instâncias
- Visualização de QR Codes

### Funcionalidades
- ✅ Criar nova instância
- ✅ Visualizar QR Code
- ✅ Remover instância
- ✅ Enviar mensagem de teste
- ✅ Ver logs em tempo real

## 📞 Suporte

Para problemas técnicos:
1. Verifique os logs da instância
2. Consulte este guia
3. Reinicie a instância problemática
4. Se persistir, reinicie o servidor completo

## 🏆 Vantagens do Sistema Multi-Instância

1. **Escalabilidade**: Suporte a múltiplos clientes
2. **Isolamento**: Cada cliente tem sua própria sessão
3. **Flexibilidade**: Adicionar/remover instâncias dinamicamente
4. **Monitoramento**: Logs separados por instância
5. **Segurança**: Dados completamente isolados

---

**Desenvolvido pela equipe SPR - Sistema Preditivo Royal**  
*Seguindo as 10 premissas estratégicas do SPR* 