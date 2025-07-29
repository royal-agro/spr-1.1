// Tipos para licenciamento
export interface LicenseInfo {
  sessionId: string;
  clientName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  licenseType: 'trial' | 'basic' | 'premium' | 'enterprise';
  activatedAt: Date;
  expiresAt: Date;
  features: {
    [key: string]: boolean;
  };
  maxSessions: number;
  currentSessions: number;
  isActive: boolean;
}

// Configurações do ambiente
export const config = {
  // URLs da API
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3002',
    whatsappUrl: process.env.REACT_APP_WHATSAPP_URL || 'http://localhost:3000',
    timeout: 10000
  },

  // Configurações de Licenciamento e Autenticação
  licensing: {
    requireActivation: true, // Se true, exige ativação para usar funcionalidades
    trialDays: 7, // Dias de teste gratuito
    maxSessionsPerLicense: 1, // Limitar para apenas uma sessão
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
  },

  // Configurações do WhatsApp
  whatsapp: {
    maxRetries: 3,
    retryDelay: 1000,
    qrCodeRefreshInterval: 30000,
    sessionTimeout: 300000, // 5 minutos
    messageRateLimit: 3, // mensagens por minuto
    maxContactsPerCampaign: 100, // Aumentado para 100 conforme solicitado
    apiUrl: process.env.REACT_APP_WHATSAPP_URL || 'http://localhost:3003',
    syncInterval: 30000, // Aumentado para 30 segundos
    reconnectInterval: 10000 // Aumentado para 10 segundos
  },

  // Configurações de relatórios
  reports: {
    exportFormats: ['pdf', 'excel', 'csv'] as const,
    maxCampaignsPerExport: 10,
    defaultDateRange: 30, // dias
    refreshInterval: 60000 // 1 minuto
  },

  // Configurações do Google Calendar
  googleCalendar: {
    clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY || '',
    scope: 'https://www.googleapis.com/auth/calendar'
  },

  // Configurações de desenvolvimento
  development: {
    enableMockData: process.env.NODE_ENV === 'development',
    enableDebugLogs: process.env.REACT_APP_DEBUG === 'true',
    simulateNetworkDelay: true,
    bypassLicensing: process.env.NODE_ENV === 'development' // Pular licenciamento em desenvolvimento
  },

  // Configurações de UI
  ui: {
    theme: 'light',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currency: 'BRL'
  },

  // Configurações de notificações
  notifications: {
    enablePush: true,
    enableSound: true,
    enableDesktop: true,
    autoMarkAsRead: false
  },

  // Configurações de cache
  cache: {
    ttl: 300000, // 5 minutos
    maxSize: 100, // máximo de itens no cache
    enablePersistence: true
  }
};

// Utilitários de ambiente
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

// Utilitários de licenciamento
export const shouldBypassLicensing = (): boolean => true;

export const getFeatureAccess = (feature: string, license?: LicenseInfo): boolean => {
  // Em desenvolvimento, liberar todas as funcionalidades
  if (shouldBypassLicensing()) {
    return true;
  }

  // Se não há licença, apenas funcionalidades básicas
  if (!license || !license.isActive) {
    return ['whatsappIntegration', 'reportGeneration'].includes(feature);
  }

  // Verificar se a licença expirou
  if (new Date() > license.expiresAt) {
    return false;
  }

  // Verificar se a funcionalidade está habilitada na licença
  return license.features[feature] === true;
};

// Validação de configurações obrigatórias
export const validateConfig = (): void => {
  const errors: string[] = [];

  if (!config.api.baseUrl) {
    errors.push('REACT_APP_API_URL é obrigatório');
  }

  if (config.googleCalendar.clientId && !config.googleCalendar.apiKey) {
    errors.push('REACT_APP_GOOGLE_API_KEY é obrigatório quando GOOGLE_CLIENT_ID está definido');
  }

  if (errors.length > 0) {
    console.error('Erros de configuração:', errors);
    throw new Error(`Configuração inválida: ${errors.join(', ')}`);
  }
};

// Utilitários de configuração
export const getApiUrl = (endpoint: string): string => {
  return `${config.api.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const getWhatsAppUrl = (endpoint: string): string => {
  return `${config.api.whatsappUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Configurações específicas por ambiente
export const environmentConfig = {
  development: {
    ...config,
    api: {
      ...config.api,
      timeout: 30000 // timeout maior para desenvolvimento
    },
    development: {
      ...config.development,
      enableMockData: true,
      enableDebugLogs: true,
      bypassLicensing: true
    }
  },
  production: {
    ...config,
    development: {
      ...config.development,
      enableMockData: false,
      enableDebugLogs: false,
      simulateNetworkDelay: false,
      bypassLicensing: false
    }
  }
};

// Export default
export default config; 