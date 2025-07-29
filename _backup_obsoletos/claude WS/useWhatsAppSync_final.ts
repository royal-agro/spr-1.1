import { useEffect, useCallback, useState } from 'react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { config } from '../config';
import type { WhatsAppMessage, WhatsAppChat } from '../types';

const WHATSAPP_API_BASE = config.whatsapp.apiUrl; // Servidor WhatsApp robusto
const REQUEST_TIMEOUT = 30000; // 30 segundos
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 segundos (aumentado de 2 segundos)

// Função de retry com exponential backoff
const retryRequest = async <T>(
  requestFn: () => Promise<T>, 
  maxRetries: number = RETRY_ATTEMPTS,
  baseDelay: number = RETRY_DELAY
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      console.log(`🔄 Tentativa ${i + 1}/${maxRetries} falhou:`, error instanceof Error ? error.message : String(error));
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Máximo de tentativas excedido');
};

// Função para criar requisições com timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const useWhatsAppSync = () => {
  const { 
    connectionStatus, 
    connectWhatsApp, 
    disconnectWhatsApp,
    chats,
    contacts,
    addMessage,
    updateChat,
    loadChatsFromServer,
    loadMessagesForChat
  } = useWhatsAppStore();
  
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Verificar status da conexão WhatsApp com retry
  const checkWhatsAppStatus = useCallback(async () => {
    try {
      console.log('🔍 Verificando status do WhatsApp...');
      
      const response = await retryRequest(() => 
        fetchWithTimeout(`${WHATSAPP_API_BASE}/api/status`)
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Status do WhatsApp:', data);
      
      // Atualizar estado baseado na resposta
      const isConnected = data.whatsappConnected || data.connected || false;
      
      if (isConnected && connectionStatus !== 'connected') {
        console.log('🔗 WhatsApp conectado, atualizando estado...');
        connectWhatsApp();
      } else if (!isConnected && connectionStatus === 'connected') {
        console.log('🔌 WhatsApp desconectado, atualizando estado...');
        disconnectWhatsApp();
      }
      
      setSyncError(null);
      setIsRetrying(false);
      return data;
    } catch (error) {
      console.error('❌ Erro ao verificar status WhatsApp:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setSyncError(`Erro de conexão: ${errorMsg}`);
      
      if (connectionStatus === 'connected') {
        disconnectWhatsApp();
      }
      
      return { whatsappConnected: false, error: errorMsg, connected: false };
    }
  }, [connectionStatus, connectWhatsApp, disconnectWhatsApp]);

  // Sincronizar chats do servidor WhatsApp real com retry
  const syncChats = useCallback(async () => {
    try {
      console.log('🔄 Sincronizando chats do WhatsApp...');
      
      const response = await retryRequest(() => 
        fetchWithTimeout(`${WHATSAPP_API_BASE}/api/chats`)
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.chats && Array.isArray(data.chats)) {
        // Converter formato do servidor para formato do store
        const convertedChats = data.chats.map((serverChat: any) => ({
          id: serverChat.id,
          contact: {
            id: serverChat.id,
            name: serverChat.name || 'Contato',
            phone: serverChat.id.replace('@c.us', '').replace('@g.us', ''),
            phoneNumber: serverChat.id.replace('@c.us', '').replace('@g.us', ''),
            isOnline: false,
            tags: ['WhatsApp']
          },
          messages: [], // Mensagens serão carregadas individualmente
          lastMessage: serverChat.lastMessage ? {
            id: 'last-' + serverChat.id,
            content: typeof serverChat.lastMessage === 'string' 
              ? serverChat.lastMessage 
              : (typeof serverChat.lastMessage === 'object' && serverChat.lastMessage.body 
                ? serverChat.lastMessage.body 
                : 'Mensagem'),
            timestamp: new Date((serverChat.timestamp || Date.now()) * 1000),
            isFromMe: false,
            status: 'read' as const,
            type: 'text' as const
          } : undefined,
          unreadCount: serverChat.unreadCount || 0,
          isPinned: false,
          isArchived: false,
          createdAt: new Date((serverChat.timestamp || Date.now()) * 1000)
        }));

        console.log(`✅ Sincronizados ${convertedChats.length} chats do WhatsApp`);
        
        // ATUALIZAR O STORE com os chats reais
        loadChatsFromServer(convertedChats);
        setSyncError(null);
        
        return convertedChats;
      }
      
      console.log('⚠️ Nenhum chat encontrado ou formato inválido');
      return [];
    } catch (error) {
      console.error('❌ Erro ao sincronizar chats:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setSyncError(`Erro ao carregar conversas: ${errorMsg}`);
      throw error;
    }
  }, [loadChatsFromServer]);

  // Sincronizar mensagens de um chat específico com retry
  const syncChatMessages = useCallback(async (chatId: string) => {
    try {
      console.log(`🔄 Carregando mensagens para chat: ${chatId}`);
      
      const response = await retryRequest(() => 
        fetchWithTimeout(`${WHATSAPP_API_BASE}/api/chats/${encodeURIComponent(chatId)}/messages?limit=50`)
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        const convertedMessages = data.messages.map((serverMsg: any) => ({
          id: serverMsg.id || `msg-${Date.now()}-${Math.random()}`,
          content: serverMsg.body || serverMsg.content || '',
          timestamp: new Date((serverMsg.timestamp || Date.now()) * 1000),
          isFromMe: serverMsg.fromMe || false,
          status: 'read' as const,
          type: serverMsg.hasMedia ? 'document' as const : 'text' as const
        }));

        // Ordenar mensagens por timestamp (mais antiga primeiro para a interface)
        const sortedMessages = convertedMessages.sort((a, b) => 
          a.timestamp.getTime() - b.timestamp.getTime()
        );

        console.log(`✅ Carregadas ${sortedMessages.length} mensagens para chat ${chatId}`);
        
        // ATUALIZAR O STORE com as mensagens reais
        loadMessagesForChat(chatId, sortedMessages);
        
        return sortedMessages;
      }
      
      console.log(`⚠️ Nenhuma mensagem encontrada para chat ${chatId}`);
      return [];
    } catch (error) {
      console.error('❌ Erro ao sincronizar mensagens:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Erro ao carregar mensagens: ${errorMsg}`);
    }
  }, [loadMessagesForChat]);

  // Enviar mensagem através do servidor WhatsApp com retry
  const sendMessage = useCallback(async (chatId: string, message: string) => {
    try {
      console.log(`📤 Enviando mensagem para ${chatId}: ${message}`);
      
      const response = await retryRequest(() => 
        fetchWithTimeout(`${WHATSAPP_API_BASE}/api/send-message`, {
          method: 'POST',
          body: JSON.stringify({
            number: chatId,
            message: message
          })
        })
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }

      console.log('✅ Mensagem enviada com sucesso');
      
      // Adicionar mensagem ao store localmente para feedback imediato
      const newMessage: WhatsAppMessage = {
        id: `sent-${Date.now()}-${Math.random()}`,
        content: message,
        timestamp: new Date(),
        isFromMe: true,
        status: 'pending' as const,
        type: 'text' as const
      };
      
      addMessage(chatId, newMessage);
      
      // Simular delay para mostrar status "pending"
      setTimeout(() => {
        // Atualizar status para "sent" após envio bem-sucedido
        const sentMessage: WhatsAppMessage = {
          ...newMessage,
          status: 'sent' as const
        };
        addMessage(chatId, sentMessage);
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Adicionar mensagem de erro local
      const errorMessage: WhatsAppMessage = {
        id: `error-${Date.now()}-${Math.random()}`,
        content: `❌ Erro ao enviar: ${errorMsg}`,
        timestamp: new Date(),
        isFromMe: false,
        status: 'error' as const,
        type: 'text' as const
      };
      
      addMessage(chatId, errorMessage);
      
      throw new Error(`Falha no envio: ${errorMsg}`);
    }
  }, [addMessage]);

  // Função de fallback para envio via endpoint alternativo
  const sendMessageFallback = useCallback(async (chatId: string, message: string) => {
    try {
      console.log(`📤 Tentando envio via endpoint alternativo para ${chatId}: ${message}`);
      
      const response = await retryRequest(() => 
        fetchWithTimeout(`${WHATSAPP_API_BASE}/api/whatsapp/send`, {
          method: 'POST',
          body: JSON.stringify({
            number: chatId,
            message: message
          })
        })
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }

      console.log('✅ Mensagem enviada via endpoint alternativo');
      return true;
    } catch (error) {
      console.error('❌ Erro no endpoint alternativo:', error);
      throw error;
    }
  }, []);

  // Enviar mensagem com fallback automático
  const sendMessageWithFallback = useCallback(async (chatId: string, message: string) => {
    try {
      // Tentar endpoint principal primeiro
      return await sendMessage(chatId, message);
    } catch (error) {
      console.log('🔄 Tentando endpoint alternativo...');
      try {
        return await sendMessageFallback(chatId, message);
      } catch (fallbackError) {
        console.error('❌ Ambos os endpoints falharam:', fallbackError);
        throw fallbackError;
      }
    }
  }, [sendMessage, sendMessageFallback]);

  // Sincronização automática quando conectado
  const syncData = useCallback(async () => {
    if (connectionStatus === 'connected') {
      try {
        console.log('🔄 Sincronizando dados do WhatsApp...');
        setIsRetrying(true);
        
        // Verificar status primeiro
        const status = await checkWhatsAppStatus();
        
        if (status.whatsappConnected || status.connected) {
          // Só sincronizar se WhatsApp estiver conectado
          await syncChats();
          setLastSync(new Date());
          setSyncError(null);
          console.log('✅ Sincronização concluída');
        } else {
          console.log('⚠️ WhatsApp não conectado, pulando sincronização');
          setSyncError('WhatsApp não conectado no servidor');
        }
      } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        setSyncError(`Erro na sincronização: ${errorMsg}`);
      } finally {
        setIsRetrying(false);
      }
    }
  }, [connectionStatus, checkWhatsAppStatus, syncChats]);

  // Auto-reconexão em caso de desconexão
  const handleReconnect = useCallback(async () => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      console.log('🔄 Verificando possibilidade de reconexão...');
      setIsRetrying(true);
      
      try {
        const status = await checkWhatsAppStatus();
        if (status.whatsappConnected || status.connected) {
          console.log('✅ Reconectando WhatsApp...');
          connectWhatsApp();
        } else {
          console.log('⚠️ WhatsApp ainda não conectado no servidor');
        }
      } catch (error) {
        console.log('⚠️ Servidor WhatsApp indisponível, tentando novamente em breve...');
      } finally {
        setIsRetrying(false);
      }
    }
  }, [connectionStatus, checkWhatsAppStatus, connectWhatsApp]);

  // Efeito para verificação inicial
  useEffect(() => {
    console.log('🚀 Inicializando useWhatsAppSync...');
    checkWhatsAppStatus();
  }, []);

  // Efeito para sincronização automática quando conectado
  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('🔗 WhatsApp conectado, iniciando sincronização automática...');
      syncData(); // Sincronizar imediatamente
      
      const interval = setInterval(syncData, config.whatsapp.syncInterval);
      return () => {
        console.log('🛑 Parando sincronização automática');
        clearInterval(interval);
      };
    }
  }, [connectionStatus, syncData]);

  // Efeito para tentativa de reconexão
  useEffect(() => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      const timeout = setTimeout(handleReconnect, config.whatsapp.reconnectInterval);
      return () => clearTimeout(timeout);
    }
  }, [connectionStatus, handleReconnect]);

  // Debug: log do estado atual
  useEffect(() => {
    console.log('📊 Estado useWhatsAppSync:', {
      connectionStatus,
      totalChats: chats.length,
      totalContacts: contacts.length,
      lastSync: lastSync?.toISOString(),
      syncError,
      isRetrying
    });
  }, [connectionStatus, chats.length, contacts.length, lastSync, syncError, isRetrying]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    totalChats: chats.length,
    totalContacts: contacts.length,
    unreadCount: chats.reduce((total, chat) => total + chat.unreadCount, 0),
    lastSync,
    syncError,
    isRetrying,
    
    // Funções principais
    syncData,
    syncChats,
    syncChatMessages,
    sendMessage: sendMessageWithFallback,
    connect: connectWhatsApp,
    disconnect: disconnectWhatsApp,
    checkStatus: checkWhatsAppStatus,
    
    // Função para forçar retry
    retry: () => {
      setSyncError(null);
      setIsRetrying(false);
      syncData();
    }
  };
};