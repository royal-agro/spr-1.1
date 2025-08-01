# 🚀 SPR - Sistema Preditivo Royal v1.2.0
## Manifesto de Versão Oficial

**Data de Release:** 01/08/2025  
**Código da Versão:** SPR-v1.2.0-STABLE  
**Coordenador:** Claude DevOps Agent  

---

## 📋 COMPONENTES OFICIAIS

### 🔧 CORE SERVICES

#### WhatsApp Service (v1.2.0)
- **Arquivo Oficial:** `whatsapp_server_official_v1.2.0.js`
- **Localização:** `services/whatsapp/`
- **Status:** ✅ PRODUCTION READY
- **Biblioteca:** whatsapp-web.js v1.31.0
- **Funcionalidades:**
  - Rate limiting inteligente
  - Interface HTML completa
  - QR Code automático
  - Sistema de métricas
  - CORS multi-porta
  - Graceful shutdown

#### Backend Service (v1.2.1) 
- **Arquivo Oficial:** `backend_server_fixed_v1.2.1.js`
- **Localização:** `services/backend/`
- **Status:** ✅ PRODUCTION READY
- **Funcionalidades:**
  - Circuit breaker
  - Retry com exponential backoff
  - Rate limiting otimizado
  - Proxy WhatsApp integrado
  - Health checks avançados

#### Frontend Service (v1.1.0)
- **Diretório Oficial:** `frontend/`
- **Status:** ✅ ACTIVE (com correções TypeScript aplicadas)
- **Framework:** React 18 + TypeScript
- **Funcionalidades:**
  - Interface SPR completa
  - WhatsApp integrado
  - Dashboard analytics
  - Sistema de broadcast
  - Mock API para desenvolvimento

### 🤖 AGENT SYSTEM (v1.0.0)

#### Multi-Agent Coordinator
- **Script Oficial:** `scripts/activate-agents.sh`
- **Agentes Disponíveis:**
  - Backend Engineer
  - Frontend Engineer  
  - WhatsApp Specialist
  - QA & Testing Agent
  - DevOps Agent

#### Agent Configuration
- **Localização:** `core/agents/`
- **Arquivos:**
  - `agent-manager.js`
  - Configurações especializadas por agente

---

## 🏗️ ARQUITETURA VERSIONADA

```
SPR v1.2.0/
├── core/
│   ├── agents/           # Sistema multi-agente
│   └── config/           # Configurações centralizadas
├── services/
│   ├── whatsapp/         # Serviço WhatsApp oficial
│   ├── backend/          # Backend Node.js + FastAPI
│   └── database/         # Modelos e migrações
├── frontend/             # Interface React/TypeScript
├── scripts/              # Scripts de automação
├── documentation/        # Docs técnicas e API
└── backups/              # Versões anteriores

Estrutura Original (MANTIDA para compatibilidade):
projeto_SPR/              # Estrutura legada
├── whatsapp_server_real.js -> LINK para spr_v1.2.0/services/whatsapp/
├── backend_server_fixed.js -> LINK para spr_v1.2.0/services/backend/
├── frontend/             # SINCRONIZADO com spr_v1.2.0/frontend/
└── [demais arquivos]     # Mantidos para não quebrar dependências
```

---

## 📊 METODOLOGIA DE VERSIONAMENTO

### Semantic Versioning (SemVer)
**Formato:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Mudanças incompatíveis de API ou arquitetura
- **MINOR:** Novas funcionalidades mantendo compatibilidade
- **PATCH:** Correções de bugs e melhorias menores

### Nomenclatura de Arquivos
**Formato:** `{component}_{type}_v{version}.{ext}`

**Exemplos:**
- `whatsapp_server_official_v1.2.0.js`
- `backend_server_fixed_v1.2.1.js`
- `frontend_components_v1.1.0/`

### Branch Strategy
- **main:** Versão estável atual
- **develop:** Desenvolvimento ativo
- **feature/xxx:** Novas funcionalidades
- **hotfix/xxx:** Correções urgentes
- **release/vX.Y.Z:** Preparação de release

---

## 🔄 PROCESSO DE RELEASE

### 1. Preparação
```bash
# Criar branch de release
git checkout -b release/v1.3.0

# Atualizar versões
./scripts/update-version.sh 1.3.0

# Executar testes completos
./scripts/test-endpoints.sh --full
```

### 2. Validação
```bash
# Ativar todos os agentes para validação
./scripts/activate-agents.sh

# Deploy de teste
./test_production_deploy.sh

# Health check completo
./scripts/health-check.sh --comprehensive
```

### 3. Deploy
```bash
# Deploy automatizado
./deploy_digitalocean.sh deploy --version=v1.3.0

# Verificação pós-deploy
./scripts/health-check.sh --production
```

---

## 📚 COMPATIBILIDADE E DEPENDÊNCIAS

### Node.js Versions
- **Mínima:** 16.x
- **Recomendada:** 18.x
- **Testada:** 20.x

### WhatsApp Libraries
- **whatsapp-web.js:** 1.31.0 (OFICIAL)
- **@whiskeysockets/baileys:** 6.7.18 (BACKUP)

### Frontend Dependencies
- **React:** 18.x
- **TypeScript:** 4.9.x
- **Tailwind CSS:** 3.x

---

## 🚨 BREAKING CHANGES

### v1.2.0 → v1.3.0 (Futuro)
- TBD

### v1.1.0 → v1.2.0
- ✅ WhatsApp server consolidado
- ✅ Backend circuit breaker implementado
- ✅ Frontend TypeScript errors corrigidos
- ✅ Sistema multi-agente ativado

---

## 📞 SUPPORT & MAINTENANCE

### Ciclo de Vida das Versões
- **v1.2.x:** Suporte ativo até v1.4.0
- **v1.1.x:** Suporte crítico até v1.3.0  
- **v1.0.x:** EOL (End of Life)

### Política de Hotfixes
- Correções críticas: Patch version
- Vulnerabilidades de segurança: Hotfix imediato
- Performance issues: Minor version

---

## 🎯 ROADMAP

### v1.3.0 (Planejado - Set/2025)
- [ ] Sistema de autenticação melhorado
- [ ] API v2 com GraphQL
- [ ] Dashboard analytics avançado
- [ ] Integração IA melhorada

### v1.4.0 (Planejado - Out/2025)
- [ ] Multi-tenant support
- [ ] Kubernetes deployment
- [ ] Real-time notifications
- [ ] Advanced reporting

---

**Assinatura Digital:**  
`SPR-v1.2.0-STABLE-SHA256: [hash_placeholder]`

**Responsável Técnico:** DevOps Agent + Claude Code  
**Data de Aprovação:** 01/08/2025 21:45 BRT