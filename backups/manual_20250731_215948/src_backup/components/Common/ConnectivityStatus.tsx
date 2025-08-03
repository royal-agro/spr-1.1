import React, { useState, useEffect } from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

interface ConnectivityStatusProps {
  onStatusChange?: (isOnline: boolean) => void;
}

interface ServiceStatus {
  isOnline: boolean | null;
  lastCheck: Date | null;
  isChecking: boolean;
}

const ConnectivityStatus: React.FC<ConnectivityStatusProps> = ({ onStatusChange }) => {
  const [whatsappStatus, setWhatsappStatus] = useState<ServiceStatus>({
    isOnline: null,
    lastCheck: null,
    isChecking: false
  });
  const [sprStatus, setSprStatus] = useState<ServiceStatus>({
    isOnline: null,
    lastCheck: null,
    isChecking: false
  });

  const WHATSAPP_URL = process.env.REACT_APP_WHATSAPP_URL || 'http://localhost:3002';
  const SPR_URL = process.env.REACT_APP_SPR_API_URL || 'http://localhost:8000';

  const checkWhatsAppConnectivity = async () => {
    setWhatsappStatus(prev => ({ ...prev, isChecking: true }));
    try {
      const response = await fetch(`${WHATSAPP_URL}/api/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const isConnected = response.ok;
      setWhatsappStatus({
        isOnline: isConnected,
        lastCheck: new Date(),
        isChecking: false
      });
      
      console.log('🔍 WhatsApp Status:', isConnected ? 'Online' : 'Offline');
    } catch (error) {
      console.error('❌ Erro ao verificar WhatsApp:', error);
      setWhatsappStatus({
        isOnline: false,
        lastCheck: new Date(),
        isChecking: false
      });
    }
  };

  const checkSPRConnectivity = async () => {
    setSprStatus(prev => ({ ...prev, isChecking: true }));
    try {
      const response = await fetch(`${SPR_URL}/commodities/`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const isConnected = response.ok;
      setSprStatus({
        isOnline: isConnected,
        lastCheck: new Date(),
        isChecking: false
      });
      
      console.log('🔍 SPR Status:', isConnected ? 'Online' : 'Offline');
    } catch (error) {
      console.error('❌ Erro ao verificar SPR:', error);
      setSprStatus({
        isOnline: false,
        lastCheck: new Date(),
        isChecking: false
      });
    }
  };

  const checkAllConnectivity = async () => {
    await Promise.all([
      checkWhatsAppConnectivity(),
      checkSPRConnectivity()
    ]);
    
    // Notificar status geral - apenas se ambos os status não forem null
    if (whatsappStatus.isOnline !== null && sprStatus.isOnline !== null) {
      const overallStatus = whatsappStatus.isOnline && sprStatus.isOnline;
      if (onStatusChange) {
        onStatusChange(overallStatus);
      }
    }
  };

  useEffect(() => {
    // Verificar conectividade inicial
    checkAllConnectivity();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(checkAllConnectivity, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getServiceIcon = (status: ServiceStatus) => {
    if (status.isChecking) {
      return <ArrowPathIcon className="w-3 h-3 animate-spin text-blue-600" />;
    }
    
    if (status.isOnline === null) {
      return <WifiIcon className="w-3 h-3 text-gray-400" />;
    }
    
    return status.isOnline ? (
      <CheckCircleIcon className="w-3 h-3 text-green-600" />
    ) : (
      <ExclamationTriangleIcon className="w-3 h-3 text-red-600" />
    );
  };

  const getServiceStatusColor = (status: ServiceStatus) => {
    if (status.isOnline === null) return 'text-gray-400';
    return status.isOnline ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="flex items-center space-x-4 text-sm">
      {/* WhatsApp Status */}
      <div className="flex items-center space-x-2">
        {getServiceIcon(whatsappStatus)}
        <div className="flex flex-col">
          <span className={`font-medium text-xs ${getServiceStatusColor(whatsappStatus)}`}>
            WhatsApp: {whatsappStatus.isOnline === null ? 'Verificando...' : whatsappStatus.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      
      {/* SPR Status */}
      <div className="flex items-center space-x-2">
        {getServiceIcon(sprStatus)}
        <div className="flex flex-col">
          <span className={`font-medium text-xs ${getServiceStatusColor(sprStatus)}`}>
            SPR: {sprStatus.isOnline === null ? 'Verificando...' : sprStatus.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      
      {/* Refresh Button */}
      <button
        onClick={checkAllConnectivity}
        disabled={whatsappStatus.isChecking || sprStatus.isChecking}
        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        title="Verificar conectividade"
      >
        <ArrowPathIcon className="w-3 h-3" />
      </button>
    </div>
  );
};

export default ConnectivityStatus; 