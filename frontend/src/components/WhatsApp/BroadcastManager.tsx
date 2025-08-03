import React, { useState, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  MegaphoneIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useBroadcastWebSocket, type BroadcastMessage } from '../../hooks/useBroadcastWebSocket';
import { useWhatsAppStore } from '../../store/useWhatsAppStore';

interface BroadcastManagerProps {
  className?: string;
}

const BroadcastManager: React.FC<BroadcastManagerProps> = ({ className = '' }) => {
  const {
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
  } = useBroadcastWebSocket();

  const { contacts } = useWhatsAppStore();
  
  const [activeTab, setActiveTab] = useState<'broadcast' | 'campaigns' | 'history' | 'stats'>('broadcast');
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    content: '',
    recipients: [] as string[],
    type: 'notification' as 'campaign' | 'notification'
  });
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    content: '',
    recipients: [] as string[],
    scheduledTime: ''
  });

  const handleSendBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.content || broadcastForm.recipients.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      await sendBroadcast({
        type: broadcastForm.type,
        title: broadcastForm.title,
        content: broadcastForm.content,
        recipients: broadcastForm.recipients,
        status: 'pending'
      });

      setBroadcastForm({
        title: '',
        content: '',
        recipients: [],
        type: 'notification'
      });

      alert('Broadcast enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar broadcast:', error);
      alert('Erro ao enviar broadcast: ' + (error as Error).message);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.title || !campaignForm.content || campaignForm.recipients.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const scheduledTime = campaignForm.scheduledTime ? new Date(campaignForm.scheduledTime) : undefined;
      
      const campaignId = await createCampaign({
        title: campaignForm.title,
        content: campaignForm.content,
        recipients: campaignForm.recipients,
        scheduledTime
      });

      setCampaignForm({
        title: '',
        content: '',
        recipients: [],
        scheduledTime: ''
      });

      alert(`Campanha criada com sucesso! ID: ${campaignId}`);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      alert('Erro ao criar campanha: ' + (error as Error).message);
    }
  };

  const handleRecipientToggle = (contactId: string, isForCampaign = false) => {
    if (isForCampaign) {
      setCampaignForm(prev => ({
        ...prev,
        recipients: prev.recipients.includes(contactId)
          ? prev.recipients.filter(id => id !== contactId)
          : [...prev.recipients, contactId]
      }));
    } else {
      setBroadcastForm(prev => ({
        ...prev,
        recipients: prev.recipients.includes(contactId)
          ? prev.recipients.filter(id => id !== contactId)
          : [...prev.recipients, contactId]
      }));
    }
  };

  const getStatusIcon = (status: BroadcastMessage['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'sending':
        return <ClockIcon className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MegaphoneIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Broadcast Manager</h2>
              <p className="text-sm text-gray-600">
                Sistema de transmissão em massa - Royal Negócios Agrícolas
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-600' : 
                connectionStatus === 'connecting' ? 'bg-blue-600' : 
                connectionStatus === 'error' ? 'bg-red-600' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                {connectionStatus === 'connected' ? 'Conectado' :
                 connectionStatus === 'connecting' ? 'Conectando...' :
                 connectionStatus === 'error' ? 'Erro' : 'Desconectado'}
              </span>
            </div>
            
            {!isConnected && (
              <button
                onClick={connect}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Conectar
              </button>
            )}
          </div>
        </div>

        {lastError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-700">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Erro: {lastError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'broadcast', label: 'Envio Rápido', icon: PaperAirplaneIcon },
            { id: 'campaigns', label: 'Campanhas', icon: MegaphoneIcon },
            { id: 'history', label: 'Histórico', icon: ClockIcon },
            { id: 'stats', label: 'Estatísticas', icon: ChartBarIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'broadcast' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Mensagem
              </label>
              <input
                type="text"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Relatório Semanal de Preços"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo da Mensagem
              </label>
              <textarea
                value={broadcastForm.content}
                onChange={(e) => setBroadcastForm(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o conteúdo da mensagem aqui..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinatários ({broadcastForm.recipients.length} selecionados)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                {contacts.map(contact => (
                  <label key={contact.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastForm.recipients.includes(contact.id)}
                      onChange={() => handleRecipientToggle(contact.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{contact.name}</span>
                    <span className="text-xs text-gray-400">{contact.phone}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleSendBroadcast}
              disabled={!isConnected}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              <span>Enviar Broadcast</span>
            </button>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Campanha
              </label>
              <input
                type="text"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Campanha Mensal - Preços da Soja"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo da Campanha
              </label>
              <textarea
                value={campaignForm.content}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o conteúdo da campanha aqui..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agendamento (Opcional)
              </label>
              <input
                type="datetime-local"
                value={campaignForm.scheduledTime}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinatários ({campaignForm.recipients.length} selecionados)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                {contacts.map(contact => (
                  <label key={contact.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={campaignForm.recipients.includes(contact.id)}
                      onChange={() => handleRecipientToggle(contact.id, true)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{contact.name}</span>
                    <span className="text-xs text-gray-400">{contact.phone}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateCampaign}
              disabled={!isConnected}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Criar Campanha</span>
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Histórico de Mensagens ({messages.length})
              </h3>
              <button
                onClick={clearMessages}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
              >
                Limpar Histórico
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MegaphoneIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma mensagem enviada ainda</p>
                </div>
              ) : (
                messages.map(message => (
                  <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(message.status)}
                          <h4 className="font-medium text-gray-900">{message.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            message.type === 'campaign' ? 'bg-blue-100 text-blue-800' :
                            message.type === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {message.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{message.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span>{message.timestamp.toLocaleString('pt-BR')}</span>
                          {message.recipients && (
                            <span>{message.recipients.length} destinatários</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MegaphoneIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total de Campanhas</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalCampaigns}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Mensagens Entregues</p>
                  <p className="text-2xl font-bold text-green-900">{stats.messagesDelivered}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-600">Mensagens Falhadas</p>
                  <p className="text-2xl font-bold text-red-900">{stats.messagesFailed}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">Taxa de Entrega</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.deliveryRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-600">Campanhas Ativas</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.activeCampaigns}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <PaperAirplaneIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Enviadas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.messagesSent}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastManager;