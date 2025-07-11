import { useState, useEffect } from 'react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { DashboardMetrics } from '../types';

interface DashboardData extends DashboardMetrics {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
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
}

const REFRESH_INTERVAL = 30000; // 30 segundos

export const useDashboardData = () => {
  const { 
    contacts, 
    chats, 
    connectionStatus, 
    isConnected
  } = useWhatsAppStore();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalMessages: 0,
    totalContacts: 0,
    activeChats: 0,
    messagesPerDay: 0,
    responseTime: 0,
    deliveryRate: 0,
    readRate: 0,
    connectionStatus: 'disconnected',
    lastUpdate: new Date(),
    messageHistory: [],
    recentActivity: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calcular métricas baseadas nos dados reais
  const calculateMetrics = (): Partial<DashboardData> => {
    if (!chats || chats.length === 0) {
      return {
        totalMessages: 0,
        totalContacts: contacts?.length || 0,
        activeChats: 0,
        messagesPerDay: 0,
        responseTime: 0,
        deliveryRate: 0,
        readRate: 0
      };
    }

    // Calcular total de mensagens
    const totalMessages = chats.reduce((total, chat) => total + chat.messages.length, 0);

    // Calcular chats ativos (com mensagens nas últimas 24h)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeChats = chats.filter(chat => 
      chat.lastMessage && new Date(chat.lastMessage.timestamp) > oneDayAgo
    ).length;

    // Calcular mensagens por dia (últimas 24h)
    const messagesLastDay = chats.reduce((total, chat) => {
      const recentMessages = chat.messages.filter(msg => 
        new Date(msg.timestamp) > oneDayAgo
      );
      return total + recentMessages.length;
    }, 0);

    // Calcular tempo de resposta médio (em minutos)
    let totalResponseTime = 0;
    let responseCount = 0;
    
    chats.forEach(chat => {
      const messages = chat.messages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      for (let i = 1; i < messages.length; i++) {
        const current = messages[i];
        const previous = messages[i - 1];
        
        // Se a mensagem atual é nossa resposta à mensagem anterior de outro
        if (current.isFromMe && !previous.isFromMe) {
          const responseTime = new Date(current.timestamp).getTime() - 
                              new Date(previous.timestamp).getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    });

    const avgResponseTime = responseCount > 0 
      ? Math.round(totalResponseTime / responseCount / 60000) // converter para minutos
      : 0;

    // Calcular taxa de entrega
    const totalSentMessages = chats.reduce((total, chat) => {
      return total + chat.messages.filter(msg => msg.isFromMe).length;
    }, 0);

    const deliveredMessages = chats.reduce((total, chat) => {
      return total + chat.messages.filter(msg => 
        msg.isFromMe && (msg.status === 'delivered' || msg.status === 'read')
      ).length;
    }, 0);

    const deliveryRate = totalSentMessages > 0 
      ? Math.round((deliveredMessages / totalSentMessages) * 100)
      : 0;

    // Calcular taxa de leitura
    const readMessages = chats.reduce((total, chat) => {
      return total + chat.messages.filter(msg => 
        msg.isFromMe && msg.status === 'read'
      ).length;
    }, 0);

    const readRate = totalSentMessages > 0 
      ? Math.round((readMessages / totalSentMessages) * 100)
      : 0;

    return {
      totalMessages,
      totalContacts: contacts?.length || 0,
      activeChats,
      messagesPerDay: messagesLastDay,
      responseTime: avgResponseTime,
      deliveryRate,
      readRate
    };
  };

  // Gerar histórico de mensagens dos últimos 7 dias
  const generateMessageHistory = (): Array<{
    date: string;
    sent: number;
    received: number;
  }> => {
    const history: Array<{
      date: string;
      sent: number;
      received: number;
    }> = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      let sent = 0;
      let received = 0;

      chats.forEach(chat => {
        chat.messages.forEach(msg => {
          const msgDate = new Date(msg.timestamp);
          if (msgDate >= dayStart && msgDate <= dayEnd) {
            if (msg.isFromMe) {
              sent++;
            } else {
              received++;
            }
          }
        });
      });

      history.push({
        date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        sent,
        received
      });
    }

    return history;
  };

  // Gerar atividades recentes
  const generateRecentActivity = (): Array<{
    id: string;
    type: 'message' | 'contact' | 'system';
    description: string;
    timestamp: Date;
    severity: 'info' | 'warning' | 'success' | 'error';
  }> => {
    const activities: Array<{
      id: string;
      type: 'message' | 'contact' | 'system';
      description: string;
      timestamp: Date;
      severity: 'info' | 'warning' | 'success' | 'error';
    }> = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Mensagens recentes
    const recentMessages = chats.reduce((acc, chat) => {
      const recent = chat.messages.filter(msg => 
        new Date(msg.timestamp) > oneHourAgo && !msg.isFromMe
      );
      return acc + recent.length;
    }, 0);

    if (recentMessages > 0) {
      activities.push({
        id: 'recent-messages',
        type: 'message' as const,
        description: `${recentMessages} nova${recentMessages > 1 ? 's' : ''} mensagem${recentMessages > 1 ? 'ns' : ''} recebida${recentMessages > 1 ? 's' : ''}`,
        timestamp: new Date(),
        severity: 'info' as const
      });
    }

    // Status da conexão
    activities.push({
      id: 'connection-status',
      type: 'system' as const,
      description: isConnected 
        ? 'WhatsApp conectado e funcionando' 
        : 'WhatsApp desconectado',
      timestamp: new Date(),
      severity: isConnected ? 'success' as const : 'error' as const
    });

    // Contatos ativos
    const activeContactsCount = chats.filter(chat => 
      chat.lastMessage && new Date(chat.lastMessage.timestamp) > oneHourAgo
    ).length;

    if (activeContactsCount > 0) {
      activities.push({
        id: 'active-contacts',
        type: 'contact' as const,
        description: `${activeContactsCount} contato${activeContactsCount > 1 ? 's' : ''} ativo${activeContactsCount > 1 ? 's' : ''} na última hora`,
        timestamp: new Date(),
        severity: 'success' as const
      });
    }

    return activities.slice(0, 5); // Limitar a 5 atividades
  };

  // Buscar dados do servidor
  const fetchServerMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar status do servidor
      const statusResponse = await fetch('http://localhost:3001/api/status');
      const statusData = await statusResponse.json();

      // Buscar métricas específicas se disponível
      let serverMetrics = {};
      try {
        const metricsResponse = await fetch('http://localhost:3001/api/metrics');
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          serverMetrics = metricsData.metrics || {};
        }
      } catch (error) {
        console.log('Métricas do servidor não disponíveis, usando cálculos locais');
      }

      const calculatedMetrics = calculateMetrics();
      const messageHistory = generateMessageHistory();
      const recentActivity = generateRecentActivity();

      setDashboardData({
        totalMessages: calculatedMetrics.totalMessages || 0,
        totalContacts: calculatedMetrics.totalContacts || 0,
        activeChats: calculatedMetrics.activeChats || 0,
        messagesPerDay: calculatedMetrics.messagesPerDay || 0,
        responseTime: calculatedMetrics.responseTime || 0,
        deliveryRate: calculatedMetrics.deliveryRate || 0,
        readRate: calculatedMetrics.readRate || 0,
        ...serverMetrics, // Sobrescrever com dados do servidor se disponível
        connectionStatus,
        lastUpdate: new Date(),
        messageHistory,
        recentActivity
      });

    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      setError('Erro ao carregar dados do dashboard');
      
      // Usar dados locais como fallback
      const calculatedMetrics = calculateMetrics();
      const messageHistory = generateMessageHistory();
      const recentActivity = generateRecentActivity();

      setDashboardData({
        totalMessages: calculatedMetrics.totalMessages || 0,
        totalContacts: calculatedMetrics.totalContacts || 0,
        activeChats: calculatedMetrics.activeChats || 0,
        messagesPerDay: calculatedMetrics.messagesPerDay || 0,
        responseTime: calculatedMetrics.responseTime || 0,
        deliveryRate: calculatedMetrics.deliveryRate || 0,
        readRate: calculatedMetrics.readRate || 0,
        connectionStatus: 'error',
        lastUpdate: new Date(),
        messageHistory,
        recentActivity
      });
    } finally {
      setLoading(false);
    }
  };

  // Atualizar dados quando os dados do WhatsApp mudarem
  useEffect(() => {
    const calculatedMetrics = calculateMetrics();
    const messageHistory = generateMessageHistory();
    const recentActivity = generateRecentActivity();

    setDashboardData(prev => ({
      ...prev,
      ...calculatedMetrics,
      connectionStatus,
      lastUpdate: new Date(),
      messageHistory,
      recentActivity
    }));
  }, [contacts, chats, connectionStatus, isConnected]);

  // Buscar dados do servidor periodicamente
  useEffect(() => {
    fetchServerMetrics();
    
    const interval = setInterval(fetchServerMetrics, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  return {
    data: dashboardData,
    loading,
    error,
    refresh: fetchServerMetrics
  };
}; 