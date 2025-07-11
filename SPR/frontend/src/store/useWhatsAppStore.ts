import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WhatsAppMessage {
  id: string;
  content: string;
  timestamp: Date;
  isFromMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'audio' | 'document';
}

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string; // Tornado obrigatório para consistência
  phoneNumber: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  isBlocked?: boolean;
  tags?: string[];
}

export interface WhatsAppChat {
  id: string;
  contact: WhatsAppContact;
  messages: WhatsAppMessage[];
  lastMessage?: WhatsAppMessage;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
}

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
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
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
  archiveChat: (chatId: string) => void;
  pinChat: (chatId: string) => void;
}

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

        // Ações
        connectWhatsApp: async () => {
          set({ isConnecting: true, connectionStatus: 'connecting' });
          
          try {
            // Simular processo de conexão
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            set({ 
              connectionStatus: 'connected', 
              isConnecting: false,
              isConnected: true,
              qrCode: null 
            });
          } catch (error) {
            set({ 
              connectionStatus: 'error', 
              isConnecting: false,
              isConnected: false
            });
          }
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

          // Simular entrega e leitura
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
        },

        addMessage: (chatId: string, message: WhatsAppMessage) => {
          const { chats } = get();
          const chatIndex = chats.findIndex(chat => chat.id === chatId);
          
          if (chatIndex === -1) return;

          const updatedChats = [...chats];
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            messages: [...updatedChats[chatIndex].messages, message],
            lastMessage: message
          };

          set({ chats: updatedChats });
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
          const updatedChats = chats.map(chat =>
            chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
          );
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