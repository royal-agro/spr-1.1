import React, { useState } from 'react';
import { useLicenseStore, useLicenseInfo } from '../../store/useLicenseStore';
import LicenseActivation from './LicenseActivation';

interface LicenseStatusProps {
  showInHeader?: boolean;
  showFullDetails?: boolean;
}

const LicenseStatus: React.FC<LicenseStatusProps> = ({ 
  showInHeader = false, 
  showFullDetails = false 
}) => {
  const { 
    license, 
    deactivateLicense, 
    refreshLicense, 
    isLoading 
  } = useLicenseStore();
  
  const { 
    isActivated, 
    remainingDays, 
    isExpired, 
    licenseType 
  } = useLicenseInfo();
  
  const [showActivation, setShowActivation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Se não está ativado, mostrar botão de ativação
  if (!isActivated) {
    if (showInHeader) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Não ativado</span>
          <button
            onClick={() => setShowActivation(true)}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
          >
            Ativar
          </button>
          {showActivation && (
            <LicenseActivation
              isModal={true}
              onActivated={() => setShowActivation(false)}
              onCancel={() => setShowActivation(false)}
            />
          )}
        </div>
      );
    }
    
    return <LicenseActivation />;
  }

  // Status da licença
  const getStatusColor = () => {
    if (isExpired) return 'text-red-600';
    if (remainingDays <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusText = () => {
    if (isExpired) return 'Expirada';
    if (remainingDays <= 7) return 'Expirando em breve';
    return 'Ativa';
  };

  const getLicenseTypeLabel = (licenseType: string) => {
    const labels: { [key: string]: string } = {
      trial: 'Teste',
      basic: 'Básica',
      premium: 'Premium',
      enterprise: 'Empresarial'
    };
    return labels[licenseType] || 'Desconhecida';
  };

  const getLicenseTypeColor = (licenseType: string) => {
    const colors: { [key: string]: string } = {
      trial: 'bg-yellow-100 text-yellow-800',
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-green-100 text-green-800'
    };
    return colors[licenseType] || 'bg-gray-100 text-gray-800';
  };

  // Versão para header
  if (showInHeader) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-500' : remainingDays <= 7 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
        <span className="text-sm text-gray-600">
          {license?.clientName}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${getLicenseTypeColor(licenseType)}`}>
          {getLicenseTypeLabel(licenseType)}
        </span>
        <button
          onClick={() => setShowDetails(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          Detalhes
        </button>
        
        {showDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <LicenseStatus showFullDetails={true} />
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Versão completa
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Status da Licença
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <button
            onClick={refreshLicense}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {isLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* License Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <p className="text-sm text-gray-900">{license?.clientName}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID da Sessão
          </label>
          <p className="text-sm text-gray-900 font-mono break-all">
            {license?.sessionId}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Licença
          </label>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLicenseTypeColor(licenseType)}`}>
            {getLicenseTypeLabel(licenseType)}
          </span>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Válida até
          </label>
          <p className="text-sm text-gray-900">
            {license?.expiresAt.toLocaleDateString('pt-BR')}
            <span className={`ml-2 ${getStatusColor()}`}>
              ({remainingDays} dias restantes)
            </span>
          </p>
        </div>
        
        {license?.companyName && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <p className="text-sm text-gray-900">{license.companyName}</p>
          </div>
        )}
        
        {license?.email && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-sm text-gray-900">{license.email}</p>
          </div>
        )}
      </div>

      {/* Sessions Info */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sessões
        </label>
        <div className="bg-gray-50 rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Sessões ativas: {license?.currentSessions || 0} / {license?.maxSessions || 0}
            </span>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, ((license?.currentSessions || 0) / (license?.maxSessions || 1)) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      {showFullDetails && license?.features && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Funcionalidades Disponíveis
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(license.features).map(([feature, enabled]) => (
              <div key={feature} className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className={`text-sm ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                  {getFeatureLabel(feature)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-3">
        <button
          onClick={() => setShowActivation(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Alterar Licença
        </button>
        <button
          onClick={deactivateLicense}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Desativar
        </button>
      </div>

      {/* Activation Modal */}
      {showActivation && (
        <LicenseActivation
          isModal={true}
          onActivated={() => setShowActivation(false)}
          onCancel={() => setShowActivation(false)}
        />
      )}
    </div>
  );
};

// Função auxiliar para labels das funcionalidades
const getFeatureLabel = (feature: string): string => {
  const labels: { [key: string]: string } = {
    whatsappIntegration: 'Integração WhatsApp',
    multiInstance: 'Múltiplas Instâncias',
    campaignAutomation: 'Automação de Campanhas',
    reportGeneration: 'Geração de Relatórios',
    googleCalendar: 'Google Calendar',
    aiAssistant: 'Assistente IA',
    advancedAnalytics: 'Análises Avançadas',
    contactGroups: 'Grupos de Contatos',
    scheduledMessages: 'Mensagens Agendadas',
    voiceMessages: 'Mensagens de Voz'
  };
  return labels[feature] || feature;
};

export default LicenseStatus; 