// src/types/index.ts
// Tipos corrigidos para o SPR WhatsApp System

export interface WhatsAppMessage {
  id: string;
  content: string;
  timestamp: Date;
  isFromMe: boolean;
  status: "read" | "sent" | "delivered";
  type: "text" | "image" | "audio" | "video" | "document" | "system";
}

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  phoneNumber: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  tags: string[];
  isBlocked?: boolean;
  isFavorite?: boolean;
}

export interface WhatsAppChat {
  id: string;
  contact: WhatsAppContact;
  messages: WhatsAppMessage[];
  lastMessage?: WhatsAppMessage;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WhatsAppState {
  connectionStatus: ConnectionStatus;
  qrCode: string | null;
  isConnected: boolean;
  contacts: WhatsAppContact[];
  chats: WhatsAppChat[];
  selectedChatId: string | null;
  isLoading: boolean;
  error: string | null;
  lastActivity: Date | null;
}

export interface DashboardMetrics {
  totalMessages: number;
  totalContacts: number;
  activeChats: number;
  messagesPerDay: number;
  responseTime: number;
  deliveryRate: number;
  readRate: number;
}

export interface SystemStatus {
  whatsappConnected: boolean;
  lastQrCode: string | null;
  clientInfo: {
    pushname?: string;
    wid?: string;
    platform?: string;
  } | null;
  lastSeen: string | null;
  metrics: DashboardMetrics;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface WhatsAppServerResponse {
  connected: boolean;
  whatsappConnected: boolean;
  qrCode?: string;
  clientInfo?: {
    pushname?: string;
    wid?: string;
    platform?: string;
  };
  lastSeen?: string;
  error?: string;
  timestamp: string;
}

export interface ChatListResponse {
  chats: Array<{
    id: string;
    name: string;
    lastMessage: string;
    timestamp: number;
    unreadCount: number;
    isGroup: boolean;
  }>;
  total?: number;
  error?: string;
  connected?: boolean;
  timestamp: string;
}

export interface MessageListResponse {
  messages: Array<{
    id: string;
    body: string;
    from: string;
    to: string;
    fromMe: boolean;
    timestamp: number;
    type: string;
    author?: string;
    hasMedia: boolean;
  }>;
  chatId: string;
  total?: number;
  error?: string;
  connected?: boolean;
  timestamp: string;
}

export interface SendMessageRequest {
  number: string;
  message: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  chatId?: string;
  error?: string;
  timestamp: string;
}

// Tipos para IA e geração de mensagens
export interface AIMessageRequest {
  prompt: string;
  tone?: 'formal' | 'normal' | 'informal' | 'alegre';
  contactName?: string;
  isGroup?: boolean;
  context?: string;
}

export interface AIMessageResponse {
  success: boolean;
  message: string;
  tone: string;
  contactName?: string;
  isGroup: boolean;
  context: string;
  timestamp: string;
  metrics?: {
    iaGenerations: number;
  };
}

// Tipos para configuração
export interface AppConfig {
  whatsapp: {
    apiUrl: string;
    syncInterval: number;
    reconnectInterval: number;
    retryAttempts: number;
    retryDelay: number;
    requestTimeout: number;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  ui: {
    theme: 'light' | 'dark';
    autoScroll: boolean;
    showTimestamps: boolean;
    messagePreviewLength: number;
  };
}

// Tipos para hooks
export interface UseWhatsAppSyncReturn {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  totalChats: number;
  totalContacts: number;
  unreadCount: number;
  lastSync: Date | null;
  syncError: string | null;
  isRetrying: boolean;
  
  // Funções
  syncData: () => Promise<void>;
  syncChats: () => Promise<WhatsAppChat[]>;
  syncChatMessages: (chatId: string) => Promise<WhatsAppMessage[]>;
  sendMessage: (chatId: string, message: string) => Promise<boolean>;
  connect: () => void;
  disconnect: () => void;
  checkStatus: () => Promise<WhatsAppServerResponse>;
  retry: () => void;
}

export interface UseDashboardDataReturn {
  data: DashboardMetrics & {
    connectionStatus: ConnectionStatus;
    lastUpdate: Date;
    messageHistory: Array<{
      date: string;
      sent: number;
      received: number;
    }>;
    recentActivity: Array<{
      id: string;
      type: 'message' | 'contact' | 'system';
      description: string;
      timestamp: Date;
      severity: 'info' | 'warning' | 'success' | 'error';
    }>;
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Utilitários para validação de tipos
export const isValidMessageStatus = (status: string): status is WhatsAppMessage['status'] => {
  return ['read', 'sent', 'delivered', 'error', 'pending', 'failed'].includes(status);
};

export const isValidConnectionStatus = (status: string): status is ConnectionStatus => {
  return ['connecting', 'connected', 'disconnected', 'error', 'reconnecting'].includes(status);
};

export const isValidMessageType = (type: string): type is WhatsAppMessage['type'] => {
  return ['text', 'image', 'audio', 'video', 'document', 'system'].includes(type);
};

// Tipos para o AppStore
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'manager';
  permissions: string[];
  lastLogin?: Date;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  notifications: {
    email: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    shareUsageData: boolean;
  };
  features: {
    autoReply: boolean;
    aiAssistant: boolean;
    campaignManager: boolean;
    analytics: boolean;
  };
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  settings: AppSettings;
  currentPage: string;
}

// Constantes
export const MESSAGE_STATUS = {
  READ: 'read' as const,
  SENT: 'sent' as const,
  DELIVERED: 'delivered' as const,
  ERROR: 'error' as const,
  PENDING: 'pending' as const,
  FAILED: 'failed' as const,
} as const;

export const CONNECTION_STATUS = {
  CONNECTING: 'connecting' as const,
  CONNECTED: 'connected' as const,
  DISCONNECTED: 'disconnected' as const,
  ERROR: 'error' as const,
  RECONNECTING: 'reconnecting' as const,
} as const;

export const MESSAGE_TYPE = {
  TEXT: 'text' as const,
  IMAGE: 'image' as const,
  AUDIO: 'audio' as const,
  VIDEO: 'video' as const,
  DOCUMENT: 'document' as const,
  SYSTEM: 'system' as const,
} as const;

// Tipos para sistema de Broadcast
export interface BroadcastGroup {
  id: number;
  name: string;
  description?: string;
  contact_count: number;
  created_by: string;
  created_at: string;
  auto_approve: boolean;
  manual_contacts: Array<{
    phone: string;
    name: string;
  }>;
}

export interface BroadcastCampaign {
  id: number;
  name: string;
  message_content: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  created_by: string;
  created_by_role: string;
  created_at: string;
  updated_at?: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  group_name: string;
  scheduled_for?: string;
  priority: 'low' | 'medium' | 'high';
  can_approve: boolean;
  can_edit: boolean;
  already_voted: boolean;
  my_vote?: 'approved' | 'rejected';
  change_log?: Array<{
    action: string;
    timestamp: string;
    user: string;
    role?: string;
    reason?: string;
  }>;
}

export interface BroadcastApproval {
  id: number;
  approver: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  decided_at?: string;
  original_message?: string;
  edited_message?: string;
}

export interface CreateBroadcastRequest {
  name: string;
  message_content: string;
  group_id: number;
  scheduled_for?: string;
  send_immediately: boolean;
  max_recipients: number;
}

export interface ApprovalRequest {
  action: 'approve' | 'reject' | 'edit';
  reason?: string;
  edited_message?: string;
}

export interface BroadcastStats {
  total_campaigns: number;
  pending_approvals: number;
  my_campaigns: number;
  active_groups: number;
  user_permissions: {
    can_create_campaigns: boolean;
    can_approve: boolean;
    can_edit: boolean;
    can_create_groups: boolean;
  };
}