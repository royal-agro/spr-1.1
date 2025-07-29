# 🤖 Configuração do Claude no VS Code - SPR 1.1

## 📋 Passos para Configuração

### 1. **Instalar Extensão**
```bash
# No VS Code:
# 1. Pressione Ctrl+Shift+X
# 2. Pesquise "Claude Dev" ou "Anthropic Claude"
# 3. Instale a extensão oficial
```

### 2. **Configurar API Key**
```bash
# 1. Copie o arquivo .env.vscode para .env
cp .env.vscode .env

# 2. Edite o arquivo .env e adicione sua chave API real
# ANTHROPIC_API_KEY=sua_chave_real_aqui
```

### 3. **Abrir Workspace**
```bash
# No VS Code:
# File > Open Workspace from File > spr.code-workspace
```

### 4. **Configurar Command Palette**
```bash
# Pressione Ctrl+Shift+P
# Digite "Claude" para ver comandos disponíveis:
# - Claude: Start New Chat
# - Claude: Ask Claude
# - Claude: Generate Code
# - Claude: Explain Code
```

## 🚀 Funcionalidades Disponíveis

### **Chat Integrado**
- Abra o painel lateral do Claude
- Faça perguntas sobre o código
- Solicite explicações e melhorias

### **Geração de Código**
- Selecione código e peça para explicar
- Gere novas funções com descrição
- Refatore código existente

### **Análise Contextual**
- Claude entende a estrutura do projeto SPR
- Reconhece padrões do agronegócio
- Mantém contexto entre conversas

### **Comandos Úteis**
```bash
# Comando de contexto rápido
Ctrl+Shift+P > "Claude: Ask about this file"

# Explicar função selecionada
Selecione função > Ctrl+Shift+P > "Claude: Explain"

# Gerar testes
Selecione função > Ctrl+Shift+P > "Claude: Generate tests"
```

## 🎯 Configurações Específicas do SPR

### **Contexto do Projeto**
- Sistema focado em **agronegócio**
- Commodities: soja, milho, café, algodão, açúcar
- Análise geográfica e otimização de compras
- Integração WhatsApp Business

### **Padrões de Código**
- Python: FastAPI, Pandas, estrutura modular
- Frontend: React + TypeScript + Tailwind
- WhatsApp: Node.js + Express

### **Módulos Principais**
- `app/analise/` - Análise de dados e sentimentos
- `app/precificacao/` - Previsão de preços
- `app/suporte_tecnico/` - Ferramentas administrativas
- `frontend/` - Interface React
- `whatsapp_server/` - Servidor WhatsApp

## 🔧 Resolução de Problemas

### **Extensão não encontrada**
1. Verifique se está na versão mais recente do VS Code
2. Procure por "Claude Dev" no marketplace
3. Instale diretamente do site da Anthropic

### **API Key não funciona**
1. Verifique se a chave está correta no arquivo .env
2. Confirme se tem créditos na conta Anthropic
3. Reinicie o VS Code após configurar

### **Claude não entende o projeto**
1. Abra o workspace spr.code-workspace
2. Verifique se os arquivos .vscode/settings.json estão corretos
3. Use comandos específicos com contexto do SPR

## 📚 Exemplos de Uso

### **Pergunta sobre Módulo**
```
"Claude, explique como funciona o módulo de precificação no SPR"
```

### **Melhorar Função**
```python
# Selecione a função e pergunte:
"Como posso otimizar esta função para melhor performance?"
```

### **Gerar Novo Componente**
```
"Crie um componente React para exibir gráficos de preços de commodities"
```

### **Debug de Problema**
```
"Claude, esta função está retornando erro, pode me ajudar a identificar o problema?"
```

---

**🌾 Agora você pode usar o Claude diretamente no VS Code para desenvolver o SPR 1.1!**