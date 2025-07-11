import { useEffect, useCallback } from 'react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

export const useWhatsAppSync = () => {
  const { 
    connectionStatus, 
    connectWhatsApp, 
    disconnectWhatsApp,
    chats,
    contacts 
  } = useWhatsAppStore();

  // Sincronização automática quando conectado
  const syncData = useCallback(async () => {
    if (connectionStatus === 'connected') {
      try {
        // Em produção, faria chamadas para a API do WhatsApp
        console.log('Sincronizando dados do WhatsApp...');
        
        // Simular sincronização
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Sincronização concluída');
      } catch (error) {
        console.error('Erro na sincronização:', error);
      }
    }
  }, [connectionStatus]);

  // Auto-reconexão em caso de desconexão
  const handleReconnect = useCallback(async () => {
    if (connectionStatus === 'error') {
      console.log('Tentando reconectar...');
      await connectWhatsApp();
    }
  }, [connectionStatus, connectWhatsApp]);

  // Efeito para sincronização periódica
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const interval = setInterval(syncData, 30000); // Sincronizar a cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [connectionStatus, syncData]);

  // Efeito para tentativa de reconexão
  useEffect(() => {
    if (connectionStatus === 'error') {
      const timeout = setTimeout(handleReconnect, 5000); // Tentar reconectar após 5 segundos
      return () => clearTimeout(timeout);
    }
  }, [connectionStatus, handleReconnect]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    totalChats: chats.length,
    totalContacts: contacts.length,
    unreadCount: chats.reduce((total, chat) => total + chat.unreadCount, 0),
    syncData,
    connect: connectWhatsApp,
    disconnect: disconnectWhatsApp
  };
}; 