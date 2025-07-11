import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, AppSettings, User } from '../types';

interface AppStore extends AppState {
  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  logout: () => void;
  login: (user: User) => void;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'pt',
  notifications: {
    whatsapp: true,
    priceAlerts: true,
    systemUpdates: true,
  },
  whatsapp: {
    autoReply: false,
    autoReplyMessage: 'Obrigado pela mensagem! Responderemos em breve.',
    businessHours: {
      enabled: false,
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo',
    },
  },
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      settings: defaultSettings,
      currentPage: 'dashboard',

      // Actions
      setUser: (user) => set({ user }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      setCurrentPage: (currentPage) => set({ currentPage }),
      
      updateSettings: (newSettings) => 
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
      
      logout: () => set({
        user: null,
        isAuthenticated: false,
        error: null,
      }),
      
      login: (user) => set({
        user,
        isAuthenticated: true,
        error: null,
      }),
    }),
    {
      name: 'spr-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
        currentPage: state.currentPage,
      }),
    }
  )
); 