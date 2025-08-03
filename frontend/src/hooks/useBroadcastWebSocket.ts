import { useState, useEffect, useRef, useCallback } from 'react';
import { config } from '../config';

export interface BroadcastMessage {
  id: string;
  type: 'campaign' | 'notification' | 'status' | 'error';
  title: string;
  content: string;
  timestamp: Date;
  recipients?: string[];
  status: 'pending' | 'sending' | 'sent' | 'failed';
  metadata?: Record<string, any>;
}

export interface BroadcastStats {
  totalCampaigns: number;
  activeCampaigns: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  deliveryRate: number;
}

export interface UseBroadcastWebSocketReturn {
  isConnected: boolean;
  messages: BroadcastMessage[];
  stats: BroadcastStats;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError: string | null;
  
  // Actions
  sendBroadcast: (message: Omit<BroadcastMessage, 'id' | 'timestamp'>) => Promise<void>;
  createCampaign: (campaign: {
    title: string;
    content: string;
    recipients: string[];
    scheduledTime?: Date;
  }) => Promise<string>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
}

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000, 30000]; // Progressive backoff

export const useBroadcastWebSocket = (): UseBroadcastWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [stats, setStats] = useState<BroadcastStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    messagesSent: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    deliveryRate: 0
  });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const intentionalDisconnectRef = useRef(false);

  const getWebSocketUrl = useCallback(() => {
    // Try multiple URLs for WebSocket connection
    const baseUrls = [
      config.api.baseUrl,
      process.env.REACT_APP_SPR_API_URL || 'http://localhost:8000',
      'http://localhost:8000',
      'http://localhost:3002' // Backend server also supports WebSocket
    ];
    
    // Convert HTTP URLs to WebSocket URLs
    return baseUrls.map(url => {
      const wsUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `ws://${wsUrl}/ws/broadcast`;
    });
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    intentionalDisconnectRef.current = false;
    setConnectionStatus('connecting');
    setLastError(null);

    const wsUrls = getWebSocketUrl();
    let connectionAttempted = false;

    const tryConnect = async (urlIndex = 0): Promise<void> => {
      if (urlIndex >= wsUrls.length) {
        setConnectionStatus('error');
        setLastError('All WebSocket URLs failed');
        scheduleReconnect();
        return;
      }

      const wsUrl = wsUrls[urlIndex];
      console.log(`🔄 Tentando WebSocket: ${wsUrl}`);

      try {
        const ws = new WebSocket(wsUrl);
        connectionAttempted = true;
        
        const connectTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            console.warn(`⏰ Timeout connecting to ${wsUrl}`);
            tryConnect(urlIndex + 1);
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectTimeout);
          console.log(`✅ WebSocket conectado: ${wsUrl}`);
          wsRef.current = ws;
          setIsConnected(true);
          setConnectionStatus('connected');
          setLastError(null);
          reconnectAttemptRef.current = 0;

          // Send authentication/initialization message
          ws.send(JSON.stringify({
            type: 'auth',
            token: 'spr_broadcast_client',
            timestamp: new Date().toISOString()
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('❌ Erro ao processar mensagem WebSocket:', error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          console.log(`🔌 WebSocket desconectado: ${wsUrl}`, event.code, event.reason);
          
          if (wsRef.current === ws) {
            wsRef.current = null;
            setIsConnected(false);
            
            if (!intentionalDisconnectRef.current) {
              setConnectionStatus('disconnected');
              scheduleReconnect();
            }
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectTimeout);
          console.error(`❌ Erro WebSocket ${wsUrl}:`, error);
          
          if (!connectionAttempted || urlIndex === wsUrls.length - 1) {
            setLastError(`Connection failed: ${error}`);
            setConnectionStatus('error');
          }
          
          // Try next URL
          tryConnect(urlIndex + 1);
        };

      } catch (error) {
        console.error(`❌ Erro ao criar WebSocket ${wsUrl}:`, error);
        tryConnect(urlIndex + 1);
      }
    };

    tryConnect();
  }, [getWebSocketUrl]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    setLastError(null);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (intentionalDisconnectRef.current) return;

    const attemptIndex = Math.min(reconnectAttemptRef.current, RECONNECT_INTERVALS.length - 1);
    const delay = RECONNECT_INTERVALS[attemptIndex];
    
    console.log(`🔄 Reagendando reconexão em ${delay}ms (tentativa ${reconnectAttemptRef.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptRef.current++;
      connect();
    }, delay);
  }, [connect]);

  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('📥 WebSocket message:', data);

    switch (data.type) {
      case 'broadcast_status':
        if (data.message) {
          setMessages(prev => [
            {
              id: data.id || `msg_${Date.now()}`,
              type: data.message.type || 'notification',
              title: data.message.title || 'Broadcast Update',
              content: data.message.content || '',
              timestamp: new Date(data.timestamp || Date.now()),
              recipients: data.message.recipients,
              status: data.message.status || 'pending',
              metadata: data.message.metadata
            },
            ...prev.slice(0, 99) // Keep last 100 messages
          ]);
        }
        break;

      case 'stats_update':
        if (data.stats) {
          setStats(data.stats);
        }
        break;

      case 'campaign_created':
        setMessages(prev => [
          {
            id: data.campaignId,
            type: 'campaign',
            title: 'Nova Campanha Criada',
            content: `Campanha "${data.title}" criada com ${data.recipientCount} destinatários`,
            timestamp: new Date(),
            status: 'pending',
            metadata: { campaignId: data.campaignId }
          },
          ...prev.slice(0, 99)
        ]);
        break;

      case 'error':
        setLastError(data.message);
        setMessages(prev => [
          {
            id: `error_${Date.now()}`,
            type: 'error',
            title: 'Erro do Sistema',
            content: data.message,
            timestamp: new Date(),
            status: 'failed'
          },
          ...prev.slice(0, 99)
        ]);
        break;

      default:
        console.log('📦 Mensagem WebSocket não tratada:', data);
    }
  }, []);

  const sendBroadcast = useCallback(async (message: Omit<BroadcastMessage, 'id' | 'timestamp'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket não está conectado');
    }

    const broadcastMessage = {
      type: 'send_broadcast',
      message: {
        ...message,
        id: `broadcast_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    };

    wsRef.current.send(JSON.stringify(broadcastMessage));
    
    // Add to local messages immediately
    setMessages(prev => [
      {
        ...message,
        id: broadcastMessage.message.id,
        timestamp: new Date()
      },
      ...prev.slice(0, 99)
    ]);
  }, []);

  const createCampaign = useCallback(async (campaign: {
    title: string;
    content: string;
    recipients: string[];
    scheduledTime?: Date;
  }): Promise<string> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket não está conectado');
    }

    const campaignId = `campaign_${Date.now()}`;
    const campaignMessage = {
      type: 'create_campaign',
      campaign: {
        ...campaign,
        id: campaignId,
        createdAt: new Date().toISOString(),
        scheduledTime: campaign.scheduledTime?.toISOString()
      }
    };

    wsRef.current.send(JSON.stringify(campaignMessage));
    return campaignId;
  }, []);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket não está conectado');
    }

    wsRef.current.send(JSON.stringify({
      type: 'delete_campaign',
      campaignId
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [isConnected]);

  return {
    isConnected,
    messages,
    stats,
    connectionStatus,
    lastError,
    sendBroadcast,
    createCampaign,
    deleteCampaign,
    connect,
    disconnect,
    clearMessages
  };
};