import React, { useState } from 'react';
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ChartBarIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface ExportTask {
  id: string;
  campaignName: string;
  format: 'pdf' | 'excel' | 'csv';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  downloadUrl?: string;
  error?: string;
}

interface ReportExporterProps {
  campaigns: any[];
  onExport: (campaignId: string, format: 'pdf' | 'excel' | 'csv', options: ExportOptions) => Promise<void>;
}

interface ExportOptions {
  includeTimeline: boolean;
  includeCosts: boolean;
  includeAnalytics: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  groupBy?: 'campaign' | 'date' | 'contact';
}

const ReportExporter: React.FC<ReportExporterProps> = ({ campaigns, onExport }) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeTimeline: true,
    includeCosts: true,
    includeAnalytics: false,
    groupBy: 'campaign'
  });
  const [exportTasks, setExportTasks] = useState<ExportTask[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Função para alternar seleção de campanha
  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  // Função para selecionar todas as campanhas
  const selectAllCampaigns = () => {
    setSelectedCampaigns(campaigns.map(c => c.id));
  };

  // Função para limpar seleção
  const clearSelection = () => {
    setSelectedCampaigns([]);
  };

  // Função para exportar relatórios
  const handleExport = async () => {
    if (selectedCampaigns.length === 0) {
      alert('Selecione pelo menos uma campanha para exportar.');
      return;
    }

    setIsExporting(true);

    try {
      for (const campaignId of selectedCampaigns) {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) continue;

        const taskId = `export-${Date.now()}-${campaignId}`;
        const newTask: ExportTask = {
          id: taskId,
          campaignName: campaign.name,
          format: exportFormat,
          status: 'pending',
          createdAt: new Date()
        };

        setExportTasks(prev => [...prev, newTask]);

        // Atualizar status para processando
        setExportTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, status: 'processing' }
            : task
        ));

        try {
          await onExport(campaignId, exportFormat, exportOptions);
          
          // Simular URL de download
          const downloadUrl = `/api/reports/download/${taskId}`;
          
          setExportTasks(prev => prev.map(task => 
            task.id === taskId 
              ? { ...task, status: 'completed', downloadUrl }
              : task
          ));
        } catch (error) {
          setExportTasks(prev => prev.map(task => 
            task.id === taskId 
              ? { ...task, status: 'failed', error: error instanceof Error ? error.message : 'Erro desconhecido' }
              : task
          ));
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Função para baixar arquivo
  const handleDownload = (task: ExportTask) => {
    if (task.downloadUrl) {
      // Em produção, faria download real
      console.log(`Baixando ${task.campaignName} em formato ${task.format.toUpperCase()}`);
      
      // Simular download
      const link = document.createElement('a');
      link.href = task.downloadUrl;
      link.download = `relatorio-${task.campaignName}-${task.format}.${task.format === 'excel' ? 'xlsx' : task.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Função para obter ícone do formato
  const getFormatIcon = (format: 'pdf' | 'excel' | 'csv') => {
    switch (format) {
      case 'pdf':
        return <DocumentTextIcon className="h-5 w-5 text-red-600" />;
      case 'excel':
        return <TableCellsIcon className="h-5 w-5 text-green-600" />;
      case 'csv':
        return <DocumentArrowDownIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: ExportTask['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
    }
  };

  // Função para obter texto do status
  const getStatusText = (status: ExportTask['status']) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'processing':
        return 'Processando';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
    }
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Campanhas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Selecionar Campanhas</h3>
          <div className="flex space-x-2">
            <button
              onClick={selectAllCampaigns}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Selecionar Todas
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => (
            <div
              key={campaign.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedCampaigns.includes(campaign.id)
                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => toggleCampaignSelection(campaign.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  selectedCampaigns.includes(campaign.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}>
                  {selectedCampaigns.includes(campaign.id) && (
                    <CheckCircleIcon className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                  <p className="text-sm text-gray-500">
                    {campaign.startDate.toLocaleDateString('pt-BR')} - 
                    {campaign.endDate?.toLocaleDateString('pt-BR') || 'Em andamento'}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>{campaign.metrics.totalSent} enviadas</span>
                    <span>{campaign.metrics.responseRate.toFixed(1)}% resposta</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedCampaigns.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>{selectedCampaigns.length}</strong> campanha(s) selecionada(s) para exportação
            </p>
          </div>
        )}
      </div>

      {/* Opções de Exportação */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Opções de Exportação</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Formato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formato do Arquivo
            </label>
            <div className="space-y-2">
              {(['pdf', 'excel', 'csv'] as const).map(format => (
                <label key={format} className="flex items-center">
                  <input
                    type="radio"
                    value={format}
                    checked={exportFormat === format}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="mr-2"
                  />
                  <div className="flex items-center space-x-2">
                    {getFormatIcon(format)}
                    <span className="text-sm">
                      {format.toUpperCase()}
                      {format === 'pdf' && ' - Relatório visual completo'}
                      {format === 'excel' && ' - Planilha com dados estruturados'}
                      {format === 'csv' && ' - Dados brutos para análise'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Conteúdo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo do Relatório
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeTimeline}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeTimeline: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Incluir timeline de eventos</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCosts}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeCosts: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Incluir análise de custos</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeAnalytics}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeAnalytics: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Incluir insights e recomendações</span>
              </label>
            </div>
          </div>

          {/* Agrupamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agrupar Dados Por
            </label>
            <select
              value={exportOptions.groupBy}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                groupBy: e.target.value as any
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="campaign">Campanha</option>
              <option value="date">Data</option>
              <option value="contact">Contato</option>
            </select>
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período (Opcional)
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={exportOptions.dateRange?.start || ''}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: {
                    start: e.target.value,
                    end: prev.dateRange?.end || ''
                  }
                }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={exportOptions.dateRange?.end || ''}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: {
                    start: prev.dateRange?.start || '',
                    end: e.target.value
                  }
                }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Botão de Exportação */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleExport}
            disabled={selectedCampaigns.length === 0 || isExporting}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              selectedCampaigns.length === 0 || isExporting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Exportar Relatórios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Histórico de Exportações */}
      {exportTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Exportações</h3>
          
          <div className="space-y-3">
            {exportTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getFormatIcon(task.format)}
                  <div>
                    <p className="font-medium text-gray-900">{task.campaignName}</p>
                    <p className="text-sm text-gray-500">
                      {task.createdAt.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                  
                  {task.status === 'completed' && task.downloadUrl && (
                    <button
                      onClick={() => handleDownload(task)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    >
                      Baixar
                    </button>
                  )}
                  
                  {task.status === 'failed' && task.error && (
                    <span className="text-xs text-red-600" title={task.error}>
                      Erro
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportExporter; 