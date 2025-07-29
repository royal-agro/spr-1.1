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

const ConnectivityStatus: React.FC<ConnectivityStatusProps> = ({ onStatusChange }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

  const checkConnectivity = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const isConnected = response.ok;
      setIsOnline(isConnected);
      setLastCheck(new Date());
      
      if (onStatusChange) {
        onStatusChange(isConnected);
      }
      
      console.log('🔍 Status de conectividade:', isConnected ? 'Online' : 'Offline');
    } catch (error) {
      console.error('❌ Erro ao verificar conectividade:', error);
      setIsOnline(false);
      setLastCheck(new Date());
      
      if (onStatusChange) {
        onStatusChange(false);
      }
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Verificar conectividade inicial
    checkConnectivity();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(checkConnectivity, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (isOnline === null) return 'text-gray-400';
    return isOnline ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-600" />;
    }
    
    if (isOnline === null) {
      return <WifiIcon className="w-4 h-4 text-gray-400" />;
    }
    
    return isOnline ? (
      <CheckCircleIcon className="w-4 h-4 text-green-600" />
    ) : (
      <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
    );
  };

  const getStatusText = () => {
    if (isChecking) return 'Verificando...';
    if (isOnline === null) return 'Verificando conexão...';
    return isOnline ? 'Backend Online' : 'Backend Offline';
  };

  const getStatusDescription = () => {
    if (isOnline === null) return 'Iniciando verificação...';
    if (isOnline) {
      return lastCheck ? `Última verificação: ${lastCheck.toLocaleTimeString()}` : 'Conectado';
    }
    return 'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3002.';
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      {getStatusIcon()}
      <div className="flex flex-col">
        <span className={`font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        <span className="text-xs text-gray-500">
          {getStatusDescription()}
        </span>
      </div>
      <button
        onClick={checkConnectivity}
        disabled={isChecking}
        className="ml-2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        title="Verificar conectividade"
      >
        <ArrowPathIcon className="w-3 h-3" />
      </button>
    </div>
  );
};

export default ConnectivityStatus; 