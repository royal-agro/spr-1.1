import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import CampaignReports from '../components/WhatsApp/CampaignReports';
import CampaignAnalytics from '../components/WhatsApp/CampaignAnalytics';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

interface CampaignData {
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
    avgResponseTime: number;
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

const WhatsAppReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'analytics' | 'export'>('reports');
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { chats, contacts, connectionStatus } = useWhatsAppStore();

  // Simular dados de campanhas (em produção, viriam de uma API)
  useEffect(() => {
    const generateMockCampaigns = (): CampaignData[] => {
      const mockCampaigns: CampaignData[] = [
        {
          id: 'campaign-1',
          name: 'Promoção Soja - Dezembro 2024',
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-15'),
          status: 'completed',
          metrics: {
            totalSent: 1250,
            delivered: 1180,
            read: 890,
            replied: 156,
            failed: 70,
            blocked: 12,
            deliveryRate: 94.4,
            readRate: 75.4,
            responseRate: 17.5,
            avgResponseTime: 45
          },
          targets: {
            totalContacts: 1250,
            groups: ['Produtores de Soja', 'Clientes Premium'],
            tone: 'formal'
          },
          timeline: [
            {
              timestamp: new Date('2024-12-01T09:00:00'),
              event: 'sent',
              contactId: 'contact-1',
              contactName: 'João Silva',
              message: 'Mensagem sobre promoção de soja'
            },
            {
              timestamp: new Date('2024-12-01T09:15:00'),
              event: 'delivered',
              contactId: 'contact-1',
              contactName: 'João Silva'
            },
            {
              timestamp: new Date('2024-12-01T10:30:00'),
              event: 'read',
              contactId: 'contact-1',
              contactName: 'João Silva'
            },
            {
              timestamp: new Date('2024-12-01T11:45:00'),
              event: 'replied',
              contactId: 'contact-1',
              contactName: 'João Silva',
              message: 'Interessado na promoção'
            }
          ],
          costs: {
            totalCost: 187.50,
            costPerMessage: 0.15,
            costPerContact: 0.15,
            costPerResponse: 1.20
          }
        },
        {
          id: 'campaign-2',
          name: 'Relatório Semanal - Commodities',
          startDate: new Date('2024-12-16'),
          status: 'active',
          metrics: {
            totalSent: 850,
            delivered: 820,
            read: 615,
            replied: 89,
            failed: 30,
            blocked: 5,
            deliveryRate: 96.5,
            readRate: 75.0,
            responseRate: 14.5,
            avgResponseTime: 62
          },
          targets: {
            totalContacts: 850,
            groups: ['Todos os Clientes'],
            tone: 'normal'
          },
          timeline: [],
          costs: {
            totalCost: 127.50,
            costPerMessage: 0.15,
            costPerContact: 0.15,
            costPerResponse: 1.43
          }
        },
        {
          id: 'campaign-3',
          name: 'Pesquisa de Satisfação',
          startDate: new Date('2024-12-10'),
          endDate: new Date('2024-12-12'),
          status: 'completed',
          metrics: {
            totalSent: 500,
            delivered: 485,
            read: 380,
            replied: 245,
            failed: 15,
            blocked: 2,
            deliveryRate: 97.0,
            readRate: 78.4,
            responseRate: 64.5,
            avgResponseTime: 28
          },
          targets: {
            totalContacts: 500,
            groups: ['Clientes Premium'],
            tone: 'informal'
          },
          timeline: [],
          costs: {
            totalCost: 75.00,
            costPerMessage: 0.15,
            costPerContact: 0.15,
            costPerResponse: 0.31
          }
        }
      ];

      return mockCampaigns;
    };

    // Simular carregamento
    setTimeout(() => {
      setCampaigns(generateMockCampaigns());
      setIsLoading(false);
    }, 1000);
  }, []);

  // Função para exportar relatório
  const handleExportReport = async (campaignId: string, format: 'pdf' | 'excel' | 'csv') => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    // Simular export
    console.log(`Exportando relatório da campanha ${campaign.name} em formato ${format.toUpperCase()}`);
    
    // Em produção, faria uma chamada para a API
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          format,
          includeTimeline: true,
          includeCosts: true
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-${campaign.name}-${format}.${format === 'excel' ? 'xlsx' : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      // Fallback: criar arquivo simples
      createFallbackReport(campaign, format);
    }
  };

  // Função de fallback para criar relatório simples
  const createFallbackReport = (campaign: CampaignData, format: string) => {
    const data = {
      campanha: campaign.name,
      periodo: `${campaign.startDate.toLocaleDateString('pt-BR')} - ${campaign.endDate?.toLocaleDateString('pt-BR') || 'Em andamento'}`,
      status: campaign.status,
      metricas: campaign.metrics,
      custos: campaign.costs,
      dataExportacao: new Date().toLocaleString('pt-BR')
    };

    const content = format === 'csv' 
      ? convertToCSV(data)
      : JSON.stringify(data, null, 2);

    const blob = new Blob([content], { 
      type: format === 'csv' ? 'text/csv' : 'application/json' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${campaign.name}.${format === 'csv' ? 'csv' : 'json'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Função para converter para CSV
  const convertToCSV = (data: any): string => {
    const headers = 'Métrica,Valor\n';
    const rows = [
      `Campanha,${data.campanha}`,
      `Período,${data.periodo}`,
      `Status,${data.status}`,
      `Total Enviadas,${data.metricas.totalSent}`,
      `Entregues,${data.metricas.delivered}`,
      `Lidas,${data.metricas.read}`,
      `Respondidas,${data.metricas.replied}`,
      `Falharam,${data.metricas.failed}`,
      `Bloqueadas,${data.metricas.blocked}`,
      `Taxa de Entrega,${data.metricas.deliveryRate}%`,
      `Taxa de Leitura,${data.metricas.readRate}%`,
      `Taxa de Resposta,${data.metricas.responseRate}%`,
      `Tempo Médio de Resposta,${data.metricas.avgResponseTime} min`,
      `Custo Total,R$ ${data.custos.totalCost}`,
      `Custo por Mensagem,R$ ${data.custos.costPerMessage}`,
      `Custo por Contato,R$ ${data.custos.costPerContact}`,
      `Custo por Resposta,R$ ${data.custos.costPerResponse}`,
      `Data de Exportação,${data.dataExportacao}`
    ].join('\n');

    return headers + rows;
  };

  // Função para otimizar campanha
  const handleOptimizeCampaign = (campaignId: string, optimizations: string[]) => {
    console.log(`Otimizando campanha ${campaignId} com as seguintes melhorias:`, optimizations);
    
    // Em produção, aplicaria as otimizações
    const updatedCampaigns = campaigns.map(campaign => {
      if (campaign.id === campaignId) {
        return {
          ...campaign,
          // Simular melhorias nas métricas
          metrics: {
            ...campaign.metrics,
            deliveryRate: Math.min(100, campaign.metrics.deliveryRate + 2),
            readRate: Math.min(100, campaign.metrics.readRate + 3),
            responseRate: Math.min(100, campaign.metrics.responseRate + 1)
          }
        };
      }
      return campaign;
    });

    setCampaigns(updatedCampaigns);
    alert(`Otimizações aplicadas à campanha! ${optimizations.length} melhorias implementadas.`);
  };

  // Função para atualizar dados
  const handleRefreshData = () => {
    setIsLoading(true);
    setLastUpdate(new Date());
    
    // Simular atualização
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Relatórios WhatsApp
                </h1>
                <p className="text-sm text-gray-500">
                  Sistema Preditivo Royal - Análise de Campanhas
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </div>
              
              <button
                onClick={handleRefreshData}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="Atualizar dados"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {connectionStatus === 'connected' ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="h-4 w-4 inline mr-2" />
              Relatórios
            </button>
            
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Cog6ToothIcon className="h-4 w-4 inline mr-2" />
              Análise Avançada
            </button>
            
            <button
              onClick={() => setActiveTab('export')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentArrowDownIcon className="h-4 w-4 inline mr-2" />
              Exportação
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'reports' && (
          <CampaignReports
            campaigns={campaigns}
            onExportReport={handleExportReport}
          />
        )}
        
        {activeTab === 'analytics' && (
          <CampaignAnalytics
            campaigns={campaigns}
            onOptimizeCampaign={handleOptimizeCampaign}
          />
        )}
        
        {activeTab === 'export' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Exportação de Relatórios
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {campaigns.map(campaign => (
                <div
                  key={campaign.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 mb-2">{campaign.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {campaign.startDate.toLocaleDateString('pt-BR')} - 
                    {campaign.endDate?.toLocaleDateString('pt-BR') || 'Em andamento'}
                  </p>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => handleExportReport(campaign.id, 'pdf')}
                      className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                    >
                      Exportar PDF
                    </button>
                    <button
                      onClick={() => handleExportReport(campaign.id, 'excel')}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    >
                      Exportar Excel
                    </button>
                    <button
                      onClick={() => handleExportReport(campaign.id, 'csv')}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      Exportar CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppReportsPage; 