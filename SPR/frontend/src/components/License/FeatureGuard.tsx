import React from 'react';
import { useFeatureAccess, useLicenseInfo } from '../../store/useLicenseStore';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeMessage?: boolean;
}

const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  children,
  fallback,
  showUpgradeMessage = true
}) => {
  const hasAccess = useFeatureAccess(feature);
  const { licenseType, isActivated } = useLicenseInfo();

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradeMessage) {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
      <div className="flex items-center justify-center mb-3">
        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-gray-900 mb-1">
        Funcionalidade Bloqueada
      </h3>
      
      <p className="text-xs text-gray-600 mb-3">
        {getFeatureMessage(feature, licenseType, isActivated)}
      </p>
      
      <button
        onClick={() => {
          // Aqui você pode implementar a lógica para upgrade
          console.log('Upgrade clicked for feature:', feature);
        }}
        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
      >
        {isActivated ? 'Fazer Upgrade' : 'Ativar Licença'}
      </button>
    </div>
  );
};

// Função auxiliar para mensagens específicas por funcionalidade
const getFeatureMessage = (feature: string, licenseType: string, isActivated: boolean): string => {
  if (!isActivated) {
    return 'Esta funcionalidade requer uma licença ativa.';
  }

  const messages: { [key: string]: { [licenseType: string]: string } } = {
    multiInstance: {
      trial: 'Múltiplas instâncias disponíveis apenas na licença Basic ou superior.',
      basic: 'Múltiplas instâncias disponíveis apenas na licença Premium ou superior.',
      premium: 'Esta funcionalidade está disponível na sua licença.',
      enterprise: 'Esta funcionalidade está disponível na sua licença.'
    },
    campaignAutomation: {
      trial: 'Automação de campanhas disponível apenas na licença Basic ou superior.',
      basic: 'Esta funcionalidade está disponível na sua licença.',
      premium: 'Esta funcionalidade está disponível na sua licença.',
      enterprise: 'Esta funcionalidade está disponível na sua licença.'
    },
    aiAssistant: {
      trial: 'Assistente IA disponível apenas na licença Premium ou superior.',
      basic: 'Assistente IA disponível apenas na licença Premium ou superior.',
      premium: 'Esta funcionalidade está disponível na sua licença.',
      enterprise: 'Esta funcionalidade está disponível na sua licença.'
    },
    advancedAnalytics: {
      trial: 'Análises avançadas disponíveis apenas na licença Premium ou superior.',
      basic: 'Análises avançadas disponíveis apenas na licença Premium ou superior.',
      premium: 'Esta funcionalidade está disponível na sua licença.',
      enterprise: 'Esta funcionalidade está disponível na sua licença.'
    },
    googleCalendar: {
      trial: 'Integração com Google Calendar disponível apenas na licença Premium ou superior.',
      basic: 'Integração com Google Calendar disponível apenas na licença Premium ou superior.',
      premium: 'Esta funcionalidade está disponível na sua licença.',
      enterprise: 'Esta funcionalidade está disponível na sua licença.'
    },
    voiceMessages: {
      trial: 'Mensagens de voz disponíveis apenas na licença Premium ou superior.',
      basic: 'Mensagens de voz disponíveis apenas na licença Premium ou superior.',
      premium: 'Esta funcionalidade está disponível na sua licença.',
      enterprise: 'Esta funcionalidade está disponível na sua licença.'
    }
  };

  return messages[feature]?.[licenseType] || 'Esta funcionalidade não está disponível na sua licença atual.';
};

export default FeatureGuard; 