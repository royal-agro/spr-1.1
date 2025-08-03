import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  EyeIcon,
  UserGroupIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface BroadcastCampaign {
  id: number;
  name: string;
  message_content: string;
  created_by: string;
  created_by_role: string;
  created_at: string;
  total_recipients: number;
  scheduled_for: string | null;
  group_name: string;
  priority: string;
  can_approve: boolean;
  can_edit: boolean;
  already_voted: boolean;
  my_vote: string | null;
}

interface ApprovalModalData {
  campaign: BroadcastCampaign;
  action: 'approve' | 'reject' | 'edit';
}

const BroadcastApprovalPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<BroadcastCampaign | null>(null);
  const [modalData, setModalData] = useState<ApprovalModalData | null>(null);
  const [reason, setReason] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  // Simular API calls - substituir pelas chamadas reais
  const fetchPendingCampaigns = async () => {
    try {
      setLoading(true);
      
      // Simular dados - substituir pela API real
      const mockData: BroadcastCampaign[] = [
        {
          id: 1,
          name: "Relatório Semanal - Preços Soja",
          message_content: "📊 *Relatório Semanal - Soja*\n\n💰 Preço atual: R$ 127,50/saca\n📈 Variação: +2,3% na semana\n🌾 Perspectiva: Alta demanda chinesa\n\n✅ Recomendação: Manter posições\n\n_Royal Negócios Agrícolas_",
          created_by: "maria.silva",
          created_by_role: "operator",
          created_at: "2025-01-31T10:30:00Z",
          total_recipients: 45,
          scheduled_for: null,
          group_name: "Produtores de Soja",
          priority: "medium",
          can_approve: true,
          can_edit: true,
          already_voted: false,
          my_vote: null
        },
        {
          id: 2,
          name: "Alerta Clima - Paraná",
          message_content: "🌧️ *Alerta Climático - Paraná*\n\n⚠️ Previsão de chuvas intensas\n📅 Período: 01 a 05/02\n🌍 Regiões: Norte e Oeste do PR\n\n🚜 Recomendações:\n• Acelerar colheita da soja\n• Adiar plantio do milho safrinha\n• Verificar drenagem das áreas\n\n📞 Dúvidas: (43) 9999-9999",
          created_by: "joao.santos",
          created_by_role: "operator",
          created_at: "2025-01-31T09:15:00Z",
          total_recipients: 28,
          scheduled_for: "2025-01-31T18:00:00Z",
          group_name: "Produtores Paraná",
          priority: "high",
          can_approve: true,
          can_edit: true,
          already_voted: true,
          my_vote: "approved"
        }
      ];
      
      setCampaigns(mockData);
      setError(null);
      
    } catch (err) {
      setError('Erro ao carregar campanhas pendentes');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!modalData) return;

    try {
      setProcessing(true);

      // Simular API call - substituir pela chamada real
      console.log('Processando aprovação:', {
        campaignId: modalData.campaign.id,
        action: modalData.action,
        reason,
        editedMessage: modalData.action === 'edit' ? editedMessage : null
      });

      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar lista local
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === modalData.campaign.id 
          ? { ...campaign, already_voted: true, my_vote: modalData.action }
          : campaign
      ));

      // Fechar modal
      setModalData(null);
      setReason('');
      setEditedMessage('');

      // Mostrar feedback
      alert(`Campanha ${modalData.action === 'approve' ? 'aprovada' : modalData.action === 'reject' ? 'rejeitada' : 'editada e aprovada'} com sucesso!`);

    } catch (err) {
      alert('Erro ao processar aprovação');
      console.error('Erro:', err);
    } finally {
      setProcessing(false);
    }
  };

  const openApprovalModal = (campaign: BroadcastCampaign, action: 'approve' | 'reject' | 'edit') => {
    setModalData({ campaign, action });
    setEditedMessage(action === 'edit' ? campaign.message_content : '');
    setReason('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Normal';
    }
  };

  useEffect(() => {
    fetchPendingCampaigns();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <CheckCircleIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Aprovações de Broadcast
                </h1>
                <p className="text-gray-600 mt-1">
                  Revisar e aprovar campanhas de broadcast pendentes
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchPendingCampaigns}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIconSolid className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma campanha pendente
            </h3>
            <p className="text-gray-600">
              Todas as campanhas foram revisadas. Parabéns! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
                  campaign.already_voted 
                    ? 'border-green-200 bg-green-50/30' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="p-6">
                  {/* Header da Campanha */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {campaign.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(campaign.priority)}`}>
                          {getPriorityLabel(campaign.priority)}
                        </span>
                        {campaign.already_voted && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            ✓ {campaign.my_vote === 'approve' ? 'Aprovado' : 'Rejeitado'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {campaign.group_name}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatDate(campaign.created_at)}
                        </div>
                        <div>
                          👤 {campaign.created_by} ({campaign.created_by_role})
                        </div>
                        <div>
                          📱 {campaign.total_recipients} destinatários
                        </div>
                        {campaign.scheduled_for && (
                          <div className="flex items-center text-blue-600">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            Agendado: {formatDate(campaign.scheduled_for)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prévia da Mensagem */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Mensagem:</h4>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                        {campaign.message_content}
                      </pre>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCampaign(campaign)}
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </button>

                    {!campaign.already_voted && campaign.can_approve && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => openApprovalModal(campaign, 'reject')}
                          className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <XCircleIcon className="h-4 w-4 mr-2" />
                          Rejeitar
                        </button>

                        {campaign.can_edit && (
                          <button
                            onClick={() => openApprovalModal(campaign, 'edit')}
                            className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                          >
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Editar & Aprovar
                          </button>
                        )}

                        <button
                          onClick={() => openApprovalModal(campaign, 'approve')}
                          className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Aprovar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Aprovação */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <h3 className="text-lg font-semibold">
                {modalData.action === 'approve' && '✅ Aprovar Campanha'}
                {modalData.action === 'reject' && '❌ Rejeitar Campanha'}
                {modalData.action === 'edit' && '✏️ Editar & Aprovar Campanha'}
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                {modalData.campaign.name}
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {modalData.action === 'edit' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensagem Original:
                    </label>
                    <div className="bg-gray-50 rounded p-3 text-sm">
                      <pre className="whitespace-pre-wrap">{modalData.campaign.message_content}</pre>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensagem Editada: *
                    </label>
                    <textarea
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite a mensagem editada..."
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem da Campanha:
                  </label>
                  <div className="bg-gray-50 rounded p-3 text-sm max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{modalData.campaign.message_content}</pre>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da decisão:
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explique o motivo da sua decisão (opcional)..."
                />
              </div>

              {modalData.action === 'edit' && !editedMessage.trim() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ A mensagem editada é obrigatória para esta ação.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setModalData(null)}
                disabled={processing}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleApproval}
                disabled={
                  processing || 
                  (modalData.action === 'edit' && !editedMessage.trim())
                }
                className={`px-6 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                  modalData.action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : modalData.action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {processing ? 'Processando...' : (
                  modalData.action === 'approve' ? 'Aprovar' :
                  modalData.action === 'reject' ? 'Rejeitar' : 'Editar & Aprovar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-800 text-white p-4">
              <h3 className="text-lg font-semibold">📊 Detalhes da Campanha</h3>
              <p className="text-gray-300 text-sm mt-1">{selectedCampaign.name}</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Informações Gerais</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Criador:</strong> {selectedCampaign.created_by}</div>
                    <div><strong>Role:</strong> {selectedCampaign.created_by_role}</div>
                    <div><strong>Grupo:</strong> {selectedCampaign.group_name}</div>
                    <div><strong>Destinatários:</strong> {selectedCampaign.total_recipients}</div>
                    <div><strong>Prioridade:</strong> {getPriorityLabel(selectedCampaign.priority)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Datas</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Criado em:</strong> {formatDate(selectedCampaign.created_at)}</div>
                    {selectedCampaign.scheduled_for && (
                      <div><strong>Agendado para:</strong> {formatDate(selectedCampaign.scheduled_for)}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Mensagem Completa</h4>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">
                    {selectedCampaign.message_content}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastApprovalPage;