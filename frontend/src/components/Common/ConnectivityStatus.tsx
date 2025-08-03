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

  // Dynamic URL configuration with fallbacks
  const WHATSAPP_URLS = [
    process.env.REACT_APP_WHATSAPP_URL || 'http://localhost:3003',
    'http://localhost:3003',
    'http://127.0.0.1:3003'
  ].filter((url, index, self) => self.indexOf(url) === index);
  
  const SPR_URLS = [
    process.env.REACT_APP_SPR_API_URL || 'http://localhost:8000',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ].filter((url, index, self) => self.indexOf(url) === index);

  const checkWhatsAppConnectivity = async (retryCount = 0) => {
    setWhatsappStatus(prev => ({ ...prev, isChecking: true }));
    
    let isConnected = false;
    let lastError: Error | null = null;
    
    for (const url of WHATSAPP_URLS) {
      try {
        console.log(`🔍 Testando WhatsApp: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${url}/api/status`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          isConnected = true;
          console.log(`✅ WhatsApp Online via ${url}:`, data);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ WhatsApp falhou via ${url}:`, error instanceof Error ? error.message : String(error));
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    setWhatsappStatus({
      isOnline: isConnected,
      lastCheck: new Date(),
      isChecking: false
    });
    
    // Auto-retry on failure (max 3 times)
    if (!isConnected && retryCount < 3) {
      console.log(`🔄 WhatsApp retry ${retryCount + 1}/3 em 5s...`);
      setTimeout(() => checkWhatsAppConnectivity(retryCount + 1), 5000);
    }
    
    console.log('🔍 WhatsApp Status Final:', isConnected ? 'Online' : 'Offline');
  };

  const checkSPRConnectivity = async (retryCount = 0) => {
    setSprStatus(prev => ({ ...prev, isChecking: true }));
    
    let isConnected = false;
    let lastError: Error | null = null;
    
    for (const url of SPR_URLS) {
      try {
        console.log(`🔍 Testando SPR: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          isConnected = true;
          console.log(`✅ SPR Online via ${url}:`, data);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ SPR falhou via ${url}:`, error instanceof Error ? error.message : String(error));
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    setSprStatus({
      isOnline: isConnected,
      lastCheck: new Date(),
      isChecking: false
    });
    
    // Auto-retry on failure (max 3 times)
    if (!isConnected && retryCount < 3) {
      console.log(`🔄 SPR retry ${retryCount + 1}/3 em 5s...`);
      setTimeout(() => checkSPRConnectivity(retryCount + 1), 5000);
    }
    
    console.log('🔍 SPR Status Final:', isConnected ? 'Online' : 'Offline');
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