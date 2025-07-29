# SPR 1.1 Frontend - Interface Gráfica

## Visão Geral

Interface gráfica moderna e profissional para o Sistema de Precificação Rural (SPR 1.1) com foco principal na integração com WhatsApp Business.

## Tecnologias Utilizadas

- **React 18** - Biblioteca JavaScript para interfaces
- **TypeScript** - Tipagem estática para JavaScript
- **Tailwind CSS** - Framework CSS utilitário
- **React Router** - Roteamento para aplicações React
- **Zustand** - Gerenciamento de estado
- **React Query** - Gerenciamento de dados assíncronos
- **Chart.js** - Biblioteca de gráficos
- **Heroicons** - Ícones SVG
- **React Hot Toast** - Notificações
- **Date-fns** - Manipulação de datas
- **Framer Motion** - Animações

## Estrutura do Projeto

```
src/
├── components/           # Componentes reutilizáveis
│   ├── Common/          # Componentes comuns
│   ├── Dashboard/       # Componentes do dashboard
│   └── WhatsApp/        # Componentes do WhatsApp
├── pages/               # Páginas da aplicação
├── hooks/               # Hooks customizados
├── services/            # Serviços de API
├── store/               # Gerenciamento de estado
├── types/               # Tipos TypeScript
├── utils/               # Utilitários
└── assets/              # Recursos estáticos
```

## Funcionalidades Principais

### 🚀 Dashboard
- Métricas em tempo real de mensagens WhatsApp
- Gráficos de atividade e performance
- Monitoramento de preços de commodities
- Alertas e notificações

### 💬 WhatsApp Business
- Interface similar ao WhatsApp Web
- Envio e recebimento de mensagens em tempo real
- Gerenciamento de contatos e grupos
- Status de entrega e leitura
- Busca de conversas

- Respostas automáticas configuráveis

### ⚙️ Configurações
- Perfil do usuário
- Configurações de notificações
- Tema claro/escuro
- Configurações do WhatsApp Business
- Horário comercial

## Instalação

```bash
# Instalar dependências
npm install

# Ou usando yarn
yarn install
```

## Scripts Disponíveis

```bash
# Iniciar desenvolvimento
npm start

# Build para produção
npm run build

# Executar testes
npm test

# Linting
npm run lint

# Formatação de código
npm run format
```

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WHATSAPP_API_URL=ws://localhost:8000/ws
REACT_APP_ENVIRONMENT=development
```

### Configuração do Tailwind CSS

O projeto utiliza Tailwind CSS com configuração personalizada:

- Cores personalizadas para WhatsApp
- Tema responsivo mobile-first
- Animações customizadas
- Tipografia otimizada

## Componentes Principais

### Layout
- **Layout.tsx** - Layout principal com sidebar e header
- Navegação responsiva
- Branding da empresa

### Dashboard
- **DashboardMetrics.tsx** - Cards de métricas
- **Dashboard.tsx** - Página principal com gráficos
- Integração com Chart.js

### WhatsApp
- **WhatsAppInterface.tsx** - Interface principal do WhatsApp
- **WhatsAppPage.tsx** - Página container
- Funcionalidades completas de mensageria

## Integração com Backend

### APIs Utilizadas
- `/api/whatsapp/messages` - Mensagens
- `/api/whatsapp/contacts` - Contatos
- `/api/dashboard/metrics` - Métricas
- `/api/commodities/prices` - Preços

### WebSocket
- Conexão em tempo real para mensagens
- Notificações push
- Status de conexão

## Responsividade

O sistema foi desenvolvido com abordagem mobile-first:

- **Mobile** (< 768px) - Layout adaptado para celulares
- **Tablet** (768px - 1024px) - Layout intermediário
- **Desktop** (> 1024px) - Layout completo

## Temas

### Tema Claro (Padrão)
- Cores claras e profissionais
- Boa legibilidade
- Foco na produtividade

### Tema Escuro (Futuro)
- Preparado para implementação
- Redução de fadiga ocular
- Modo noturno

## Performance

### Otimizações Implementadas
- Lazy loading de componentes
- Memoização de componentes pesados
- Compressão de imagens
- Bundle splitting

### Métricas de Performance
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Time to Interactive < 3.5s

## Acessibilidade

- Suporte a leitores de tela
- Navegação por teclado
- Contraste adequado
- Textos alternativos em imagens

## Testes

### Tipos de Testes
- Testes unitários com Jest
- Testes de componentes com React Testing Library
- Testes de integração
- Testes E2E com Cypress

```bash
# Executar testes
npm test

# Cobertura de testes
npm run test:coverage
```

## Deploy

### Build de Produção
```bash
npm run build
```

### Configuração do Servidor
- Servir arquivos estáticos
- Configurar proxy para APIs
- Configurar HTTPS
- Compressão gzip

## Monitoramento

### Ferramentas
- Google Analytics
- Sentry para erro tracking
- Performance monitoring
- User feedback

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

Este projeto é propriedade da Royal Negócios Agrícolas.

## Suporte

Para suporte técnico, entre em contato:
- Email: carlos@royalnegociosagricolas.com.br
- WhatsApp: +55 66 99984-0671

---

**Desenvolvido com ❤️ para Royal Negócios Agrícolas** 