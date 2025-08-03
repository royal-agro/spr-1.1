import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '../config';
import { 
  WhatsAppMessage, 
  WhatsAppContact, 
  WhatsAppChat, 
  ConnectionStatus 
} from '../types';

export interface CampaignMessage {
  id: string;
  content: string;
  tone: 'formal' | 'normal' | 'informal' | 'alegre';
  scheduledTime?: Date;
  targetGroups: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'completed';
  createdAt: Date;
}

export interface AutoSendQueue {
  id: string;
  campaignId: string;
  contactId: string;
  message: string;
  scheduledTime: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

export interface DashboardMetrics {
  totalContacts: number;
  activeChats: number;
  messagesLastHour: number;
  responseRate: number;
  deliveryRate: number;
}

interface WhatsAppStore {
  // Estado de conexão
  connectionStatus: ConnectionStatus;
  isConnecting: boolean;
  isConnected: boolean;
  qrCode: string | null;
  
  // Dados
  contacts: WhatsAppContact[];
  chats: WhatsAppChat[];
  campaigns: CampaignMessage[];
  autoSendQueue: AutoSendQueue[];
  
  // Métricas
  metrics: DashboardMetrics;
  
  // Controle de operações (otimizações)
  _lastSyncTime: number;
  _operationLocks: Set<string>;
  _messageQueue: Map<string, Date>;
  
  // Ações
  connectWhatsApp: () => Promise<void>;
  disconnectWhatsApp: () => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  addMessage: (chatId: string, message: WhatsAppMessage) => void;
  createCampaign: (message: CampaignMessage) => void;
  scheduleMessage: (contactId: string, message: string, scheduledTime: Date) => void;
  updateChat: (chatId: string, updates: Partial<WhatsAppChat>) => void;
  addContact: (contact: WhatsAppContact) => void;
  removeContact: (contactId: string) => void;
  markAsRead: (chatId: string) => void;
  markMessageAsRead: (chatId: string, messageId: string) => void;
  archiveChat: (chatId: string) => void;
  pinChat: (chatId: string) => void;
  
  // Métodos para integração real
  loadChatsFromServer: (serverChats: any[]) => void;
  loadMessagesForChat: (chatId: string, messages: WhatsAppMessage[]) => void;
  updateConnectionStatus: (status: ConnectionStatus) => void;
  setQrCode: (qrCode: string | null) => void;
  
  // Utilitários de controle
  _lockOperation: (operation: string) => boolean;
  _unlockOperation: (operation: string) => void;
  _isRecentOperation: (operation: string, threshold?: number) => boolean;
}

// Constantes para controle de throttling
const SYNC_THROTTLE_INTERVAL = 2000; // 2 segundos (reduzido de 5s)
const MESSAGE_DUPLICATE_THRESHOLD = 60000; // 1 minuto
const HISTORY_RETENTION_DAYS = 3; // 3 dias de histórico
const LOAD_CHATS_THROTTLE = 15000; // 15 segundos
const LOAD_MESSAGES_THROTTLE = 10000; // 10 segundos

// Dados de exemplo
const createSampleData = () => {
  const sampleContacts: WhatsAppContact[] = [
    {
      id: 'contact-1',
      name: 'João Silva - Produtor de Soja',
      phone: '+55 11 99999-1111',
      phoneNumber: '+55 11 99999-1111',
      isOnline: true,
      lastSeen: new Date(),
      tags: ['Produtores de Soja', 'Clientes Premium']
    },
    {
      id: 'contact-2',
      name: 'Maria Santos - Cooperativa',
      phone: '+55 11 99999-2222',
      phoneNumber: '+55 11 99999-2222',
      isOnline: false,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
      tags: ['Cooperativas']
    },
    {
      id: 'contact-3',
      name: 'Pedro Costa - Milho',
      phone: '+55 11 99999-3333',
      phoneNumber: '+55 11 99999-3333',
      isOnline: false,
      lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
      tags: ['Produtores de Milho']
    },
    {
      id: 'contact-4',
      name: 'Ana Oliveira - Algodão',
      phone: '+55 11 99999-4444',
      phoneNumber: '+55 11 99999-4444',
      isOnline: true,
      lastSeen: new Date(),
      tags: ['Produtores de Algodão', 'Clientes Premium']
    },
    {
      id: 'contact-5',
      name: 'Carlos Ferreira - Corretor',
      phone: '+55 11 99999-5555',
      phoneNumber: '+55 11 99999-5555',
      isOnline: false,
      lastSeen: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas atrás
      tags: ['Corretores']
    }
  ];

  const sampleMessages: { [chatId: string]: WhatsAppMessage[] } = {
    'chat-1': [
      {
        id: 'msg-1-1',
        content: 'Bom dia! Como estão os preços da soja hoje?',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        isFromMe: false,
        status: 'read',
        type: 'text'
      },
      {
        id: 'msg-1-2',
        content: 'Bom dia, João! Os preços estão em alta hoje. Soja a R$ 145,50/saca na B3. Quer receber o relatório completo?',
        timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
        isFromMe: true,
        status: 'read',
        type: 'text'
      },
      {
        id: 'msg-1-3',
        content: 'Sim, por favor! E como está a previsão para os próximos dias?',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isFromMe: false,
        status: 'read',
        type: 'text'
      },
      {
        id: 'msg-1-4',
        content: 'Nossa análise indica tendência de alta para os próximos 5 dias, com possível valorização de 3-5%. Vou enviar o relatório técnico agora.',
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
        isFromMe: true,
        status: 'read',
        type: 'text'
      }
    ],
    'chat-2': [
      {
        id: 'msg-2-1',
        content: 'Boa tarde! Vocês têm análise sobre o milho para esta semana?',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isFromMe: false,
        status: 'read',
        type: 'text'
      },
      {
        id: 'msg-2-2',
        content: 'Boa tarde, Maria! Sim, temos análise completa. O milho está com movimento lateral, mas com potencial de alta devido à demanda externa.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        isFromMe: true,
        status: 'delivered',
        type: 'text'
      }
    ],
    'chat-3': [
      {
        id: 'msg-3-1',
        content: 'Olá! Gostaria de saber sobre as condições climáticas para o plantio.',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isFromMe: false,
        status: 'read',
        type: 'text'
      },
      {
        id: 'msg-3-2',
        content: 'Olá, Pedro! As condições estão favoráveis para o plantio na sua região. Chuvas previstas para os próximos 3 dias.',
        timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000),
        isFromMe: true,
        status: 'read',
        type: 'text'
      }
    ]
  };

  const sampleChats: WhatsAppChat[] = [
    {
      id: 'chat-1',
      contact: sampleContacts[0],
      messages: sampleMessages['chat-1'],
      lastMessage: sampleMessages['chat-1'][sampleMessages['chat-1'].length - 1],
      unreadCount: 0,
      isPinned: true,
      isArchived: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'chat-2',
      contact: sampleContacts[1],
      messages: sampleMessages['chat-2'],
      lastMessage: sampleMessages['chat-2'][sampleMessages['chat-2'].length - 1],
      unreadCount: 1,
      isPinned: false,
      isArchived: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'chat-3',
      contact: sampleContacts[2],
      messages: sampleMessages['chat-3'],
      lastMessage: sampleMessages['chat-3'][sampleMessages['chat-3'].length - 1],
      unreadCount: 0,
      isPinned: false,
      isArchived: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'chat-4',
      contact: sampleContacts[3],
      messages: [],
      unreadCount: 0,
      isPinned: false,
      isArchived: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'chat-5',
      contact: sampleContacts[4],
      messages: [],
      unreadCount: 2,
      isPinned: false,
      isArchived: false,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
    }
  ];

  return { sampleContacts, sampleChats };
};

export const useWhatsAppStore = create<WhatsAppStore>()(
  persist(
    (set, get) => {
      const { sampleContacts, sampleChats } = createSampleData();
      
      return {
        // Estado inicial
        connectionStatus: 'disconnected',
        isConnecting: false,
        isConnected: false,
        qrCode: null,
        contacts: sampleContacts,
        chats: sampleChats,
        campaigns: [],
        autoSendQueue: [],
        metrics: {
          totalContacts: sampleContacts.length,
          activeChats: sampleChats.filter(chat => !chat.isArchived).length,
          messagesLastHour: 12,
          responseRate: 85.5,
          deliveryRate: 98.2
        },

        // Controle de operações (otimizações)
        _lastSyncTime: 0,
        _operationLocks: new Set(),
        _messageQueue: new Map(),

        // Utilitários de controle
        _lockOperation: (operation: string) => {
          const state = get();
          if (state._operationLocks.has(operation)) {
            console.log(`🔒 Operação ${operation} já em andamento`);
            return false;
          }
          state._operationLocks.add(operation);
          return true;
        },

        _unlockOperation: (operation: string) => {
          const state = get();
          state._operationLocks.delete(operation);
        },

        _isRecentOperation: (operation: string, threshold = SYNC_THROTTLE_INTERVAL) => {
          const state = get();
          const now = Date.now();
          return (now - state._lastSyncTime) < threshold;
        },

        // Ações
        connectWhatsApp: async () => {
          if (!get()._lockOperation('connect')) return;
          
          set({ isConnecting: true, connectionStatus: 'connecting' });
          console.log('🔄 Iniciando conexão WhatsApp...');
          
          // Dynamic URL configuration with fallbacks
          const whatsappUrls = [
            config.whatsapp.apiUrl,
            process.env.REACT_APP_WHATSAPP_URL || 'http://localhost:3003',
            'http://localhost:3003',
            'http://127.0.0.1:3003'
          ].filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
          
          let lastError: Error | null = null;
          
          for (const baseUrl of whatsappUrls) {
            try {
              console.log(`🔄 Tentando conectar com ${baseUrl}...`);
              
              // Test connection first
              const testResponse = await fetch(`${baseUrl}/api/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
              });
              
              if (!testResponse.ok) {
                throw new Error(`Status check failed: ${testResponse.status}`);
              }
              
              console.log(`✅ Conexão estabelecida com ${baseUrl}`);
              
              // Open chat page with QR Code in new window
              const qrWindow = window.open(`${baseUrl}/chat`, '_blank', 'width=500,height=600');
              
              // Start connection process via API
              const connectResponse = await fetch(`${baseUrl}/api/whatsapp/connect`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
              });
              
              if (!connectResponse.ok) {
                console.warn(`API connect retornou: ${connectResponse.status}`);
              }
              
              const connectData = await connectResponse.json();
              console.log('🔄 Resposta da conexão:', connectData);
              
              // Check current status
              const statusResponse = await fetch(`${baseUrl}/api/status`);
              const statusData = await statusResponse.json();
              
              if (statusData.whatsappConnected) {
                set({ 
                  connectionStatus: 'connected', 
                  isConnecting: false,
                  isConnected: true,
                  qrCode: null 
                });
                console.log('✅ WhatsApp já conectado!');
              } else {
                // Try to get QR code
                try {
                  const qrResponse = await fetch(`${baseUrl}/api/qr`);
                  const qrData = await qrResponse.json();
                  
                  if (qrData.qrCode) {
                    set({ 
                      connectionStatus: 'connecting',
                      isConnecting: false,
                      isConnected: false,
                      qrCode: qrData.qrCode 
                    });
                    console.log('📱 QR Code obtido, aguardando scan...');
                  } else if (qrData.connected) {
                    set({ 
                      connectionStatus: 'connected', 
                      isConnecting: false,
                      isConnected: true,
                      qrCode: null 
                    });
                    console.log('✅ WhatsApp conectado via status check!');
                  } else {
                    set({ 
                      connectionStatus: 'disconnected',
                      isConnecting: false,
                      isConnected: false,
                      qrCode: null 
                    });
                    console.log('⚠️ QR Code não disponível ainda...');
                  }
                } catch (qrError) {
                  console.error('Erro ao obter QR code:', qrError);
                  set({ 
                    connectionStatus: 'connecting',
                    isConnecting: false,
                    isConnected: false,
                    qrCode: null 
                  });
                }
              }
              
              // Successfully connected to this URL, break the loop
              break;
              
            } catch (error) {
              console.error(`❌ Falha ao conectar com ${baseUrl}:`, error);
              lastError = error instanceof Error ? error : new Error(String(error));
              
              // If this is not the last URL, try the next one
              if (baseUrl !== whatsappUrls[whatsappUrls.length - 1]) {
                console.log('🔄 Tentando próxima URL...');
                continue;
              }
            }
          }
          
          // If we get here and still have an error, all URLs failed
          if (lastError) {
            console.error('❌ Todas as tentativas de conexão falharam:', lastError);
            set({ 
              connectionStatus: 'error', 
              isConnecting: false,
              isConnected: false,
              qrCode: null
            });
          }
          
          get()._unlockOperation('connect');
        },

        disconnectWhatsApp: () => {
          set({ 
            connectionStatus: 'disconnected',
            isConnected: false,
            qrCode: null 
          });
        },

        sendMessage: async (chatId: string, content: string) => {
          const { chats } = get();
          const chatIndex = chats.findIndex(chat => chat.id === chatId);
          
          if (chatIndex === -1) return;

          // Adicionar mensagem localmente primeiro
          const newMessage: WhatsAppMessage = {
            id: `msg-${Date.now()}`,
            content,
            timestamp: new Date(),
            isFromMe: true,
            status: 'sent',
            type: 'text'
          };

          const updatedChats = [...chats];
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            messages: [...updatedChats[chatIndex].messages, newMessage],
            lastMessage: newMessage
          };

          set({ chats: updatedChats });

          // Enviar através do servidor WhatsApp real com fallback
          try {
            const whatsappUrls = [
              config.whatsapp.apiUrl,
              process.env.REACT_APP_WHATSAPP_URL || 'http://localhost:3003',
              'http://localhost:3003',
              'http://127.0.0.1:3003'
            ].filter((url, index, self) => self.indexOf(url) === index);
            
            let response: Response | null = null;
            let lastError: Error | null = null;
            
            for (const baseUrl of whatsappUrls) {
              try {
                response = await fetch(`${baseUrl}/api/whatsapp/send`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    number: chatId,
                    message: content
                  }),
                  signal: AbortSignal.timeout(10000)
                });
                
                if (response.ok) {
                  console.log(`✅ Mensagem enviada via ${baseUrl}`);
                  break;
                }
              } catch (error) {
                console.warn(`⚠️ Falha ao enviar via ${baseUrl}:`, error);
                lastError = error instanceof Error ? error : new Error(String(error));
              }
            }
            
            if (!response || !response.ok) {
              throw lastError || new Error('Todos os servidores WhatsApp falharam');
            }

            const result = await response.json();
            
            if (result.success) {
              // Marcar como entregue
              setTimeout(() => {
                const { chats: currentChats } = get();
                const currentChatIndex = currentChats.findIndex(chat => chat.id === chatId);
                if (currentChatIndex === -1) return;

                const updatedChats = [...currentChats];
                const messageIndex = updatedChats[currentChatIndex].messages.findIndex(
                  msg => msg.id === newMessage.id
                );
                
                if (messageIndex !== -1) {
                  updatedChats[currentChatIndex].messages[messageIndex].status = 'delivered';
                  set({ chats: updatedChats });
                }
              }, 1000);

              setTimeout(() => {
                const { chats: currentChats } = get();
                const currentChatIndex = currentChats.findIndex(chat => chat.id === chatId);
                if (currentChatIndex === -1) return;

                const updatedChats = [...currentChats];
                const messageIndex = updatedChats[currentChatIndex].messages.findIndex(
                  msg => msg.id === newMessage.id
                );
                
                if (messageIndex !== -1) {
                  updatedChats[currentChatIndex].messages[messageIndex].status = 'read';
                  set({ chats: updatedChats });
                }
              }, 3000);
            } else {
              throw new Error(result.error || 'Erro ao enviar mensagem');
            }
          } catch (error) {
            console.error('Erro ao enviar mensagem pelo servidor:', error);
            
            // Marcar mensagem como erro
            const { chats: currentChats } = get();
            const currentChatIndex = currentChats.findIndex(chat => chat.id === chatId);
            if (currentChatIndex !== -1) {
              const updatedChats = [...currentChats];
              const messageIndex = updatedChats[currentChatIndex].messages.findIndex(
                msg => msg.id === newMessage.id
              );
              
              if (messageIndex !== -1) {
                updatedChats[currentChatIndex].messages[messageIndex].content += ' ❌ (Erro ao enviar)';
                set({ chats: updatedChats });
              }
            }
            
            throw error;
          }
        },

        addMessage: (chatId: string, message: WhatsAppMessage) => {
          const { chats } = get();
          const chatIndex = chats.findIndex(chat => chat.id === chatId);
          
          if (chatIndex === -1) return;

          const updatedChats = [...chats];
          const currentChat = updatedChats[chatIndex];
          
          // Verificar se a mensagem já existe para evitar duplicatas
          const messageExists = currentChat.messages.some(existingMsg => 
            existingMsg.id === message.id || 
            (existingMsg.content === message.content && 
             Math.abs(existingMsg.timestamp.getTime() - message.timestamp.getTime()) < MESSAGE_DUPLICATE_THRESHOLD)
          );
          
          if (!messageExists) {
            // Adicionar nova mensagem ao final da lista
            const updatedMessages = [...currentChat.messages, message];
            
            // Ordenar por timestamp para garantir ordem correta
            const sortedMessages = updatedMessages.sort((a, b) => 
              a.timestamp.getTime() - b.timestamp.getTime()
            );
            
            updatedChats[chatIndex] = {
              ...currentChat,
              messages: sortedMessages,
              lastMessage: message
            };

            set({ chats: updatedChats });
            console.log(`✅ Mensagem adicionada ao chat ${chatId}: ${message.content.substring(0, 50)}...`);
          } else {
            console.log(`⚠️ Mensagem já existe no chat ${chatId}, ignorando duplicata`);
          }
        },

        createCampaign: (campaign: CampaignMessage) => {
          const { campaigns } = get();
          set({ campaigns: [...campaigns, campaign] });
        },

        scheduleMessage: (contactId: string, message: string, scheduledTime: Date) => {
          const { autoSendQueue } = get();
          const newQueueItem: AutoSendQueue = {
            id: `queue-${Date.now()}`,
            campaignId: `campaign-${Date.now()}`,
            contactId,
            message,
            scheduledTime,
            status: 'pending',
            attempts: 0
          };
          
          set({ autoSendQueue: [...autoSendQueue, newQueueItem] });
        },

        updateChat: (chatId: string, updates: Partial<WhatsAppChat>) => {
          const { chats } = get();
          const updatedChats = chats.map(chat =>
            chat.id === chatId ? { ...chat, ...updates } : chat
          );
          set({ chats: updatedChats });
        },

        addContact: (contact: WhatsAppContact) => {
          const { contacts } = get();
          set({ contacts: [...contacts, contact] });
        },

        removeContact: (contactId: string) => {
          const { contacts, chats } = get();
          const updatedContacts = contacts.filter(contact => contact.id !== contactId);
          const updatedChats = chats.filter(chat => chat.contact.id !== contactId);
          set({ contacts: updatedContacts, chats: updatedChats });
        },

        markAsRead: (chatId: string) => {
          const { chats } = get();
          const updatedChats = chats.map(chat => {
            if (chat.id === chatId) {
              // Marcar todas as mensagens como lidas
              const updatedMessages = chat.messages.map(message => ({
                ...message,
                status: message.isFromMe ? message.status : 'read'
              }));
              
              return {
                ...chat,
                messages: updatedMessages,
                unreadCount: 0, // Zerar contador de não lidas
                lastMessage: updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1] : chat.lastMessage
              };
            }
            return chat;
          });
          set({ chats: updatedChats });
          console.log(`📖 Chat ${chatId} marcado como lido (${updatedChats.find(c => c.id === chatId)?.messages.length || 0} mensagens)`);
        },

        markMessageAsRead: (chatId: string, messageId: string) => {
          const { chats } = get();
          const updatedChats = chats.map(chat => {
            if (chat.id === chatId) {
              const updatedMessages = chat.messages.map(message => 
                message.id === messageId && !message.isFromMe 
                  ? { ...message, status: 'read' as const }
                  : message
              );
              
              // Recalcular contador de não lidas
              const unreadCount = updatedMessages.filter(msg => !msg.isFromMe && msg.status !== 'read').length;
              
              return {
                ...chat,
                messages: updatedMessages,
                unreadCount,
                lastMessage: updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1] : chat.lastMessage
              };
            }
            return chat;
          });
          set({ chats: updatedChats });
        },

        archiveChat: (chatId: string) => {
          const { chats } = get();
          const updatedChats = chats.map(chat =>
            chat.id === chatId ? { ...chat, isArchived: !chat.isArchived } : chat
          );
          set({ chats: updatedChats });
        },

        pinChat: (chatId: string) => {
          const { chats } = get();
          const updatedChats = chats.map(chat =>
            chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
          );
          set({ chats: updatedChats });
        },

        // Novos métodos para integração real (OTIMIZADOS)
        loadChatsFromServer: (serverChats: any[]) => {
          if (get()._isRecentOperation('loadChats', LOAD_CHATS_THROTTLE)) {
            console.log('⚠️ Sincronização de chats muito recente, pulando...');
            return;
          }

          const { chats: existingChats } = get();
          
          // Mesclar chats do servidor com chats existentes, preservando mensagens
          const mergedChats = serverChats.map(serverChat => {
            const existingChat = existingChats.find(chat => chat.id === serverChat.id);
            
            if (existingChat) {
              // Preservar mensagens existentes e atualizar outras propriedades
              return {
                ...serverChat,
                messages: existingChat.messages || [], // PRESERVAR mensagens existentes
                lastMessage: existingChat.lastMessage || serverChat.lastMessage,
                unreadCount: serverChat.unreadCount || existingChat.unreadCount || 0
              };
            } else {
              // Novo chat, usar dados do servidor
              return {
                ...serverChat,
                messages: [], // Inicializar sem mensagens
                lastMessage: serverChat.lastMessage,
                unreadCount: serverChat.unreadCount || 0
              };
            }
          });
          
          set({ chats: mergedChats });
          set(state => ({ _lastSyncTime: Date.now() }));
          console.log(`✅ ${mergedChats.length} chats carregados do servidor (mensagens preservadas)`);
        },

        loadMessagesForChat: (chatId: string, messages: WhatsAppMessage[]) => {
          const { chats } = get();
          const updatedChats = chats.map(chat => {
            if (chat.id === chatId) {
              // Preservar mensagens existentes e adicionar novas
              const existingMessages = chat.messages || [];
              const newMessages = messages || [];
              
              // Calcular data limite (3 dias atrás)
              const retentionDate = new Date();
              retentionDate.setDate(retentionDate.getDate() - HISTORY_RETENTION_DAYS);
              
              // Filtrar mensagens existentes para manter apenas as dos últimos 3 dias
              const recentExistingMessages = existingMessages.filter(msg => 
                msg.timestamp.getTime() >= retentionDate.getTime()
              );
              
              // Combinar mensagens existentes com novas, evitando duplicatas
              const combinedMessages = [...recentExistingMessages];
              
              // Adicionar apenas mensagens que não existem
              newMessages.forEach(newMsg => {
                const exists = combinedMessages.some(existingMsg => 
                  existingMsg.id === newMsg.id || 
                  (existingMsg.content === newMsg.content && 
                   Math.abs(existingMsg.timestamp.getTime() - newMsg.timestamp.getTime()) < MESSAGE_DUPLICATE_THRESHOLD)
                );
                if (!exists) {
                  combinedMessages.push(newMsg);
                }
              });
              
              // Ordenar por timestamp (mais antiga primeiro)
              const sortedMessages = combinedMessages.sort((a, b) => 
                a.timestamp.getTime() - b.timestamp.getTime()
              );
              
              // Log detalhado para debug
              console.log(`📊 Chat ${chatId}:`);
              console.log(`   - Mensagens existentes: ${existingMessages.length}`);
              console.log(`   - Mensagens recentes (${HISTORY_RETENTION_DAYS} dias): ${recentExistingMessages.length}`);
              console.log(`   - Novas mensagens: ${newMessages.length}`);
              console.log(`   - Total após combinação: ${sortedMessages.length}`);
              
              return { 
                ...chat, 
                messages: sortedMessages,
                lastMessage: sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : chat.lastMessage
              };
            }
            return chat;
          });
          
          set({ chats: updatedChats });
          set(state => ({ _lastSyncTime: Date.now() }));
          console.log(`✅ Chat ${chatId} atualizado com ${messages.length} mensagens (total: ${updatedChats.find(c => c.id === chatId)?.messages.length || 0})`);
        },

        updateConnectionStatus: (status: ConnectionStatus) => {
          set({ connectionStatus: status });
        },

        setQrCode: (qrCode: string | null) => {
          set({ qrCode });
        }
      };
    },
    {
      name: 'whatsapp-store',
      partialize: (state) => ({
        contacts: state.contacts,
        chats: state.chats,
        campaigns: state.campaigns
      })
    }
  )
); 