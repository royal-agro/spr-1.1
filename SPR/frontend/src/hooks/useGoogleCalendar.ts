import { useState, useEffect } from 'react';

interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
}

interface GoogleCalendarHook {
  isAuthenticated: boolean;
  isLoading: boolean;
  events: GoogleCalendarEvent[];
  error: string | null;
  authenticate: () => Promise<void>;
  disconnect: () => void;
  syncEvents: () => Promise<void>;
  createEvent: (event: Omit<GoogleCalendarEvent, 'id'>) => Promise<void>;
}

// Configuração do Google Calendar API
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

export const useGoogleCalendar = (): GoogleCalendarHook => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Verificar se o usuário já está autenticado
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('google_calendar_token');
      if (token) {
        setIsAuthenticated(true);
        syncEvents();
      }
    };

    checkAuthStatus();
  }, []);

  // Função para autenticar com Google
  const authenticate = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulação de autenticação OAuth2
      // Em produção, você usaria a biblioteca oficial do Google
      const authUrl = `https://accounts.google.com/oauth/authorize?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=${encodeURIComponent(SCOPES)}&response_type=code&access_type=offline`;
      
      // Para demonstração, vamos simular uma autenticação bem-sucedida
      const mockToken = 'mock_google_calendar_token_' + Date.now();
      localStorage.setItem('google_calendar_token', mockToken);
      
      setIsAuthenticated(true);
      await syncEvents();
      
    } catch (err) {
      setError('Erro ao autenticar com Google Calendar');
      console.error('Google Calendar auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para desconectar
  const disconnect = (): void => {
    localStorage.removeItem('google_calendar_token');
    setIsAuthenticated(false);
    setEvents([]);
    setError(null);
  };

  // Função para sincronizar eventos
  const syncEvents = async (): Promise<void> => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulação de busca de eventos do Google Calendar
      // Em produção, você faria uma chamada real para a API
      const mockEvents: GoogleCalendarEvent[] = [
        {
          id: 'google_1',
          title: 'Reunião de Análise de Mercado - Google Calendar',
          description: 'Análise semanal das tendências do mercado de commodities',
          start: new Date('2025-07-15T09:00:00'),
          end: new Date('2025-07-15T10:00:00'),
          location: 'Sala de Reuniões Virtual',
          attendees: ['equipe@royalnegociosagricolas.com.br']
        },
        {
          id: 'google_2',
          title: 'Webinar: Perspectivas Soja 2025 - Google Calendar',
          description: 'Apresentação das projeções para a safra de soja 2025',
          start: new Date('2025-07-18T14:00:00'),
          end: new Date('2025-07-18T15:30:00'),
          location: 'Online - Google Meet',
          attendees: ['clientes@royalnegociosagricolas.com.br']
        },
        {
          id: 'google_3',
          title: 'Análise Técnica - Milho - Google Calendar',
          description: 'Análise técnica dos gráficos de milho e projeções',
          start: new Date('2025-07-20T10:00:00'),
          end: new Date('2025-07-20T11:00:00'),
          location: 'Escritório Principal',
          attendees: ['analistas@royalnegociosagricolas.com.br']
        }
      ];

      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEvents(mockEvents);
      
    } catch (err) {
      setError('Erro ao sincronizar eventos do Google Calendar');
      console.error('Google Calendar sync error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para criar evento
  const createEvent = async (eventData: Omit<GoogleCalendarEvent, 'id'>): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Não autenticado com Google Calendar');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulação de criação de evento
      const newEvent: GoogleCalendarEvent = {
        ...eventData,
        id: 'google_' + Date.now()
      };

      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setEvents(prev => [...prev, newEvent]);
      
    } catch (err) {
      setError('Erro ao criar evento no Google Calendar');
      console.error('Google Calendar create event error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    events,
    error,
    authenticate,
    disconnect,
    syncEvents,
    createEvent
  };
}; 