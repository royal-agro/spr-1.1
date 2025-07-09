// Tipos base do sistema SPR
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user' | 'client';
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
}

// Tipos para WhatsApp
export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  isBlocked: boolean;
  tags: string[];
}

export interface WhatsAppMessage {
  id: string;
  contactId: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  isFromMe: boolean;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: string;
}

export interface WhatsAppChat {
  id: string;
  contact: WhatsAppContact;
  messages: WhatsAppMessage[];
  unreadCount: number;
  lastMessage: WhatsAppMessage;
  isPinned: boolean;
  isMuted: boolean;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  participants: WhatsAppContact[];
  admins: string[];
  createdAt: Date;
  isActive: boolean;
}

// Tipos para Dashboard
export interface DashboardMetrics {
  totalMessages: number;
  totalContacts: number;
  activeChats: number;
  messagesPerDay: number;
  responseTime: number;
  deliveryRate: number;
  readRate: number;
}

export interface MessageStats {
  date: string;
  sent: number;
  received: number;
  delivered: number;
  read: number;
}

// Tipos para Commodities (SPR)
export interface Commodity {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdate: Date;
  unit: string;
  market: string;
}

export interface PriceAlert {
  id: string;
  commodityId: string;
  userId: string;
  type: 'above' | 'below';
  targetPrice: number;
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

// Tipos para Notificações
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  userId: string;
}

// Tipos para Configurações
export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'pt' | 'en';
  notifications: {
    whatsapp: boolean;
    priceAlerts: boolean;
    systemUpdates: boolean;
  };
  whatsapp: {
    autoReply: boolean;
    autoReplyMessage: string;
    businessHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
  };
}

// Tipos para API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipos para Formulários
export interface SendMessageForm {
  contactId: string;
  message: string;
  type: 'text' | 'image' | 'document';
  file?: File;
}

export interface CreateContactForm {
  name: string;
  phone: string;
  email?: string;
  tags: string[];
}

export interface CreateGroupForm {
  name: string;
  description?: string;
  participants: string[];
}

// Tipos para Estados da aplicação
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  settings: AppSettings;
}

export interface WhatsAppState {
  contacts: WhatsAppContact[];
  chats: WhatsAppChat[];
  groups: WhatsAppGroup[];
  activeChat: string | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  metrics: DashboardMetrics;
}

export interface CommodityState {
  commodities: Commodity[];
  alerts: PriceAlert[];
  selectedCommodity: string | null;
  isLoading: boolean;
  lastUpdate: Date | null;
} 