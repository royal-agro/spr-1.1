import React, { useState } from 'react';
import { useLicenseStore } from '../../store/useLicenseStore';
import { LicenseInfo } from '../../config';

interface LicenseActivationProps {
  onActivated?: (license: LicenseInfo) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const LicenseActivation: React.FC<LicenseActivationProps> = ({ 
  onActivated, 
  onCancel, 
  isModal = false 
}) => {
  const { activateLicense, isLoading, error } = useLicenseStore();
  
  const [formData, setFormData] = useState({
    sessionId: '',
    clientName: '',
    companyName: '',
    email: '',
    phone: ''
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.sessionId.trim()) {
      errors.sessionId = 'ID da sessão é obrigatório';
    } else if (formData.sessionId.length < 8) {
      errors.sessionId = 'ID da sessão deve ter pelo menos 8 caracteres';
    }
    
    if (!formData.clientName.trim()) {
      errors.clientName = 'Nome do cliente é obrigatório';
    } else if (formData.clientName.length < 2) {
      errors.clientName = 'Nome do cliente deve ter pelo menos 2 caracteres';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Telefone inválido';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const additionalInfo = {
      companyName: formData.companyName || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined
    };
    
    const success = await activateLicense(
      formData.sessionId.trim(),
      formData.clientName.trim(),
      additionalInfo
    );
    
    if (success) {
      const { license } = useLicenseStore.getState();
      if (license && onActivated) {
        onActivated(license);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro específico quando o usuário começar a digitar
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateExampleSessionId = () => {
    const examples = [
      'spr-premium-2024-abc123',
      'spr-basic-cliente-xyz789',
      'spr-enterprise-corp-def456',
      'minha-empresa-premium-2024'
    ];
    
    return examples[Math.floor(Math.random() * examples.length)];
  };

  const containerClass = isModal 
    ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    : "min-h-screen bg-gray-50 flex items-center justify-center p-4";

  return (
    <div className={containerClass}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ativação de Licença
          </h2>
          <p className="text-gray-600">
            Insira suas credenciais para ativar o SPR
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session ID */}
          <div>
            <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-1">
              ID da Sessão *
            </label>
            <input
              type="text"
              id="sessionId"
              value={formData.sessionId}
              onChange={(e) => handleInputChange('sessionId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.sessionId ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: spr-premium-2024-abc123"
              disabled={isLoading}
            />
            {validationErrors.sessionId && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.sessionId}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Exemplo: <button 
                type="button" 
                onClick={() => handleInputChange('sessionId', generateExampleSessionId())}
                className="text-blue-600 hover:underline"
              >
                {generateExampleSessionId()}
              </button>
            </p>
          </div>

          {/* Client Name */}
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Cliente *
            </label>
            <input
              type="text"
              id="clientName"
              value={formData.clientName}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.clientName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Seu nome ou nome da empresa"
              disabled={isLoading}
            />
            {validationErrors.clientName && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.clientName}</p>
            )}
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:underline flex items-center"
            >
              {showAdvanced ? 'Ocultar' : 'Mostrar'} opções avançadas
              <svg 
                className={`w-4 h-4 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-200">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome da sua empresa (opcional)"
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="seu@email.com (opcional)"
                  disabled={isLoading}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+55 11 99999-9999 (opcional)"
                  disabled={isLoading}
                />
                {validationErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ativando...
                </>
              ) : (
                'Ativar Licença'
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Precisa de ajuda? Entre em contato com o suporte técnico
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseActivation; 