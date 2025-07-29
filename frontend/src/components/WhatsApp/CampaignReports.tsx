import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface CampaignReport {
  id: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused' | 'failed';
  metrics: {
    totalSent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
    blocked: number;
    deliveryRate: number;
    readRate: number;
    responseRate: number;
    avgResponseTime: number; // em minutos
  };
  targets: {
    totalContacts: number;
    groups: string[];
    tone: 'formal' | 'normal' | 'informal' | 'alegre';
  };
  timeline: Array<{
    timestamp: Date;
    event: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
    contactId: string;
    contactName: string;
    message?: string;
  }>;
  costs: {
    totalCost: number;
    costPerMessage: number;
    costPerContact: number;
    costPerResponse: number;
  };
}

interface CampaignReportsProps {
  campaigns: CampaignReport[];
  onExportReport: (campaignId: string, format: 'pdf' | 'excel' | 'csv') => void;
}

const CampaignReports: React.FC<CampaignReportsProps> = ({
  campaigns,
  onExportReport
}) => {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'timeline' | 'comparison'>('summary');

  // Filtrar campanhas por período
  const filteredCampaigns = campaigns.filter(campaign => {
    const campaignDate = new Date(campaign.startDate);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return campaignDate >= startDate && campaignDate <= endDate;
  });

  // Calcular métricas consolidadas
  const consolidatedMetrics = filteredCampaigns.reduce((acc, campaign) => {
    return {
      totalSent: acc.totalSent + campaign.metrics.totalSent,
      delivered: acc.delivered + campaign.metrics.delivered,
      read: acc.read + campaign.metrics.read,
      replied: acc.replied + campaign.metrics.replied,
      failed: acc.failed + campaign.metrics.failed,
      blocked: acc.blocked + campaign.metrics.blocked,
      totalCost: acc.totalCost + campaign.costs.totalCost
    };
  }, {
    totalSent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
    failed: 0,
    blocked: 0,
    totalCost: 0
  });

  // Calcular taxas consolidadas
  const consolidatedRates = {
    deliveryRate: consolidatedMetrics.totalSent > 0 
      ? (consolidatedMetrics.delivered / consolidatedMetrics.totalSent) * 100 
      : 0,
    readRate: consolidatedMetrics.delivered > 0 
      ? (consolidatedMetrics.read / consolidatedMetrics.delivered) * 100 
      : 0,
    responseRate: consolidatedMetrics.read > 0 
      ? (consolidatedMetrics.replied / consolidatedMetrics.read) * 100 
      : 0
  };

  // Obter campanha selecionada
  const selectedCampaignData = selectedCampaign 
    ? campaigns.find(c => c.id === selectedCampaign)
    : null;

  // Função para formatar números
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  // Função para formatar percentual
  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  // Função para formatar moeda
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  // Função para obter cor do status
  const getStatusColor = (status: CampaignReport['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Função para obter texto do status
  const getStatusText = (status: CampaignReport['status']) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'completed': return 'Concluída';
      case 'paused': return 'Pausada';
      case 'failed': return 'Falhou';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-2" />
              Relatórios de Campanhas
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Análise detalhada dos resultados das campanhas de disparo
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="summary">Resumo</option>
              <option value="detailed">Detalhado</option>
              <option value="timeline">Timeline</option>
              <option value="comparison">Comparação</option>
            </select>
            
            {selectedCampaign && (
              <div className="flex space-x-2">
                <button
                  onClick={() => onExportReport(selectedCampaign, 'pdf')}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  PDF
                </button>
                <button
                  onClick={() => onExportReport(selectedCampaign, 'excel')}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  Excel
                </button>
                <button
                  onClick={() => onExportReport(selectedCampaign, 'csv')}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-gray-500">até</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Métricas Consolidadas */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Métricas Consolidadas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Enviadas</p>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(consolidatedMetrics.totalSent)}</p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Entregues</p>
                <p className="text-2xl font-bold text-green-900">{formatNumber(consolidatedMetrics.delivered)}</p>
                <p className="text-xs text-green-600">{formatPercentage(consolidatedRates.deliveryRate)}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Lidas</p>
                <p className="text-2xl font-bold text-purple-900">{formatNumber(consolidatedMetrics.read)}</p>
                <p className="text-xs text-purple-600">{formatPercentage(consolidatedRates.readRate)}</p>
              </div>
              <EyeIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Respondidas</p>
                <p className="text-2xl font-bold text-yellow-900">{formatNumber(consolidatedMetrics.replied)}</p>
                <p className="text-xs text-yellow-600">{formatPercentage(consolidatedRates.responseRate)}</p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Falharam</p>
                <p className="text-2xl font-bold text-red-900">{formatNumber(consolidatedMetrics.failed)}</p>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Custo Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(consolidatedMetrics.totalCost)}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Campanhas */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Campanhas ({filteredCampaigns.length})
          </h3>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma campanha encontrada no período selecionado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map(campaign => (
              <div
                key={campaign.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedCampaign === campaign.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedCampaign(
                  selectedCampaign === campaign.id ? null : campaign.id
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{campaign.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                        {getStatusText(campaign.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Período</p>
                        <p className="font-medium">
                          {campaign.startDate.toLocaleDateString('pt-BR')}
                          {campaign.endDate && ` - ${campaign.endDate.toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-gray-500">Contatos</p>
                        <p className="font-medium">{formatNumber(campaign.targets.totalContacts)}</p>
                      </div>
                      
                      <div>
                        <p className="text-gray-500">Taxa de Entrega</p>
                        <p className="font-medium">{formatPercentage(campaign.metrics.deliveryRate)}</p>
                      </div>
                      
                      <div>
                        <p className="text-gray-500">Taxa de Resposta</p>
                        <p className="font-medium">{formatPercentage(campaign.metrics.responseRate)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Custo Total</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(campaign.costs.totalCost)}
                    </p>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {selectedCampaign === campaign.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    {reportType === 'summary' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Métricas detalhadas */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Métricas Detalhadas</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Mensagens enviadas:</span>
                              <span className="font-medium">{formatNumber(campaign.metrics.totalSent)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Entregues:</span>
                              <span className="font-medium text-green-600">
                                {formatNumber(campaign.metrics.delivered)} ({formatPercentage(campaign.metrics.deliveryRate)})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Lidas:</span>
                              <span className="font-medium text-blue-600">
                                {formatNumber(campaign.metrics.read)} ({formatPercentage(campaign.metrics.readRate)})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Respondidas:</span>
                              <span className="font-medium text-purple-600">
                                {formatNumber(campaign.metrics.replied)} ({formatPercentage(campaign.metrics.responseRate)})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Falharam:</span>
                              <span className="font-medium text-red-600">{formatNumber(campaign.metrics.failed)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Bloqueadas:</span>
                              <span className="font-medium text-red-600">{formatNumber(campaign.metrics.blocked)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tempo médio de resposta:</span>
                              <span className="font-medium">{campaign.metrics.avgResponseTime}min</span>
                            </div>
                          </div>
                        </div>

                        {/* Análise de custos */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Análise de Custos</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Custo total:</span>
                              <span className="font-medium">{formatCurrency(campaign.costs.totalCost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Custo por mensagem:</span>
                              <span className="font-medium">{formatCurrency(campaign.costs.costPerMessage)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Custo por contato:</span>
                              <span className="font-medium">{formatCurrency(campaign.costs.costPerContact)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Custo por resposta:</span>
                              <span className="font-medium">{formatCurrency(campaign.costs.costPerResponse)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="text-gray-600">ROI estimado:</span>
                              <span className="font-medium text-green-600">+{((campaign.metrics.responseRate * 10) - 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportType === 'timeline' && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Timeline de Eventos</h5>
                        <div className="max-h-64 overflow-y-auto">
                          <div className="space-y-2">
                            {campaign.timeline.slice(0, 10).map((event, index) => (
                              <div key={index} className="flex items-center space-x-3 text-sm">
                                <div className={`w-2 h-2 rounded-full ${
                                  event.event === 'sent' ? 'bg-blue-500' :
                                  event.event === 'delivered' ? 'bg-green-500' :
                                  event.event === 'read' ? 'bg-purple-500' :
                                  event.event === 'replied' ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`} />
                                <span className="text-gray-500">
                                  {event.timestamp.toLocaleTimeString('pt-BR')}
                                </span>
                                <span className="font-medium">{event.contactName}</span>
                                <span className="text-gray-600">
                                  {event.event === 'sent' && 'Mensagem enviada'}
                                  {event.event === 'delivered' && 'Mensagem entregue'}
                                  {event.event === 'read' && 'Mensagem lida'}
                                  {event.event === 'replied' && 'Resposta recebida'}
                                  {event.event === 'failed' && 'Falha no envio'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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

export default CampaignReports; 