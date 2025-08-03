import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import SPRKPICards from '../components/Common/KPICards';
import WhatsAppInterface from '../components/WhatsApp/WhatsAppInterface';
import WhatsAppTest from '../components/WhatsApp/WhatsAppTest';
import MessageComposer from '../components/WhatsApp/MessageComposer';
import ContactGroupSelector from '../components/WhatsApp/ContactGroupSelector';
import AutoSendManager from '../components/WhatsApp/AutoSendManager';
import FeatureGuard from '../components/License/FeatureGuard';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { useWhatsAppSync } from '../hooks/useWhatsAppSync';
import { config } from '../config';

const WhatsAppPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'composer' | 'groups' | 'automation' | 'analytics'>('chat');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(false);
  
  const { 
    connectionStatus, 
    chats, 
    contacts,
    metrics 
  } = useWhatsAppStore();
  
  const { 
    isConnected, 
    totalChats, 
    totalContacts, 
    unreadCount 
  } = useWhatsAppSync();

  // Função para controlar resposta automática
  const toggleAutoReply = async () => {
    try {
      const endpoint = autoReplyEnabled ? '/api/whatsapp/auto-reply/disable' : '/api/whatsapp/auto-reply/enable';
      const response = await fetch(`${config.whatsapp.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAutoReplyEnabled(data.autoReplyEnabled);
        console.log(`🤖 ${data.message}`);
      }
    } catch (error) {
      console.error('Erro ao alterar resposta automática:', error);
    }
  };

  // Verificar status da resposta automática
  useEffect(() => {
    const checkAutoReplyStatus = async () => {
      try {
        const response = await fetch(`${config.whatsapp.apiUrl}/api/whatsapp/auto-reply/status`);
        if (response.ok) {
          const data = await response.json();
          setAutoReplyEnabled(data.autoReplyEnabled);
        }
      } catch (error) {
        console.error('Erro ao verificar status da resposta automática:', error);
      }
    };

    if (isConnected) {
      checkAutoReplyStatus();
    }
  }, [isConnected]);

  const tabs = [
    { 
      id: 'chat', 
      name: 'Conversas', 
      icon: ChatBubbleLeftRightIcon,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { 
      id: 'composer', 
      name: 'Nova Mensagem', 
      icon: PaperAirplaneIcon 
    },
    { 
      id: 'groups', 
      name: 'Grupos', 
      icon: UserGroupIcon 
    },
    { 
      id: 'automation', 
      name: 'Automação', 
      icon: Cog6ToothIcon 
    },
    { 
      id: 'analytics', 
      name: 'Métricas', 
      icon: ChartBarIcon 
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <WhatsAppInterface />;
      
      case 'composer':
        return (
          <MessageComposer
            contacts={contacts}
            onSendMessage={(message: string, type: 'text' | 'audio') => {
              console.log('Enviando mensagem:', { message, type });
              // Implementar lógica de envio
              return Promise.resolve(true);
            }}
            onScheduleMessage={() => {}}
          />
        );
      
      case 'groups':
        return (
          <ContactGroupSelector
            contacts={contacts}
            selectedContacts={[]}
            onSelectionChange={(selected: string[]) => {
              console.log('Seleção alterada:', selected);
            }}
            maxContacts={config.whatsapp.maxContactsPerCampaign}
            onClose={() => {}}
          />
        );
      
      case 'automation':
        return (
          <AutoSendManager
            contacts={contacts}
            onStartCampaign={(campaign: any) => {
              console.log('Iniciando campanha:', campaign);
            }}
            onPauseCampaign={(campaignId: string) => {
              console.log('Pausando campanha:', campaignId);
            }}
            onStopCampaign={(campaignId: string) => {
              console.log('Parando campanha:', campaignId);
            }}
            onSendMessage={async (contactId: string, message: string) => {
              console.log('Enviando mensagem para contato:', { contactId, message });
              return true;
            }}
          />
        );
      
      case 'analytics':
        return (
          <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Métricas WhatsApp</h2>
              
              <SPRKPICards 
                totalMessages={metrics.messagesLastHour || 0}
                totalContacts={totalContacts}
                responseTime={15} // Tempo em minutos
                deliveryRate={metrics.responseRate || 0}
                loading={false}
              />

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status da Conexão</h3>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500' :
                    connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm font-medium text-gray-700">
                    {connectionStatus === 'connected' && 'Conectado'}
                    {connectionStatus === 'connecting' && 'Conectando...'}
                    {connectionStatus === 'disconnected' && 'Desconectado'}
                    {connectionStatus === 'error' && 'Erro de conexão'}
                  </span>
                </div>
                
                {connectionStatus === 'connected' && (
                  <div className="mt-4 text-sm text-gray-600">
                    <p>✅ WhatsApp conectado e funcionando</p>
                    <p>📱 {totalChats} conversas ativas</p>
                    <p>👥 {totalContacts} contatos disponíveis</p>
                    {unreadCount > 0 && (
                      <p>📬 {unreadCount} mensagens não lidas</p>
                    )}
                  </div>
                )}
              </div>
            </div>
        );
      
      default:
        return <WhatsAppInterface />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-600">Gerencie suas conversas e campanhas</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Status de Conexão */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
            connectionStatus === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            <span>
              {connectionStatus === 'connected' && 'Conectado'}
              {connectionStatus === 'connecting' && 'Conectando...'}
              {connectionStatus === 'disconnected' && 'Desconectado'}
              {connectionStatus === 'error' && 'Erro'}
            </span>
          </div>
          
          {/* Controle de Resposta Automática */}
          {connectionStatus === 'connected' && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Resposta Automática:</span>
              <button
                onClick={toggleAutoReply}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  autoReplyEnabled 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {autoReplyEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 rounded-lg">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                  {tab.badge && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default WhatsAppPage; 