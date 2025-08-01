# 📋 SPR - Guia dos Scripts de Desenvolvimento

Este diretório contém todos os scripts para gerenciamento, desenvolvimento e monitoramento do Sistema Preditivo Royal (SPR).

## 🆕 Scripts Recém-Criados

### 1. 🏥 `health-check.sh` - Verificação Completa de Saúde

**Propósito**: Realiza verificação completa de saúde do sistema, testando conectividade, recursos e detectando problemas comuns.

**Funcionalidades**:
- ✅ Verifica status HTTP de todos os serviços (3000, 3002, 3003)
- 🔗 Testa conectividade entre componentes
- 💻 Verifica recursos do sistema (CPU, RAM, disk)
- 🎨 Exibe relatório colorido de saúde geral
- 🔧 Oferece troubleshooting automático
- 🔍 Detecta problemas comuns (portas ocupadas, dependências faltando)

**Uso**:
```bash
# Verificação completa
./scripts/health-check.sh

# Modo verbose com logs detalhados
./scripts/health-check.sh --verbose

# Verificação rápida
./scripts/health-check.sh --quick

# Apenas endpoints dos serviços
./scripts/health-check.sh --services-only

# Apenas recursos do sistema
./scripts/health-check.sh --system-only

# Com troubleshooting automático
./scripts/health-check.sh --auto-fix
```

### 2. 🧪 `test-endpoints.sh` - Teste Completo de APIs

**Propósito**: Testa todas as APIs do sistema com validação, timing e relatórios detalhados.

**Funcionalidades**:
- 🔧 Testa todas as APIs do backend (3002): `/api/health`, `/api/status`, `/api/dashboard`, `/api/generate-message`
- 📱 Testa APIs do WhatsApp server (3003): `/api/status`, `/qr`, `/api/chats`
- 🎨 Valida carregamento do frontend (3000)
- 🔗 Testa integração entre serviços
- 📊 Gera relatório detalhado com timing e análise de performance
- 🐛 Suporte a modo verbose para debugging
- ⚡ Inclui teste de carga básico

**Uso**:
```bash
# Teste completo de todos os endpoints
./scripts/test-endpoints.sh

# Modo verbose com detalhes
./scripts/test-endpoints.sh --verbose

# Teste rápido dos endpoints principais
./scripts/test-endpoints.sh --quick

# Testar apenas backend
./scripts/test-endpoints.sh --backend-only

# Testar apenas WhatsApp
./scripts/test-endpoints.sh --whatsapp-only

# Testar apenas frontend
./scripts/test-endpoints.sh --frontend-only

# Incluir teste de carga
./scripts/test-endpoints.sh --load-test

# Salvar respostas para análise
./scripts/test-endpoints.sh --save-responses
```

### 3. 🚀 `dev-mode.sh` - Modo Desenvolvimento

**Propósito**: Inicia todos os serviços em modo desenvolvimento com recursos avançados de debugging e monitoramento.

**Funcionalidades**:
- 🔥 Inicia todos os serviços com hot-reload
- 🐛 Habilita logs detalhados (DEBUG=true)
- 👀 Configura watchers para arquivos importantes
- 🌐 Abre automaticamente as URLs no browser
- 📊 Interface de monitoramento em tempo real
- 🔄 Restart automático em caso de falha
- 🔍 Debug ports habilitados (Backend: 9229, WhatsApp: 9230)
- ⌨️ Interface interativa com comandos

**Uso**:
```bash
# Modo desenvolvimento completo
./scripts/dev-mode.sh

# Sem abrir browser automaticamente
./scripts/dev-mode.sh --no-browser

# Sem file watchers
./scripts/dev-mode.sh --no-watch

# Sem restart automático
./scripts/dev-mode.sh --no-restart

# Apenas monitorar serviços existentes
./scripts/dev-mode.sh --monitor-only
```

**Comandos durante execução**:
- `r` - Reiniciar todos os serviços
- `b` - Reiniciar apenas Backend
- `w` - Reiniciar apenas WhatsApp
- `f` - Reiniciar apenas Frontend
- `l` - Ver logs em tempo real
- `t` - Executar testes de endpoint
- `h` - Executar health check
- `o` - Abrir URLs no navegador
- `q` - Sair do modo desenvolvimento

## 📋 Scripts Existentes

### 4. `start-spr-complete.sh` - Inicialização Completa
Inicia todos os serviços do SPR em sequência com interface interativa.

### 5. `stop-all.sh` - Parar Todos os Serviços
Para graciosamente todos os processos SPR.

### 6. `start-backend.sh` - Iniciar Backend
Inicia apenas o servidor backend.

### 7. `start-whatsapp.sh` - Iniciar WhatsApp
Inicia apenas o servidor WhatsApp.

### 8. `start-frontend.sh` - Iniciar Frontend
Inicia apenas o frontend React.

### 9. `init_spr_production.sh` - Inicialização Produção
Script para deploy em ambiente de produção.

## 🎯 Casos de Uso Recomendados

### Para Desenvolvimento Diário:
```bash
# 1. Verificar saúde do sistema
./scripts/health-check.sh --quick

# 2. Iniciar modo desenvolvimento
./scripts/dev-mode.sh

# 3. Durante desenvolvimento, usar comandos interativos do dev-mode
```

### Para Testes e QA:
```bash
# 1. Verificação completa de saúde
./scripts/health-check.sh

# 2. Testes completos de API
./scripts/test-endpoints.sh --verbose

# 3. Teste de carga básico
./scripts/test-endpoints.sh --load-test
```

### Para Deploy e Produção:
```bash
# 1. Health check completo
./scripts/health-check.sh --auto-fix

# 2. Testes de todos os endpoints
./scripts/test-endpoints.sh

# 3. Inicialização completa
./scripts/start-spr-complete.sh --full
```

### Para Troubleshooting:
```bash
# 1. Diagnóstico detalhado
./scripts/health-check.sh --verbose

# 2. Análise específica de componente
./scripts/test-endpoints.sh --backend-only --verbose

# 3. Monitoramento em tempo real
./scripts/dev-mode.sh --monitor-only
```

## 🔧 Características Comuns dos Scripts

### ✨ Interface Padronizada:
- 🎨 Cabeçalho SPR em português
- 🌈 Cores ANSI para output (verde=ok, amarelo=aviso, vermelho=erro)
- 📊 Progress bars quando aplicável
- 📝 Documentação inline e help integrado

### 🛡️ Robustez:
- 🔒 Tratamento robusto de erros
- ⏱️ Timeouts configuráveis
- 🔄 Retry logic quando apropriado
- 🧹 Limpeza automática de recursos

### 🔍 Observabilidade:
- 📋 Logs detalhados em arquivos separados
- 📊 Métricas de performance e timing
- 🎯 Status em tempo real
- 📈 Relatórios formatados

### 🌐 Compatibilidade:
- ✅ Compatível com WSL/Linux
- 🐧 Testado em ambientes Unix
- 📦 Detecção automática de dependências
- 🔧 Fallbacks para ferramentas não disponíveis

## 📊 Logs e Relatórios

Todos os scripts salvam logs em `/home/cadu/projeto_SPR/logs/`:

- `health-check.log` - Logs do health check
- `test-endpoints.log` - Logs dos testes de API
- `dev-mode.log` - Logs do modo desenvolvimento
- `test-report-YYYYMMDD_HHMMSS.txt` - Relatórios de teste
- `dev-backend.log`, `dev-whatsapp.log`, `dev-frontend.log` - Logs específicos em dev mode

## 🆘 Troubleshooting

### Script não executa:
```bash
# Verificar permissões
chmod +x scripts/*.sh

# Converter terminadores de linha se necessário
dos2unix scripts/*.sh
# ou
sed -i 's/\r$//' scripts/*.sh
```

### Dependências não encontradas:
```bash
# Instalar ferramentas necessárias
sudo apt-get update
sudo apt-get install curl jq inotify-tools bc lsof

# Para sistemas baseados em Red Hat
sudo yum install curl jq inotify-tools bc lsof
```

### Portas ocupadas:
```bash
# Use o script de parada primeiro
./scripts/stop-all.sh

# Ou verifique manualmente
lsof -i :3000,3002,3003
```

## 🎉 Próximos Passos

1. **Teste os novos scripts** em seu ambiente
2. **Customize as configurações** se necessário (portas, timeouts, etc.)
3. **Integre aos seus workflows** de desenvolvimento
4. **Configure CI/CD** para usar os scripts de teste
5. **Monitore os logs** para otimizações futuras

---

**💡 Dica**: Para uma experiência completa de desenvolvimento, recomendamos começar sempre com `./scripts/health-check.sh --quick` seguido de `./scripts/dev-mode.sh` para desenvolvimento ativo.