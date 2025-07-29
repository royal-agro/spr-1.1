import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LicenseInfo, config, getFeatureAccess, shouldBypassLicensing } from '../config';

interface LicenseStore {
  // Estado da licença
  license: LicenseInfo | null;
  isActivated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Ações
  activateLicense: (clientName: string, additionalInfo?: Partial<LicenseInfo>) => Promise<boolean>;
  deactivateLicense: () => void;
  checkLicenseStatus: () => Promise<boolean>;
  validateFeatureAccess: (feature: string) => boolean;
  getRemainingDays: () => number;
  refreshLicense: () => Promise<void>;
  
  // Utilitários
  getLicenseInfo: () => LicenseInfo | null;
  getSessionId: () => string | null;
  getClientName: () => string | null;
}

// Função para simular validação de licença no servidor
const validateLicenseOnServer = async (clientName: string): Promise<{
  isValid: boolean;
  license?: LicenseInfo;
  error?: string;
}> => {
  try {
    const sessionId = 'default-session';
    console.log('🔍 Validando licença no servidor:', { sessionId, clientName });
    
    // Em desenvolvimento, simular validação
    if (shouldBypassLicensing()) {
      console.log('🚀 Modo desenvolvimento: bypassando licenciamento');
      const mockLicense: LicenseInfo = {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        activatedAt: new Date(),
        clientName: 'Mock Client',
        sessionId,
        companyName: 'Empresa Exemplo',
        email: 'teste@exemplo.com',
        licenseType: 'premium',
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
        },
        maxSessions: 1,
        currentSessions: 1,
        isActive: true
      };
      return { isValid: true, license: mockLicense };
    }
    if (!clientName || typeof clientName !== 'string') {
      return { isValid: false, error: 'Nome do cliente é obrigatório' };
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    let licenseType: 'trial' | 'basic' | 'premium' | 'enterprise' = 'trial';
    let features = {
      whatsappIntegration: true,
      campaignAutomation: false,
      reportGeneration: true,
      googleCalendar: false,
      aiAssistant: false,
      advancedAnalytics: false,
      contactGroups: false,
      scheduledMessages: false,
      voiceMessages: false
    };
    if (clientName.toLowerCase().includes('premium') || clientName.toLowerCase().includes('full')) {
      licenseType = 'premium';
      features = {
        whatsappIntegration: true,
        campaignAutomation: true,
        reportGeneration: true,
        googleCalendar: true,
        aiAssistant: true,
        advancedAnalytics: true,
        contactGroups: true,
        scheduledMessages: true,
        voiceMessages: true
      };
    } else if (clientName.toLowerCase().includes('basic') || clientName.toLowerCase().includes('standard')) {
      licenseType = 'basic';
      features = {
        whatsappIntegration: true,
        campaignAutomation: true,
        reportGeneration: true,
        googleCalendar: false,
        aiAssistant: false,
        advancedAnalytics: false,
        contactGroups: true,
        scheduledMessages: true,
        voiceMessages: false
      };
    } else if (clientName.toLowerCase().includes('enterprise') || clientName.toLowerCase().includes('corp')) {
      licenseType = 'enterprise';
      features = {
        whatsappIntegration: true,
        campaignAutomation: true,
        reportGeneration: true,
        googleCalendar: true,
        aiAssistant: true,
        advancedAnalytics: true,
        contactGroups: true,
        scheduledMessages: true,
        voiceMessages: true
      };
    }
    const license: LicenseInfo = {
      sessionId,
      clientName,
      companyName: `${clientName} - Empresa`,
      email: `${clientName.toLowerCase().replace(/\s+/g, '.')}@exemplo.com`,
      licenseType,
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + (licenseType === 'trial' ? 7 : 365) * 24 * 60 * 60 * 1000),
      features,
      maxSessions: 1,
      currentSessions: 1,
      isActive: true
    };
    console.log('✅ Licença validada com sucesso:', license);
    return { isValid: true, license };
  } catch (error) {
    console.error('🚨 Erro na validação da licença:', error);
    const errorMessage = error instanceof Error ? 
      `Erro na validação: ${error.message}` : 
      'Erro desconhecido na validação da licença';
    return { isValid: false, error: errorMessage };
  }
};

export const useLicenseStore = create<LicenseStore>()(
  persist(
    (set, get) => ({
      license: null,
      isActivated: false,
      isLoading: false,
      error: null,

      activateLicense: async (clientName: string, additionalInfo = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔍 Iniciando ativação de licença:', { clientName, additionalInfo });
          
          const result = await validateLicenseOnServer(clientName);
          
          console.log('📊 Resultado da validação:', result);
          
          if (result.isValid && result.license) {
            const license = {
              ...result.license,
              ...additionalInfo
            };
            
            console.log('✅ Licença ativada com sucesso:', license);
            
            set({ 
              license, 
              isActivated: true, 
              isLoading: false, 
              error: null 
            });
            
            return true;
          } else {
            console.log('❌ Falha na validação da licença:', result.error);
            
            set({ 
              license: null, 
              isActivated: false, 
              isLoading: false, 
              error: result.error || 'Falha na ativação da licença' 
            });
            
            return false;
          }
        } catch (error) {
          console.error('🚨 Erro interno ao ativar licença:', error);
          console.error('Stack trace:', error instanceof Error ? error.stack : 'Erro sem stack trace');
          
          const errorMessage = error instanceof Error ? 
            `Erro interno: ${error.message}` : 
            'Erro interno ao ativar licença';
            
          set({ 
            license: null, 
            isActivated: false, 
            isLoading: false, 
            error: errorMessage
          });
          
          return false;
        }
      },

      deactivateLicense: () => {
        set({ 
          license: null, 
          isActivated: false, 
          error: null 
        });
      },

      checkLicenseStatus: async () => {
        const { license } = get();
        
        if (!license) return false;
        
        // Corrigir comparação de datas:
        if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
          set({
            license: { ...license },
            isActivated: false,
            error: 'Licença expirada'
          });
          return false;
        }
        
        return true;
      },

      validateFeatureAccess: (feature: string) => {
        const { license } = get();
        return getFeatureAccess(feature, license || undefined);
      },

      getRemainingDays: () => {
        const { license } = get();
        
        if (!license) return 0;
        
        const now = new Date();
        const expiry = license.expiresAt ? new Date(license.expiresAt) : undefined;
        if (expiry) {
          const diffTime = expiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return Math.max(0, diffDays);
        }
        return 0;
      },

      refreshLicense: async () => {
        const { license } = get();
        
        if (!license) return;
        
        set({ isLoading: true });
        
        try {
          const result = await validateLicenseOnServer(license.clientName || '');
          
          if (result.isValid && result.license) {
            set({ 
              license: result.license, 
              isActivated: true, 
              isLoading: false, 
              error: null 
            });
          } else {
            set({ 
              isLoading: false, 
              error: result.error || 'Falha ao atualizar licença' 
            });
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Erro ao atualizar licença' 
          });
        }
      },

      getLicenseInfo: () => {
        return get().license;
      },

      getSessionId: () => {
        const { license } = get();
        return license?.sessionId || null;
      },

      getClientName: () => {
        const { license } = get();
        return license?.clientName || null;
      }
    }),
    {
      name: 'spr-license-store',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Migração para versões futuras
        if (version === 0) {
          // Migrar da versão 0 para 1
          return {
            ...persistedState,
            license: null,
            isActivated: false
          };
        }
        return persistedState;
      }
    }
  )
);

// Hook para verificar se uma funcionalidade está disponível
export const useFeatureAccess = (feature: string) => {
  const { validateFeatureAccess } = useLicenseStore();
  return validateFeatureAccess(feature);
};

// Hook para informações da licença
export const useLicenseInfo = () => {
  const { license, isActivated, getRemainingDays } = useLicenseStore();
  
  return {
    license,
    isActivated,
    remainingDays: getRemainingDays(),
    isExpired: license ? new Date() > new Date(license.expiresAt || '') : false,
    licenseType: license?.licenseType || 'trial'
  };
}; 