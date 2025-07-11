import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { WhatsAppContact } from '../../types';

interface ScheduledMessage {
  id: string;
  message: string;
  recipients: string[]; // IDs dos contatos
  scheduledTime: Date;
  status: 'pending' | 'sending' | 'completed' | 'failed' | 'cancelled';
  sentCount: number;
  totalCount: number;
  createdAt: Date;
  tone: 'formal' | 'normal' | 'informal' | 'alegre';
}

interface AutoSendManagerProps {
  contacts: WhatsAppContact[];
  onSendMessage: (contactId: string, message: string) => Promise<boolean>;
  onStartCampaign?: (campaign: any) => void;
  onPauseCampaign?: (campaignId: string) => void;
  onStopCampaign?: (campaignId: string) => void;
}

const AutoSendManager: React.FC<AutoSendManagerProps> = ({
  contacts,
  onSendMessage
}) => {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sendQueue, setSendQueue] = useState<{ messageId: string; contactId: string; message: string }[]>([]);
  const [lastSendTimes, setLastSendTimes] = useState<Date[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalFailed: 0,
    currentRate: 0 // mensagens por minuto
  });

  // Limite de 3 disparos por minuto
  const RATE_LIMIT = 3;
  const RATE_WINDOW = 60000; // 1 minuto em ms

  // Verificar se pode enviar mensagem (respeitando rate limit)
  const canSendMessage = () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - RATE_WINDOW);
    
    // Filtrar envios da última minuto
    const recentSends = lastSendTimes.filter(time => time > oneMinuteAgo);
    
    return recentSends.length < RATE_LIMIT;
  };

  // Adicionar mensagem à fila de envio
  const addToQueue = (scheduledMessage: ScheduledMessage) => {
    const queueItems = scheduledMessage.recipients.map(contactId => {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return null;

      // Personalizar mensagem baseada no tom
      let personalizedMessage = scheduledMessage.message;
      
      if (scheduledMessage.tone === 'formal') {
        const contactName = contact.name.includes(' ') 
          ? `Sr./Sra. ${contact.name.split(' ')[0]}`
          : `Sr./Sra. ${contact.name}`;
        personalizedMessage = personalizedMessage.replace(/\{nome\}/g, contactName);
      } else {
        const firstName = contact.name.split(' ')[0];
        personalizedMessage = personalizedMessage.replace(/\{nome\}/g, firstName);
      }

      return {
        messageId: scheduledMessage.id,
        contactId,
        message: personalizedMessage
      };
    }).filter(Boolean) as { messageId: string; contactId: string; message: string }[];

    setSendQueue(prev => [...prev, ...queueItems]);
  };

  // Processar fila de envio
  useEffect(() => {
    if (!isRunning || sendQueue.length === 0) return;

    const interval = setInterval(async () => {
      if (!canSendMessage()) {
        console.log('Rate limit atingido, aguardando...');
        return;
      }

      const nextItem = sendQueue[0];
      if (!nextItem) return;

      try {
        // Atualizar status para "sending"
        setScheduledMessages(prev => prev.map(msg => 
          msg.id === nextItem.messageId 
            ? { ...msg, status: 'sending' as const }
            : msg
        ));

        // Enviar mensagem
        const success = await onSendMessage(nextItem.contactId, nextItem.message);
        
        if (success) {
          // Registrar envio bem-sucedido
          setLastSendTimes(prev => [...prev, new Date()]);
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1 }));
          
          // Atualizar contadores da mensagem
          setScheduledMessages(prev => prev.map(msg => 
            msg.id === nextItem.messageId 
              ? { 
                  ...msg, 
                  sentCount: msg.sentCount + 1,
                  status: msg.sentCount + 1 >= msg.totalCount ? 'completed' : 'sending'
                }
              : msg
          ));
        } else {
          setStats(prev => ({ ...prev, totalFailed: prev.totalFailed + 1 }));
        }

        // Remover item da fila
        setSendQueue(prev => prev.slice(1));

      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        setStats(prev => ({ ...prev, totalFailed: prev.totalFailed + 1 }));
        setSendQueue(prev => prev.slice(1));
      }
    }, 20000); // Verificar a cada 20 segundos

    return () => clearInterval(interval);
  }, [isRunning, sendQueue, onSendMessage]);

  // Verificar mensagens agendadas
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      scheduledMessages.forEach(message => {
        if (message.status === 'pending' && message.scheduledTime <= now) {
          addToQueue(message);
        }
      });
    }, 10000); // Verificar a cada 10 segundos

    return () => clearInterval(interval);
  }, [scheduledMessages]);

  // Calcular taxa atual de envio
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - RATE_WINDOW);
      const recentSends = lastSendTimes.filter(time => time > oneMinuteAgo);
      
      setStats(prev => ({ ...prev, currentRate: recentSends.length }));
      
      // Limpar histórico antigo
      setLastSendTimes(prev => prev.filter(time => time > oneMinuteAgo));
    }, 5000); // Atualizar a cada 5 segundos

    return () => clearInterval(interval);
  }, [lastSendTimes]);

  // Adicionar nova mensagem agendada
  const addScheduledMessage = (message: ScheduledMessage) => {
    setScheduledMessages(prev => [...prev, message]);
  };

  // Cancelar mensagem agendada
  const cancelMessage = (messageId: string) => {
    setScheduledMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, status: 'cancelled' as const }
        : msg
    ));
    
    // Remover da fila
    setSendQueue(prev => prev.filter(item => item.messageId !== messageId));
  };

  // Pausar/retomar sistema
  const toggleSystem = () => {
    setIsRunning(!isRunning);
  };

  // Parar sistema e limpar fila
  const stopSystem = () => {
    setIsRunning(false);
    setSendQueue([]);
    setScheduledMessages(prev => prev.map(msg => 
      msg.status === 'sending' || msg.status === 'pending'
        ? { ...msg, status: 'cancelled' as const }
        : msg
    ));
  };

  const getStatusIcon = (status: ScheduledMessage['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'sending':
        return <PlayIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <StopIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: ScheduledMessage['status']) => {
    switch (status) {
      case 'pending': return 'Aguardando';
      case 'sending': return 'Enviando';
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header com controles */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Sistema de Disparo Automático
          </h2>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSystem}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                isRunning 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isRunning ? (
                <>
                  <PauseIcon className="h-4 w-4" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  <span>Iniciar</span>
                </>
              )}
            </button>
            
            <button
              onClick={stopSystem}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-2"
            >
              <StopIcon className="h-4 w-4" />
              <span>Parar</span>
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Taxa Atual</p>
            <p className="text-lg font-semibold text-blue-900">
              {stats.currentRate}/{RATE_LIMIT}
            </p>
            <p className="text-xs text-blue-500">por minuto</p>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Enviadas</p>
            <p className="text-lg font-semibold text-green-900">{stats.totalSent}</p>
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Falharam</p>
            <p className="text-lg font-semibold text-red-900">{stats.totalFailed}</p>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Na Fila</p>
            <p className="text-lg font-semibold text-yellow-900">{sendQueue.length}</p>
          </div>
        </div>

        {/* Aviso sobre rate limit */}
        {stats.currentRate >= RATE_LIMIT && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-yellow-700">
              Limite de {RATE_LIMIT} mensagens por minuto atingido. Aguardando...
            </span>
          </div>
        )}
      </div>

      {/* Lista de mensagens agendadas */}
      <div className="p-4">
        <h3 className="text-md font-medium text-gray-900 mb-3">
          Mensagens Agendadas ({scheduledMessages.length})
        </h3>

        {scheduledMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma mensagem agendada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledMessages.map(message => (
              <div
                key={message.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(message.status)}
                      <span className="text-sm font-medium">
                        {getStatusText(message.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.scheduledTime.toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {message.message}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        {message.sentCount}/{message.totalCount} enviadas
                      </span>
                      <span>Tom: {message.tone}</span>
                      <span>
                        {message.recipients.length} destinatários
                      </span>
                    </div>
                  </div>
                  
                  {(message.status === 'pending' || message.status === 'sending') && (
                    <button
                      onClick={() => cancelMessage(message.id)}
                      className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                      title="Cancelar"
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                {/* Barra de progresso */}
                {message.totalCount > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(message.sentCount / message.totalCount) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoSendManager; 