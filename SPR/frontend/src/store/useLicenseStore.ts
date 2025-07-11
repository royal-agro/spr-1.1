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
  activateLicense: (sessionId: string, clientName: string, additionalInfo?: Partial<LicenseInfo>) => Promise<boolean>;
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

// Função para gerar ID de sessão único
const generateSessionId = () => {
  return `spr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Função para validar formato do ID de sessão
const validateSessionId = (sessionId: string): boolean => {
  // Formato esperado: spr-timestamp-randomstring ou formato personalizado
  return sessionId.length >= 8 && sessionId.length <= 50;
};

// Função para simular validação de licença no servidor
const validateLicenseOnServer = async (sessionId: string, clientName: string): Promise<{
  isValid: boolean;
  license?: LicenseInfo;
  error?: string;
}> => {
  try {
    console.log('🔍 Validando licença no servidor:', { sessionId, clientName });
    
    // Em desenvolvimento, simular validação
    if (shouldBypassLicensing()) {
      console.log('🚀 Modo desenvolvimento: bypassando licenciamento');
      
      const mockLicense: LicenseInfo = {
        sessionId,
        clientName,
        companyName: 'Empresa Teste',
        email: 'teste@exemplo.com',
        licenseType: 'premium',
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        features: {
          whatsappIntegration: true,
          multiInstance: true,
          campaignAutomation: true,
          reportGeneration: true,
          googleCalendar: true,
          aiAssistant: true,
          advancedAnalytics: true,
          contactGroups: true,
          scheduledMessages: true,
          voiceMessages: true
        },
        maxSessions: 5,
        currentSessions: 1,
        isActive: true
      };
      
      return { isValid: true, license: mockLicense };
    }

    // Validações básicas
    if (!sessionId || typeof sessionId !== 'string') {
      return { isValid: false, error: 'ID de sessão é obrigatório' };
    }
    
    if (!clientName || typeof clientName !== 'string') {
      return { isValid: false, error: 'Nome do cliente é obrigatório' };
    }
    
    if (!validateSessionId(sessionId)) {
      return { isValid: false, error: 'ID de sessão inválido (deve ter entre 8 e 50 caracteres)' };
    }
    
    if (clientName.length < 2) {
      return { isValid: false, error: 'Nome do cliente deve ter pelo menos 2 caracteres' };
    }

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular diferentes tipos de licença baseado no ID
    let licenseType: 'trial' | 'basic' | 'premium' | 'enterprise' = 'trial';
    let features = {
      whatsappIntegration: true,
      multiInstance: false,
      campaignAutomation: false,
      reportGeneration: true,
      googleCalendar: false,
      aiAssistant: false,
      advancedAnalytics: false,
      contactGroups: false,
      scheduledMessages: false,
      voiceMessages: false
    };
    
    // Determinar tipo de licença baseado em padrões no sessionId
    const sessionIdLower = sessionId.toLowerCase();
    
    if (sessionIdLower.includes('premium') || sessionIdLower.includes('full')) {
      licenseType = 'premium';
      features = {
        whatsappIntegration: true,
        multiInstance: true,
        campaignAutomation: true,
        reportGeneration: true,
        googleCalendar: true,
        aiAssistant: true,
        advancedAnalytics: true,
        contactGroups: true,
        scheduledMessages: true,
        voiceMessages: true
      };
    } else if (sessionIdLower.includes('basic') || sessionIdLower.includes('standard')) {
      licenseType = 'basic';
      features = {
        whatsappIntegration: true,
        multiInstance: false,
        campaignAutomation: true,
        reportGeneration: true,
        googleCalendar: false,
        aiAssistant: false,
        advancedAnalytics: false,
        contactGroups: true,
        scheduledMessages: true,
        voiceMessages: false
      };
    } else if (sessionIdLower.includes('enterprise') || sessionIdLower.includes('corp')) {
      licenseType = 'enterprise';
      features = {
        whatsappIntegration: true,
        multiInstance: true,
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
      maxSessions: licenseType === 'enterprise' ? 10 : licenseType === 'premium' ? 5 : 3,
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

      activateLicense: async (sessionId: string, clientName: string, additionalInfo = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔍 Iniciando ativação de licença:', { sessionId, clientName, additionalInfo });
          
          const result = await validateLicenseOnServer(sessionId, clientName);
          
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
        
        // Verificar se a licença expirou
        if (new Date() > license.expiresAt) {
          set({ 
            license: { ...license, isActive: false }, 
            isActivated: false, 
            error: 'Licença expirada' 
          });
          return false;
        }
        
        return true;
      },

      validateFeatureAccess: (feature: string) => {
        const { license } = get();
        return getFeatureAccess(feature, license);
      },

      getRemainingDays: () => {
        const { license } = get();
        
        if (!license) return 0;
        
        const now = new Date();
        const expiry = license.expiresAt;
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
      },

      refreshLicense: async () => {
        const { license } = get();
        
        if (!license) return;
        
        set({ isLoading: true });
        
        try {
          const result = await validateLicenseOnServer(license.sessionId, license.clientName);
          
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
    isExpired: license ? new Date() > license.expiresAt : false,
    licenseType: license?.licenseType || 'trial'
  };
}; 