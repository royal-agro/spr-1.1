# 🌾 SPR IA - Sistema Preditivo Royal com Inteligência Artificial

Sistema completo de WhatsApp Business com IA especializada em agronegócio e commodities.

## 🚀 INSTALAÇÃO RÁPIDA

### **Opção 1: Script Automático (Recomendado)**

**Windows:**
```bash
# Baixe setup_spr_ia.bat e execute
setup_spr_ia.bat
```

**Linux/Mac:**
```bash
# Baixe setup_spr_ia.sh e execute
chmod +x setup_spr_ia.sh
./setup_spr_ia.sh
```

### **Opção 2: Instalação Manual**

1. **Preparar arquivos:**
   ```bash
   cd SPR
   # Copie os arquivos dos artefatos Claude:
   # - backend_server_fixed.js
   # - package.json (atualizado)
   # - frontend/src/components/WhatsApp/MessageComposer.tsx
   ```

2. **Instalar dependências:**
   ```bash
   npm install express cors body-parser dotenv
   ```

3. **Iniciar backend:**
   ```bash
   node backend_server_fixed.js
   ```

4. **Testar sistema:**
   ```bash
   node test_spr_ia.js
   ```

## 📁 ESTRUTURA DO PROJETO

```
SPR/
├── backend_server_fixed.js     # 🤖 Backend com IA
├── package.json               # 📦 Dependências
├── test_spr_ia.js            # 🧪 Testes automáticos
├── setup_spr_ia.bat          # 🔧 Setup Windows
├── setup_spr_ia.sh           # 🔧 Setup Linux/Mac
└── frontend/
    └── src/
        └── components/
            └── WhatsApp/
                └── MessageComposer.tsx  # 💬 Interface IA
```

## 🤖 FUNCIONALIDADES DE IA

### **Geração de Mensagens Inteligentes**
- **Contexto Agronegócio:** Reconhece soja, milho, café, algodão, açúcar
- **4 Tons Diferentes:** Formal, Normal, Informal, Alegre
- **Personalização:** Adapta tratamento conforme contato
- **Fallback Offline:** Funciona mesmo sem conexão

### **Variações Automáticas**
- **Múltiplas versões** de uma mesma mensagem
- **Evita repetições** em campanhas massivas
- **Mantém tom consistente** em todas as variações

### **Palavras-chave Especializadas**
| Palavra-chave | Resposta Inteligente |
|---------------|---------------------|
| `soja` | Informações sobre mercado da soja |
| `milho` | Análises e projeções do milho |
| `café` | Perspectivas do setor cafeeiro |
| `açúcar` | Demanda internacional do açúcar |
| `algodão` | Tendências do mercado algodoeiro |
| `reunião` | Agendamento de encontros |
| `cotação` | Informações de preços |
| `proposta` | Preparação de propostas |

## 🔗 APIs DISPONÍVEIS

### **POST /api/generate-message**
Gera mensagem inteligente com IA.

**Request:**
```json
{
  "prompt": "quero agendar reunião sobre soja",
  "tone": "formal",
  "contactName": "João Silva",
  "isGroup": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prezado(a) Sr./Sra. João, espero que esteja bem. Gostaria de agendar uma reunião para conversarmos melhor sobre nossos serviços.",
  "tone": "formal",
  "metadata": {
    "generationId": "gen_1738012345",
    "length": 120,
    "wordsCount": 20
  }
}
```

### **POST /api/generate-variations**
Gera variações de uma mensagem.

**Request:**
```json
{
  "originalMessage": "Olá, vamos conversar sobre commodities?",
  "tone": "normal",
  "count": 3
}
```

**Response:**
```json
{
  "success": true,
  "variations": [
    "Olá, vamos conversar sobre commodities?",
    "Olá, vamos conversar sobre commodities?\n\nAbraços,",
    "Olá, tenho interesse em conversar sobre commodities?\n\nAté logo,"
  ],
  "count": 3
}
```

### **Outros Endpoints**
- `GET /api/health` - Status do servidor
- `GET /api/status` - Métricas do sistema
- `GET /api/config` - Configurações
- `GET /api/dashboard` - Dados do dashboard

## 🎯 COMO USAR A INTERFACE

### **1. Acessar Sistema**
```
http://localhost:3000/whatsapp
```

### **2. Usar Assistente de IA**
1. Vá para aba **"Nova Mensagem"**
2. Clique no botão **✨** (sparkles)
3. Selecione o **tom da mensagem**
4. Digite o que quer dizer
5. Clique **"Gerar Mensagem"**

### **3. Gerar Variações**
1. Após gerar uma mensagem
2. Clique **"🔄 Variações"**
3. Selecione a variação desejada

### **4. Exemplos de Prompts**
- `agendar reunião sobre soja`
- `cotação do milho hoje`
- `agradecer pelo contato`
- `proposta comercial`
- `análise de mercado`

## 🧪 TESTES

### **Teste Automático**
```bash
node test_spr_ia.js
```

### **Teste Manual**
```bash
# 1. Testar conectividade
curl http://localhost:3002/api/health

# 2. Testar geração de mensagem
curl -X POST http://localhost:3002/api/generate-message \
  -H "Content-Type: application/json" \
  -d '{"prompt":"teste","tone":"normal"}'

# 3. Testar variações
curl -X POST http://localhost:3002/api/generate-variations \
  -H "Content-Type: application/json" \
  -d '{"originalMessage":"teste","tone":"normal","count":3}'
```

## 🔧 CONFIGURAÇÕES

### **Tons Disponíveis**
- `formal` - Sr./Sra. (negócios formais)
- `normal` - Olá (padrão)
- `informal` - Oi (descontraído)
- `alegre` - Oi! 😊 (animado)

### **Limites do Sistema**
- **Prompt máximo:** 500 caracteres
- **Mensagem máxima:** 1000 caracteres
- **Variações máximas:** 5 por vez
- **Rate limit:** 3 disparos/minuto para grupos

### **Validações**
- ✅ Prompt obrigatório
- ✅ Tamanho máximo respeitado
- ✅ Tons válidos
- ✅ Fallback para modo offline

## 🚨 RESOLUÇÃO DE PROBLEMAS

### **Backend não inicia**
```bash
# Verificar Node.js
node --version

# Instalar dependências
npm install express cors body-parser dotenv

# Iniciar novamente
node backend_server_fixed.js
```

### **Frontend não conecta**
```bash
# Verificar se backend está rodando
curl http://localhost:3002/api/health

# Verificar porta
netstat -an | grep 3002
```

### **IA não funciona**
1. Verificar logs do backend
2. Testar API diretamente
3. Verificar modo fallback
4. Consultar arquivo de teste

## 📊 MÉTRICAS E LOGS

### **Logs do Backend**
```
🤖 IA: Mensagem gerada com sucesso: { prompt: '...', tone: '...', length: ... }
🔄 IA: Variações geradas: { count: 3, tone: '...' }
```

### **Métricas Disponíveis**
- Total de mensagens geradas
- Número de variações criadas
- Taxa de sucesso da IA
- Tempo de resposta médio
- Erros e validações

## 🎉 FUNCIONALIDADES EXTRAS

### **Agendamento de Mensagens**
- Agendar para data/hora específica
- Validação de data futura
- Interface intuitiva

### **Gravação de Áudio**
- Gravar mensagem de voz
- Conversão para texto (simulada)
- Integração com IA

### **Sistema de Grupos**
- Gerenciamento de contatos
- Segmentação por commodity
- Campanhas direcionadas

## 🔗 URLs IMPORTANTES

- **Backend:** http://localhost:3002
- **Frontend:** http://localhost:3000
- **WhatsApp Interface:** http://localhost:3000/whatsapp
- **API Health:** http://localhost:3002/api/health
- **API Docs:** http://localhost:3002/

## 📞 SUPORTE

### **Comandos Úteis**
```bash
# Iniciar sistema
node backend_server_fixed.js

# Testar sistema
node test_spr_ia.js

# Verificar logs
tail -f logs/spr_backend.log

# Parar sistema
Ctrl+C
```

### **Arquivos Importantes**
- `backend_server_fixed.js` - Lógica principal
- `MessageComposer.tsx` - Interface IA
- `test_spr_ia.js` - Testes automáticos
- `package.json` - Dependências

---

**🌾 Sistema Preditivo Royal - Desenvolvido para o Agronegócio Brasileiro 🚀**

*Especializado em commodities agrícolas com IA contextual para WhatsApp Business* 