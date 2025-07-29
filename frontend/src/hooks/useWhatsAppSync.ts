import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { WhatsAppMessage } from '../types';
import { config } from '../config';

// Constantes para controle de throttling
const REQUEST_TIMEOUT = 15000; // 15 segundos
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 3000; // 3 segundos
const SYNC_THROTTLE_INTERVAL = 10000; // 10 segundos (aumentado)
const MESSAGE_DUPLICATE_THRESHOLD = 60000; // 1 minuto
const STATUS_CHECK_INTERVAL = 15000; // 15 segundos
const SYNC_INTERVAL = 30000; // 30 segundos (aumentado)

// URL base para API do WhatsApp
const WHATSAPP_API_BASE = config.whatsapp.apiUrl;

// Função de retry com exponential backoff
const retryRequest = async <T>(
  requestFn: () => Promise<T>, 
  maxRetries: number = RETRY_ATTEMPTS,
  baseDelay: number = RETRY_DELAY
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff com jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`⚠️ Tentativa ${attempt + 1} falhou, aguardando ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Função de fetch com timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastOperationTime, setLastOperationTime] = useState<number>(0);
  
  // Refs para controle de operações
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  // Verificar se operação é muito recente
  const isRecentOperation = (operation: string, threshold = SYNC_THROTTLE_INTERVAL): boolean => {
    const now = Date.now();
    return (now - lastOperationTime) < threshold;
  };

  // Verificar status da conexão WhatsApp com retry
  const checkWhatsAppStatus = useCallback(async () => {
    if (isRecentOperation('checkStatus', STATUS_CHECK_INTERVAL)) {
      console.log('⚠️ Verificação de status muito recente, pulando...');
      return { whatsappConnected: false, connected: false };
    }

    try {
      console.log('🔍 Verificando status do WhatsApp...');
      setLastOperationTime(Date.now());
      
      const response = await retryRequest(() => 
        fetchWithTimeout(`${WHATSAPP_API_BASE}/api/status`)
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log('⚠️ Rate limit atingido, aguardando...');
          // Aguardar um pouco antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 2000));
          throw new Error(`HTTP 429: Rate limit exceeded - aguarde um momento`);
        }
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
  }, [connectionStatus, connectWhatsApp, disconnectWhatsApp, isRecentOperation]);

  // Sincronizar chats do servidor WhatsApp real com retry
  const syncChats = useCallback(async () => {
    if (isRecentOperation('syncChats', SYNC_THROTTLE_INTERVAL)) {
      console.log('⚠️ Sincronização de chats muito recente, pulando...');
      return [];
    }

    try {
      console.log('🔄 Sincronizando chats do WhatsApp...');
      setLastOperationTime(Date.now());
      
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
  }, [loadChatsFromServer, isRecentOperation]);

  // Sincronizar mensagens de um chat específico com retry
  const syncChatMessages = useCallback(async (chatId: string) => {
    try {
      console.log(`🔄 Carregando mensagens para chat: ${chatId}`);
      setLastOperationTime(Date.now());
      
      const response = await retryRequest(() => 
        fetchWithTimeout(`${WHATSAPP_API_BASE}/api/chats/${encodeURIComponent(chatId)}/messages?limit=100`)
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

        console.log(`✅ Carregadas ${sortedMessages.length} mensagens do servidor para chat ${chatId}`);
        
        if (sortedMessages.length > 0) {
          console.log('📋 Primeiras 3 mensagens:', sortedMessages.slice(0, 3).map(m => ({ 
            id: m.id, 
            content: m.content.substring(0, 50),
            timestamp: m.timestamp.toISOString()
          })));
        }
        
        // ATUALIZAR O STORE com as mensagens reais (preservando histórico)
        loadMessagesForChat(chatId, sortedMessages);
        
        return sortedMessages;
      }
      
      console.log(`⚠️ Nenhuma mensagem encontrada no servidor para chat ${chatId}`);
      return [];
    } catch (error) {
      console.error('❌ Erro ao sincronizar mensagens:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Erro ao carregar mensagens: ${errorMsg}`);
    }
  }, [loadMessagesForChat]);

  // Enviar mensagem através do servidor WhatsApp com retry
  const sendMessage = useCallback(async (chatId: string, message: string) => {
    if (isRecentOperation('sendMessage', 2000)) { // 2 segundos para envio
      console.log('⚠️ Envio de mensagem muito recente, aguarde...');
      throw new Error('Envio muito frequente, aguarde um momento');
    }

    try {
      console.log(`📤 Enviando mensagem para ${chatId}: ${message}`);
      setLastOperationTime(Date.now());
      
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
        status: 'sent' as const,
        type: 'text' as const
      };
      
      addMessage(chatId, newMessage);
      
      // Aguardar um pouco e verificar se a mensagem foi realmente enviada
      setTimeout(async () => {
        try {
          console.log('🔄 Verificando se mensagem foi enviada com sucesso...');
          
          // Verificar status da mensagem no servidor
          const statusResponse = await fetchWithTimeout(`${WHATSAPP_API_BASE}/api/status`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('✅ Servidor WhatsApp confirmou envio');
            
            // Forçar sincronização das mensagens para garantir que apareça
            setTimeout(async () => {
              try {
                console.log('🔄 Sincronizando mensagens após envio...');
                await syncChatMessages(chatId);
              } catch (error) {
                console.error('⚠️ Erro na sincronização pós-envio:', error);
              }
            }, 2000);
            
            // Atualizar status da mensagem para 'delivered'
            const { chats } = useWhatsAppStore.getState();
            const updatedChats = chats.map(chat => {
              if (chat.id === chatId) {
                const updatedMessages = chat.messages.map(msg => {
                  if (msg.id === newMessage.id) {
                    return { ...msg, status: 'delivered' as const };
                  }
                  return msg;
                });
                return { ...chat, messages: updatedMessages };
              }
              return chat;
            });
            useWhatsAppStore.setState({ chats: updatedChats });
          }
        } catch (error) {
          console.error('⚠️ Erro ao verificar status da mensagem:', error);
        }
      }, 3000); // Aguardar 3 segundos para o servidor processar
      
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
        status: 'read' as const,
        type: 'text' as const
      };
      
      addMessage(chatId, errorMessage);
      
      throw new Error(`Falha no envio: ${errorMsg}`);
    }
  }, [addMessage, isRecentOperation, syncChatMessages]);

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

  // Função de envio com fallback
  const sendMessageWithFallback = useCallback(async (chatId: string, message: string) => {
    try {
      return await sendMessage(chatId, message);
    } catch (error) {
      console.log('⚠️ Primeiro endpoint falhou, tentando alternativo...');
      try {
        return await sendMessageFallback(chatId, message);
      } catch (fallbackError) {
        console.error('❌ Ambos os endpoints falharam:', fallbackError);
        throw fallbackError;
      }
    }
  }, [sendMessage, sendMessageFallback]);

  // Sincronização automática quando conectado (COM DEBOUNCE)
  const syncData = useCallback(async () => {
    if (connectionStatus === 'connected' && !syncInProgress) {
      try {
        console.log('🔄 Sincronizando dados do WhatsApp...');
        setSyncInProgress(true);
        
        // Verificar status primeiro
        const status = await checkWhatsAppStatus();
        
        if (status.whatsappConnected || status.connected) {
          // Só sincronizar se WhatsApp estiver conectado
          const chats = await syncChats();
          setLastSync(new Date());
          setSyncError(null);
          console.log('✅ Sincronização concluída');
          
          // Sincronizar mensagens de todos os chats
          if (chats.length > 0) {
            console.log('🔄 Sincronizando mensagens de todos os chats...');
            for (const chat of chats) {
              try {
                await syncChatMessages(chat.id);
              } catch (error) {
                console.error(`❌ Erro ao sincronizar mensagens do chat ${chat.id}:`, error);
              }
            }
          }
        } else {
          console.log('⚠️ WhatsApp não conectado, pulando sincronização');
          setSyncError('WhatsApp não conectado no servidor');
        }
      } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        setSyncError(`Erro na sincronização: ${errorMsg}`);
      } finally {
        setSyncInProgress(false);
      }
    }
  }, [connectionStatus, checkWhatsAppStatus, syncChats, syncChatMessages, syncInProgress]);

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

  // Efeito para verificação inicial (apenas uma vez)
  useEffect(() => {
    if (!isInitialized && !isInitializingRef.current) {
      console.log('🚀 Inicializando useWhatsAppSync...');
      isInitializingRef.current = true;
      setIsInitialized(true);
      
      // Delay para evitar chamadas simultâneas
      const timeout = setTimeout(() => {
        checkWhatsAppStatus();
        isInitializingRef.current = false;
      }, 2000); // Aumentado para 2 segundos
      
      return () => {
        clearTimeout(timeout);
        isInitializingRef.current = false;
      };
    }
  }, [isInitialized, checkWhatsAppStatus]);

  // Efeito para sincronização automática quando conectado (COM DEBOUNCE)
  useEffect(() => {
    if (connectionStatus === 'connected' && !syncInProgress) {
      console.log('🔗 WhatsApp conectado, iniciando sincronização automática...');
      
      // Primeira sincronização imediata
      const initialSync = setTimeout(() => {
        if (connectionStatus === 'connected') {
          syncData();
        }
      }, 1000); // Delay reduzido para 1 segundo
      
      // Sincronização periódica mais frequente
      const interval = setInterval(() => {
        if (connectionStatus === 'connected' && !syncInProgress) {
          syncData();
        }
      }, 10000); // A cada 10 segundos
      
      return () => {
        console.log('🛑 Parando sincronização automática');
        clearTimeout(initialSync);
        clearInterval(interval);
      };
    }
  }, [connectionStatus, syncData, syncInProgress]);

  // Efeito para verificação periódica de status (separado da sincronização)
  useEffect(() => {
    if (connectionStatus === 'connected') {
      // Limpar timeout anterior
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      
      // Verificação periódica de status
      statusTimeoutRef.current = setTimeout(() => {
        if (connectionStatus === 'connected') {
          checkWhatsAppStatus();
        }
      }, STATUS_CHECK_INTERVAL);
      
      return () => {
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }
      };
    }
  }, [connectionStatus, checkWhatsAppStatus]);

  // Efeito para tentativa de reconexão (com debounce maior)
  useEffect(() => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      // Delay maior para evitar spam de reconexão
      const timeout = setTimeout(handleReconnect, config.whatsapp.reconnectInterval * 3);
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