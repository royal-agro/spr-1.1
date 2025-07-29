# 🚀 Guia de Início Rápido - SPR 1.1 Frontend

## Pré-requisitos

- Node.js 16+ instalado
- npm ou yarn
- Git

## Instalação Rápida

### 1. Instalar dependências
```bash
cd SPR/frontend
npm install
```

### 2. Configurar ambiente
```bash
# Criar arquivo .env
cp .env.example .env

# Ou criar manualmente com:
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WHATSAPP_API_URL=ws://localhost:8000/ws
REACT_APP_ENVIRONMENT=development
```

### 3. Adicionar logos da empresa
```bash
# Copiar logos da pasta "Imagens Royal" para:
# - SPR/frontend/src/assets/logos/
# - SPR/frontend/public/assets/logos/

# Renomear para:
# - logo-royal.png (logo principal)
# - logo-royal-icon.png (ícone)
```

### 4. Iniciar desenvolvimento
```bash
npm start
```

A aplicação estará disponível em: http://localhost:3000

## Estrutura de Navegação

- **/** - Dashboard principal
- **/whatsapp** - Interface do WhatsApp
- **/settings** - Configurações

## Funcionalidades Principais

### 📊 Dashboard
- Métricas de mensagens WhatsApp
- Gráficos de atividade
- Preços de commodities em tempo real
- Alertas do sistema

### 💬 WhatsApp
- Interface completa de mensageria
- Lista de conversas
- Envio de mensagens
- Status de entrega/leitura
- Busca de contatos

### ⚙️ Configurações
- Perfil do usuário
- Configurações de notificações
- Configurações do WhatsApp
- Tema da aplicação

## Comandos Úteis

```bash
# Desenvolvimento
npm start                 # Iniciar servidor de desenvolvimento
npm run build            # Build para produção
npm test                 # Executar testes
npm run lint             # Verificar código
npm run format           # Formatar código

# Análise
npm run analyze          # Analisar bundle
npm run test:coverage    # Cobertura de testes
```

## Configuração de Produção

### Build
```bash
npm run build
```

### Deploy
```bash
# Servir arquivos estáticos
npx serve -s build

# Ou configurar servidor web (nginx, apache)
```

## Troubleshooting

### Erro de dependências
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro de porta ocupada
```bash
# Usar porta diferente
PORT=3001 npm start
```

### Erro de build
```bash
# Verificar variáveis de ambiente
# Verificar sintaxe TypeScript
npm run lint
```

## Integração com Backend

### APIs Esperadas
- `GET /api/dashboard/metrics` - Métricas do dashboard
- `GET /api/whatsapp/chats` - Lista de conversas
- `POST /api/whatsapp/send` - Enviar mensagem
- `WS /ws/whatsapp` - WebSocket para tempo real

### Estrutura de Dados
```typescript
// Exemplo de mensagem
{
  id: string;
  content: string;
  timestamp: Date;
  isFromMe: boolean;
  status: 'sent' | 'delivered' | 'read';
}
```

## Personalização

### Cores da Empresa
Editar `tailwind.config.js`:
```javascript
colors: {
  primary: '#sua-cor-primaria',
  secondary: '#sua-cor-secundaria',
  whatsapp: '#25d366'
}
```

### Logos
Substituir arquivos em:
- `src/assets/logos/`
- `public/assets/logos/`

## Suporte

- **Email**: suporte@royal-agro.com
- **WhatsApp**: +55 11 99999-0000
- **Documentação**: README.md

---

**Desenvolvido para Royal Negócios Agrícolas** 🌾 