import { create } from 'zustand';
import { 
  WhatsAppState, 
  WhatsAppContact, 
  WhatsAppChat, 
  WhatsAppGroup, 
  WhatsAppMessage,
  DashboardMetrics 
} from '@/types';

interface WhatsAppStore extends WhatsAppState {
  // Actions
  setContacts: (contacts: WhatsAppContact[]) => void;
  addContact: (contact: WhatsAppContact) => void;
  updateContact: (id: string, updates: Partial<WhatsAppContact>) => void;
  removeContact: (id: string) => void;
  
  setChats: (chats: WhatsAppChat[]) => void;
  addChat: (chat: WhatsAppChat) => void;
  updateChat: (id: string, updates: Partial<WhatsAppChat>) => void;
  removeChat: (id: string) => void;
  
  setGroups: (groups: WhatsAppGroup[]) => void;
  addGroup: (group: WhatsAppGroup) => void;
  updateGroup: (id: string, updates: Partial<WhatsAppGroup>) => void;
  removeGroup: (id: string) => void;
  
  setActiveChat: (chatId: string | null) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  setConnected: (isConnected: boolean) => void;
  
  addMessage: (chatId: string, message: WhatsAppMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<WhatsAppMessage>) => void;
  markMessagesAsRead: (chatId: string) => void;
  
  updateMetrics: (metrics: Partial<DashboardMetrics>) => void;
}

const defaultMetrics: DashboardMetrics = {
  totalMessages: 0,
  totalContacts: 0,
  activeChats: 0,
  messagesPerDay: 0,
  responseTime: 0,
  deliveryRate: 0,
  readRate: 0,
};

export const useWhatsAppStore = create<WhatsAppStore>((set, get) => ({
  // State
  contacts: [],
  chats: [],
  groups: [],
  activeChat: null,
  isConnected: false,
  connectionStatus: 'disconnected',
  metrics: defaultMetrics,

  // Actions
  setContacts: (contacts) => set({ contacts }),
  
  addContact: (contact) => 
    set((state) => ({
      contacts: [...state.contacts, contact]
    })),
  
  updateContact: (id, updates) =>
    set((state) => ({
      contacts: state.contacts.map(contact =>
        contact.id === id ? { ...contact, ...updates } : contact
      )
    })),
  
  removeContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter(contact => contact.id !== id)
    })),
  
  setChats: (chats) => set({ chats }),
  
  addChat: (chat) =>
    set((state) => ({
      chats: [...state.chats, chat]
    })),
  
  updateChat: (id, updates) =>
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === id ? { ...chat, ...updates } : chat
      )
    })),
  
  removeChat: (id) =>
    set((state) => ({
      chats: state.chats.filter(chat => chat.id !== id)
    })),
  
  setGroups: (groups) => set({ groups }),
  
  addGroup: (group) =>
    set((state) => ({
      groups: [...state.groups, group]
    })),
  
  updateGroup: (id, updates) =>
    set((state) => ({
      groups: state.groups.map(group =>
        group.id === id ? { ...group, ...updates } : group
      )
    })),
  
  removeGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter(group => group.id !== id)
    })),
  
  setActiveChat: (chatId) => set({ activeChat: chatId }),
  
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  
  setConnected: (isConnected) => set({ isConnected }),
  
  addMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, message],
              lastMessage: message,
              unreadCount: message.isFromMe ? chat.unreadCount : chat.unreadCount + 1
            }
          : chat
      )
    })),
  
  updateMessage: (chatId, messageId, updates) =>
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              )
            }
          : chat
      )
    })),
  
  markMessagesAsRead: (chatId) =>
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              unreadCount: 0,
              messages: chat.messages.map(msg =>
                !msg.isFromMe && msg.status !== 'read'
                  ? { ...msg, status: 'read' as const }
                  : msg
              )
            }
          : chat
      )
    })),
  
  updateMetrics: (newMetrics) =>
    set((state) => ({
      metrics: { ...state.metrics, ...newMetrics }
    })),
})); 