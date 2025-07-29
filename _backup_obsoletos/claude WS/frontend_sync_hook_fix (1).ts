import { useEffect, useCallback, useState } from 'react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { config } from '../config';
import type { WhatsAppMessage, WhatsAppChat } from '../types';

const WHATSAPP_API_BASE = config.whatsapp.apiUrl; // Servidor WhatsApp robusto
const REQUEST_TIMEOUT = 15000; // 15 segundos (reduzido de 30)
const RETRY_ATTEMPTS = 2; // 2 tentativas (reduzido de 3)
const RETRY_DELAY = 3000; // 3 segundos (reduzido de 5)

// Função de retry MAIS RÁPIDA para desenvolvimento
const retryRequest = async <T>(
  requestFn: () => Promise<T>, 
  maxRetries: number = RETRY_ATTEMPTS,
  baseDelay: number = RETRY_DELAY
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`🔄 Tentativa ${i + 1}/${maxRetries} falhou:`, errorMsg);
      
      // Se for HTTP 429, esperar mais tempo
      if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        console.warn(`⚠️ Rate limiting detectado - aguardando ${baseDelay * 2}ms antes da próxima tentativa`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * 2));
        }
        continue;
      }
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Delay normal para outros erros
      const delay = baseDelay + (i * 1000); // Linear ao invés de exponential
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Máximo de tentativas excedido');
};

// Função para criar requisições com timeout REDUZIDO
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
        'Cache-Control': 'no-cache',
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

  // Verificar status da conexão WhatsApp OTIMIZADO para rate limiting
  const checkWhatsAppStatus = useCallback(async () => {
    try {
      console.log('🔍 Verificando status do WhatsApp...');
      
      // Fazer requisição SEM retry para status (já que não há rate limiting neste endpoint)
      const response = await fetchWithTimeout(`${WHATSAPP_API_BASE}/api/status`);
      
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
      
      // Se for rate limiting, usar mensagem específica
      if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        setSyncError('Rate limiting ativo - aguardando...');
      } else {
        setSyncError(`Erro de conexão: ${errorMsg}`);
      }
      
      if (connectionStatus === 'connected') {
        disconnectWhatsApp();
      }
      
      return { whatsappConnected: false, error: errorMsg, connected: false };
    }
  }, [connectionStatus, connectWhatsApp, disconnectWhatsApp]);

  // Sincronizar chats OTIMIZADO
  const syncChats = useCallback(async () => {
    try {
      console.log('🔄 Sincronizando chats do WhatsApp...');
      
      // Usar retry apenas se necessário
      const response = await fetchWithTimeout(`${WHATSAPP_API_BASE}/api/chats`);
      
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

  // Sincronizar mensagens OTIMIZADO
  const syncChatMessages = useCallback(async (chatId: string) => {
    try {
      console.log(`🔄 Carregando mensagens para chat: ${chatId}`);
      
      const response = await fetchWithTimeout(`${WHATSAPP_API_BASE}/api/chats/${encodeURIComponent(chatId)}/messages?limit=50`);
      
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

  // Enviar mensagem OTIMIZADO com retry apenas para rate limiting
  const sendMessage = useCallback(async (chatId: string, message: string) => {
    try {
      console.log(`📤 Enviando mensagem para ${chatId}: ${message}`);
      
      // Usar retry APENAS para envio de mensagens (que tem rate limiting)
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

  // Função de fallback OTIMIZADA
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

  // Sincronização MENOS AGRESSIVA para evitar rate limiting
  const syncData = useCallback(async () => {
    if (connectionStatus === 'connected') {
      try {
        console.log('🔄 Sincronizando dados do WhatsApp...');
        setIsRetrying(true);
        
        // Verificar status primeiro SEM retry (status endpoint não tem rate limiting)
        const status = await checkWhatsAppStatus();
        
        if (status.whatsappConnected || status.connected) {
          // Aguardar um pouco antes de sincronizar chats para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 500));
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
        
        if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
          setSyncError('Rate limiting ativo - sincronização pausada');
        } else {
          setSyncError(`Erro na sincronização: ${errorMsg}`);
        }
      } finally {
        setIsRetrying(false);
      }
    }
  }, [connectionStatus, checkWhatsAppStatus, syncChats]);

  // Auto-reconexão MENOS AGRESSIVA
  const handleReconnect = useCallback(async () => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      console.log('🔄 Verificando possibilidade de reconexão...');
      setIsRetrying(true);
      
      try {
        // Aguardar um pouco antes de tentar reconectar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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

  // Efeito para verificação inicial ÚNICA
  useEffect(() => {
    console.log('🚀 Inicializando useWhatsAppSync...');
    // Aguardar um pouco antes da primeira verificação
    setTimeout(() => {
      checkWhatsAppStatus();
    }, 1000);
  }, []); // REMOVIDO checkWhatsAppStatus das dependências para evitar loops

  // Efeito para sincronização automática MENOS FREQUENTE
  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('🔗 WhatsApp conectado, iniciando sincronização automática...');
      
      // Sincronizar imediatamente, mas com delay
      setTimeout(() => {
        syncData();
      }, 2000);
      
      // Sincronização menos frequente (60 segundos ao invés de config padrão)
      const interval = setInterval(syncData, 60000);
      return () => {
        console.log('🛑 Parando sincronização automática');
        clearInterval(interval);
      };
    }
  }, [connectionStatus]); // REMOVIDO syncData das dependências

  // Efeito para tentativa de reconexão MENOS FREQUENTE
  useEffect(() => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      // Reconexão menos frequente (30 segundos)
      const timeout = setTimeout(handleReconnect, 30000);
      return () => clearTimeout(timeout);
    }
  }, [connectionStatus]); // REMOVIDO handleReconnect das dependências

  // Debug: log do estado atual MENOS FREQUENTE
  useEffect(() => {
    const logState = () => {
      console.log('📊 Estado useWhatsAppSync:', {
        connectionStatus,
        totalChats: chats.length,
        totalContacts: contacts.length,
        lastSync: lastSync?.toISOString(),
        syncError,
        isRetrying
      });
    };
    
    // Log inicial e depois a cada 30 segundos
    logState();
    const interval = setInterval(logState, 30000);
    return () => clearInterval(interval);
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
    
    // Função para forçar retry com delay
    retry: () => {
      setSyncError(null);
      setIsRetrying(false);
      // Aguardar um pouco antes de tentar novamente
      setTimeout(() => {
        syncData();
      }, 3000);
    }
  };
};