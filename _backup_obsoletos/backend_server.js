const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Estado do sistema
let systemStatus = {
  status: 'online',
  timestamp: new Date(),
  version: '1.1.0',
  services: {
    whatsapp: 'disconnected',
    database: 'connected',
    api: 'running'
  },
  metrics: {
    totalMessages: 0,
    activeChats: 0,
    responseTime: 150,
    deliveryRate: 98.5,
    readRate: 85.2
  }
};

// Função para gerar mensagem com IA
const generateMessageWithAI = (prompt, tone, contactName, isGroup, context) => {
  const toneMessages = {
    formal: `Prezado(a) ${contactName || 'cliente'}, espero que esteja bem. `,
    normal: `Olá ${contactName || 'cliente'}, `,
    informal: `Oi ${contactName || 'cliente'}, `,
    alegre: `Oi ${contactName || 'cliente'}! 😊 `
  };

  const baseMessage = toneMessages[tone] || toneMessages.normal;
  
  // Lógica inteligente baseada no prompt
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('reunião') || promptLower.includes('meeting')) {
    return baseMessage + 'Gostaria de agendar uma reunião para conversarmos melhor sobre nossos serviços.';
  }
  if (promptLower.includes('preço') || promptLower.includes('cotação')) {
    return baseMessage + 'Posso te ajudar com informações sobre preços e cotações de commodities.';
  }
  if (promptLower.includes('soja') || promptLower.includes('milho')) {
    return baseMessage + 'Tenho informações atualizadas sobre ' + (promptLower.includes('soja') ? 'soja' : 'milho') + ' para você.';
  }
  if (promptLower.includes('obrigado') || promptLower.includes('agradec')) {
    return baseMessage + 'Muito obrigado pela confiança! Estamos sempre à disposição.';
  }
  if (promptLower.includes('desculp')) {
    return baseMessage + 'Peço desculpas pelo inconveniente. Como posso ajudar?';
  }
  
  return baseMessage + prompt;
};

// Função para gerar variações de mensagem
const generateMessageVariations = (originalMessage, tone, count = 3) => {
  const variations = [originalMessage];
  
  const toneVariations = {
    formal: [
      'Cordialmente,',
      'Atenciosamente,',
      'Respeitosamente,'
    ],
    normal: [
      'Abraços,',
      'Até logo,',
      'Obrigado,'
    ],
    informal: [
      'Valeu!',
      'Até mais!',
      'Tchau!'
    ],
    alegre: [
      'Beijos! 😘',
      'Até mais! 😊',
      'Valeu! 👍'
    ]
  };
  
  const currentTone = toneVariations[tone] || toneVariations.normal;
  
  for (let i = 1; i < count; i++) {
    const variation = originalMessage + '\n\n' + currentTone[i % currentTone.length];
    variations.push(variation);
  }
  
  return variations;
};

// Rotas da API
app.get('/api/status', (req, res) => {
  res.json({
    ...systemStatus,
    timestamp: new Date()
  });
});

app.get('/api/metrics', (req, res) => {
  res.json({
    metrics: systemStatus.metrics,
    timestamp: new Date()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Rota para dados do dashboard
app.get('/api/dashboard', (req, res) => {
  const dashboardData = {
    totalMessages: systemStatus.metrics.totalMessages,
    totalContacts: 150,
    activeChats: systemStatus.metrics.activeChats,
    messagesPerDay: 45,
    responseTime: systemStatus.metrics.responseTime,
    deliveryRate: systemStatus.metrics.deliveryRate,
    readRate: systemStatus.metrics.readRate,
    connectionStatus: 'connected',
    lastUpdate: new Date(),
    messageHistory: [
      { date: '2025-01-25', sent: 12, received: 8 },
      { date: '2025-01-24', sent: 15, received: 10 },
      { date: '2025-01-23', sent: 8, received: 12 }
    ],
    recentActivity: [
      {
        id: '1',
        type: 'message',
        description: 'Nova mensagem recebida',
        timestamp: new Date(),
        severity: 'info'
      },
      {
        id: '2',
        type: 'system',
        description: 'WhatsApp conectado',
        timestamp: new Date(Date.now() - 60000),
        severity: 'success'
      }
    ]
  };
  
  res.json(dashboardData);
});

// Rota para dados do WhatsApp
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    connected: systemStatus.services.whatsapp === 'connected',
    qrCode: null,
    lastActivity: new Date(),
    totalMessages: systemStatus.metrics.totalMessages,
    activeChats: systemStatus.metrics.activeChats
  });
});

// NOVA ROTA: Gerar mensagem com IA
app.post('/api/generate-message', (req, res) => {
  try {
    const { prompt, tone, contactName, isGroup, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }
    
    const generatedMessage = generateMessageWithAI(prompt, tone || 'normal', contactName, isGroup, context);
    
    res.json({
      message: generatedMessage,
      tone: tone || 'normal',
      contactName,
      isGroup,
      timestamp: new Date()
    });
    
    console.log('🤖 IA: Mensagem gerada:', { prompt, tone, contactName });
    
  } catch (error) {
    console.error('Erro ao gerar mensagem:', error);
    res.status(500).json({ error: 'Erro interno ao gerar mensagem' });
  }
});

// NOVA ROTA: Gerar variações de mensagem
app.post('/api/generate-variations', (req, res) => {
  try {
    const { originalMessage, tone, count } = req.body;
    
    if (!originalMessage) {
      return res.status(400).json({ error: 'Mensagem original é obrigatória' });
    }
    
    const variations = generateMessageVariations(originalMessage, tone || 'normal', count || 3);
    
    res.json({
      variations,
      originalMessage,
      tone: tone || 'normal',
      count: variations.length,
      timestamp: new Date()
    });
    
    console.log('🔄 IA: Variações geradas:', { originalMessage, tone, count: variations.length });
    
  } catch (error) {
    console.error('Erro ao gerar variações:', error);
    res.status(500).json({ error: 'Erro interno ao gerar variações' });
  }
});

// Rota para configurações
app.get('/api/config', (req, res) => {
  res.json({
    whatsapp: {
      maxRetries: 3,
      retryDelay: 1000,
      qrCodeRefreshInterval: 30000,
      sessionTimeout: 300000,
      messageRateLimit: 3,
      maxContactsPerCampaign: 100,
      apiUrl: 'http://localhost:3000',
      syncInterval: 5000,
      reconnectInterval: 5000
    },
    licensing: {
      requireActivation: false,
      trialDays: 7,
      maxSessionsPerLicense: 1,
      features: {
        whatsappIntegration: true,
        campaignAutomation: true,
        reportGeneration: true,
        googleCalendar: true,
        aiAssistant: true,
        advancedAnalytics: true,
        contactGroups: true,
        scheduledMessages: true,
        voiceMessages: true
      }
    }
  });
});

// Rota para o caminho raiz
app.get('/', (req, res) => {
  res.json({
    message: 'SPR Backend API',
    version: '1.1.0',
    status: 'online',
    timestamp: new Date(),
    endpoints: {
      status: '/api/status',
      metrics: '/api/metrics',
      health: '/api/health',
      dashboard: '/api/dashboard',
      whatsapp: '/api/whatsapp/status',
      config: '/api/config',
      generateMessage: '/api/generate-message',
      generateVariations: '/api/generate-variations'
    }
  });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Servidor Backend SPR iniciado!');
  console.log(`📡 API disponível em: http://localhost:${PORT}`);
  console.log(`🔗 Endpoints disponíveis:`);
  console.log(`   - GET /api/status`);
  console.log(`   - GET /api/metrics`);
  console.log(`   - GET /api/health`);
  console.log(`   - GET /api/dashboard`);
  console.log(`   - GET /api/whatsapp/status`);
  console.log(`   - GET /api/config`);
  console.log(`   - POST /api/generate-message 🤖`);
  console.log(`   - POST /api/generate-variations 🔄`);
  console.log('✅ Servidor pronto para receber requisições!');
});

// Atualizar métricas periodicamente
setInterval(() => {
  systemStatus.metrics.totalMessages += Math.floor(Math.random() * 3);
  systemStatus.metrics.activeChats = Math.floor(Math.random() * 10) + 5;
  systemStatus.timestamp = new Date();
}, 30000); // A cada 30 segundos 