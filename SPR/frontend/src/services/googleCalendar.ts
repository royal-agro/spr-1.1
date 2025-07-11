// Declaração de tipos para Google API
declare global {
  interface Window {
    gapi: any;
  }
}

// Interface para eventos do Google Calendar
interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

// Configuração da API do Google Calendar
const GOOGLE_CONFIG = {
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY || '',
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
  discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  scopes: 'https://www.googleapis.com/auth/calendar'
};

class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private gapi: any = null;
  private isInitialized = false;
  private isSignedIn = false;

  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.gapi) {
        console.warn('Google API não carregada');
        return false;
      }

      this.gapi = window.gapi;
      
      await this.gapi.load('auth2', () => {});
      await this.gapi.load('client', () => {});

      await this.gapi.client.init({
        apiKey: GOOGLE_CONFIG.apiKey,
        clientId: GOOGLE_CONFIG.clientId,
        discoveryDocs: [GOOGLE_CONFIG.discoveryDoc],
        scope: GOOGLE_CONFIG.scopes
      });

      this.isInitialized = true;
      this.isSignedIn = this.gapi.auth2.getAuthInstance().isSignedIn.get();
      
      return true;
    } catch (error) {
      console.error('Erro ao inicializar Google Calendar:', error);
      return false;
    }
  }

  async signIn(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      
      this.isSignedIn = true;
      return true;
    } catch (error) {
      console.error('Erro ao fazer login no Google:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    try {
      if (this.isInitialized && this.isSignedIn) {
        const authInstance = this.gapi.auth2.getAuthInstance();
        await authInstance.signOut();
        this.isSignedIn = false;
      }
    } catch (error) {
      console.error('Erro ao fazer logout do Google:', error);
    }
  }

  async getEvents(
    timeMin?: Date,
    timeMax?: Date,
    maxResults = 10
  ): Promise<GoogleCalendarEvent[]> {
    try {
      if (!this.isSignedIn) {
        throw new Error('Usuário não está autenticado');
      }

      const request = {
        calendarId: 'primary',
        timeMin: timeMin?.toISOString() || new Date().toISOString(),
        timeMax: timeMax?.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults,
        orderBy: 'startTime'
      };

      const response = await this.gapi.client.calendar.events.list(request);
      return response.result.items || [];
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }
  }

  async createEvent(event: Omit<GoogleCalendarEvent, 'id'>): Promise<string | null> {
    try {
      if (!this.isSignedIn) {
        throw new Error('Usuário não está autenticado');
      }

      const response = await this.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      return response.result.id;
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      return null;
    }
  }

  async updateEvent(eventId: string, event: Partial<GoogleCalendarEvent>): Promise<boolean> {
    try {
      if (!this.isSignedIn) {
        throw new Error('Usuário não está autenticado');
      }

      await this.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: event
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      return false;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      if (!this.isSignedIn) {
        throw new Error('Usuário não está autenticado');
      }

      await this.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId
      });

      return true;
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      return false;
    }
  }

  getAuthStatus(): { isInitialized: boolean; isSignedIn: boolean } {
    return {
      isInitialized: this.isInitialized,
      isSignedIn: this.isSignedIn
    };
  }
}

export default GoogleCalendarService.getInstance();
export type { GoogleCalendarEvent }; 