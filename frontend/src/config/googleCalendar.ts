// Configuração do Google Calendar
export const GOOGLE_CALENDAR_CONFIG = {
  // Em produção, essas credenciais devem vir de variáveis de ambiente
  CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'demo_client_id',
  API_KEY: process.env.REACT_APP_GOOGLE_API_KEY || 'demo_api_key',
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  SCOPES: 'https://www.googleapis.com/auth/calendar',
  
  // URLs para desenvolvimento
  REDIRECT_URI: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  
  // Configurações da API
  MAX_RESULTS: 50,
  TIME_MIN: new Date().toISOString(),
  
  // Configurações de cache
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  
  // Configurações de retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// Função para validar se as credenciais estão configuradas
export const isGoogleCalendarConfigured = (): boolean => {
  return !!(
    GOOGLE_CALENDAR_CONFIG.CLIENT_ID && 
    GOOGLE_CALENDAR_CONFIG.CLIENT_ID !== 'demo_client_id' &&
    GOOGLE_CALENDAR_CONFIG.API_KEY && 
    GOOGLE_CALENDAR_CONFIG.API_KEY !== 'demo_api_key'
  );
};

// Função para obter URL de autenticação
export const getAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CALENDAR_CONFIG.CLIENT_ID,
    redirect_uri: GOOGLE_CALENDAR_CONFIG.REDIRECT_URI,
    scope: GOOGLE_CALENDAR_CONFIG.SCOPES,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}; 