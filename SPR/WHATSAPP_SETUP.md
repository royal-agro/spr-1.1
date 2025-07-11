# 📱 SPR WhatsApp - Guia Completo

## 🚀 Início Rápido

### Opção 1: Script Automático (Recomendado)

**PowerShell:**
```powershell
.\start_services.ps1
```

**Batch:**
```batch
start_services.bat
```

### Opção 2: Manual

1. **WhatsApp QR Server (porta 3002):**
   ```bash
   cd SPR/whatsapp_server
   node final_qr.js
   ```

2. **WhatsApp API Server (porta 3001):**
   ```bash
   cd SPR/whatsapp_server
   node integrated_server.js
   ```

3. **Servidor de Mídia (porta 3003):**
   ```bash
   cd SPR/whatsapp_server
   node media_server.js
   ```

4. **Frontend React (porta 3000):**
   ```bash
   cd SPR/frontend
   npm start
   ```

## 📋 Serviços e Portas

| Serviço | Porta | URL | Função |
|---------|-------|-----|---------|
| QR Code WhatsApp | 3002 | http://localhost:3002 | Conectar WhatsApp |
| API WhatsApp | 3001 | http://localhost:3001 | Gerenciar conversas |
| Servidor de Mídia | 3003 | http://localhost:3003 | Upload e servir arquivos |
| Frontend React | 3000 | http://localhost:3000 | Interface principal |

## 🔧 Configuração Inicial

### 1. Conectar WhatsApp
1. Abra http://localhost:3002
2. Escaneie o QR Code com seu WhatsApp
3. Aguarde a confirmação de conexão

### 2. Usar a Interface
1. Abra http://localhost:3000
2. Navegue até a seção WhatsApp
3. Suas conversas aparecerão automaticamente

## ✨ Funcionalidades Implementadas

### 📱 Interface Completa
- ✅ Lista de conversas com busca
- ✅ Visualização de mensagens
- ✅ Envio de mensagens de texto
- ✅ **Seletor de emojis** 😀
- ✅ **Anexar arquivos** 📎
- ✅ Ligações (voz e vídeo)
- ✅ Menu de opções
- ✅ Informações do contato
- ✅ Indicadores de status

### 📎 Anexos Suportados
- 🖼️ **Imagens** (JPG, PNG, GIF, etc.)
- 🎬 **Vídeos** (MP4, AVI, MOV, etc.)
- 📄 **Documentos** (PDF, DOC, TXT, etc.)

### 😀 Emojis
- Seletor completo com centenas de emojis
- Categorias organizadas
- Clique para inserir na mensagem

## 🎯 Como Usar

### Enviar Mensagens
1. Clique em uma conversa
2. Digite sua mensagem
3. Pressione Enter ou clique no botão enviar

### Adicionar Emojis
1. Clique no botão 😀
2. Selecione o emoji desejado
3. Ele será adicionado à mensagem

### Anexar Arquivos
1. Clique no botão 📎
2. Escolha o tipo de arquivo:
   - **Fotos & Imagens**
   - **Vídeos**
   - **Documentos**
3. Selecione o arquivo no seu computador
4. Confirme o envio

### Fazer Ligações
- **Voz:** Clique no ícone 📞
- **Vídeo:** Clique no ícone 📹

## 🛠️ Solução de Problemas

### QR Code não aparece
```bash
# Limpar sessões corrompidas
rm -rf SPR/whatsapp_server/sessions/*
node final_qr.js
```

### Conversas não carregam
1. Verifique se o WhatsApp está conectado
2. Reinicie o servidor API (porta 3001)
3. Atualize a página do frontend

### Erro de porta ocupada
```bash
# Verificar processos na porta
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002

# Parar processo específico
taskkill /PID [PID_NUMBER] /F
```

### Emoji não funciona
- Verifique se o navegador suporta emojis
- Teste em navegador atualizado (Chrome, Firefox, Edge)

### Anexos não enviam
- Verifique o tamanho do arquivo (máx. 16MB)
- Certifique-se que o formato é suportado
- Teste com arquivo menor primeiro

## 🔄 Reiniciar Serviços

### Parar todos os serviços
```powershell
taskkill /F /IM node.exe
```

### Reiniciar específico
```bash
# Parar processo específico
Ctrl+C na janela do serviço

# Reiniciar
node [nome_do_arquivo].js
```

## 📊 Status dos Serviços

### Verificar se estão rodando
- **QR Code:** http://localhost:3002/health
- **API:** http://localhost:3001/api/status
- **Frontend:** http://localhost:3000

### Logs de Debug
- Verifique as janelas do terminal
- Logs são salvos em `SPR/whatsapp_server/logs/`

## 🎉 Funcionalidades Avançadas

### Integração com SPR
- Mensagens sobre preços de commodities
- Alertas automáticos
- Relatórios via WhatsApp

### Automação
- Respostas automáticas
- Envio programado
- Integração com dados do mercado

## 📞 Suporte

Se encontrar problemas:
1. Verifique este guia primeiro
2. Consulte os logs de erro
3. Reinicie os serviços
4. Entre em contato com o suporte técnico

---

**🎯 SPR - Sistema de Previsão Rural**  
*Integrando WhatsApp com inteligência agrícola* 