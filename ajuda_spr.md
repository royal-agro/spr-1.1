# SPR Sistema Preditivo Royal - Guia de Uso

## 🚀 Como Iniciar o SPR

### Opção 1: Script Automático (Recomendado)
```powershell
# No diretório SPR, execute:
.\iniciar_spr.ps1
```

### Opção 2: Iniciar Apenas o Frontend
```powershell
.\iniciar_spr.ps1 -OnlyFrontend
```

### Opção 3: Iniciar Apenas o WhatsApp
```powershell
.\iniciar_spr.ps1 -OnlyWhatsApp
```

### Opção 4: Pular Instalação de Dependências
```powershell
.\iniciar_spr.ps1 -SkipInstall
```

## 📱 Portas Padrão

| Serviço | Porta | URL |
|---------|-------|-----|
| Frontend | 3001 | http://localhost:3001 |
| WhatsApp | 3000 | http://localhost:3000 |
| Servidor na porta 3002 | 3002 | http://localhost:3002 |

## 🛠️ Comandos Manuais

### Frontend
```powershell
cd frontend
$env:PORT=3001
npm start
```

### WhatsApp Server
```powershell
cd whatsapp_server
npm run multi
```

## 🔧 Solução de Problemas

### Erro: "O token '&&' não é um separador de instruções válido"
**Solução:** Use ponto e vírgula (;) ou comandos separados no PowerShell:
```powershell
# ❌ Não funciona no PowerShell
cd frontend && npm start

# ✅ Funciona no PowerShell
cd frontend; npm start
# ou
cd frontend
npm start
```

### Erro: "Porta já em uso"
**Solução:** O script automático encontra portas disponíveis automaticamente.

### Erro: "Module not found"
**Solução:** Instale as dependências:
```powershell
cd frontend
npm install

cd ../whatsapp_server
npm install
```

## 📊 Funcionalidades Disponíveis

### 1. Dashboard Principal
- Gráficos de preços das commodities
- Notícias do mercado agrícola
- Métricas em tempo real

### 2. WhatsApp Integration
- Interface de chat
- Múltiplas instâncias
- Envio de mensagens
- Upload de arquivos

### 3. Agenda Google Calendar
- Sincronização de eventos
- Criação de novos eventos
- Notificações

### 4. Previsão de Preços
- Soja, Milho, Café, Algodão, Boi
- Análise de tendências
- Alertas de preços

## 🎯 Commodities Suportadas

- **Soja** 🌱
- **Milho** 🌽
- **Café** ☕
- **Algodão** 🌿
- **Boi** 🐂

## 📞 Suporte

Se encontrar problemas:
1. Verifique se Node.js está instalado
2. Execute `.\iniciar_spr.ps1` no diretório SPR
3. Verifique as portas disponíveis
4. Consulte os logs dos serviços

## 🔄 Comandos Úteis

```powershell
# Ver processos Node.js rodando
Get-Process node

# Parar todos os processos Node.js
Get-Process node | Stop-Process

# Verificar portas em uso
netstat -an | findstr :3000
netstat -an | findstr :3001
netstat -an | findstr :3002

# Limpar cache npm
npm cache clean --force
```

---

**SPR Sistema Preditivo Royal** - Desenvolvido para o Agronegócio Brasileiro 🇧🇷 