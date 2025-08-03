import React, { useState, useMemo } from 'react';
import {
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface CampaignInsight {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  recommendation?: string;
  impact: 'high' | 'medium' | 'low';
  metric?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface CampaignPerformance {
  campaignId: string;
  name: string;
  score: number; // 0-100
  benchmarkComparison: {
    deliveryRate: { value: number; benchmark: number; };
    readRate: { value: number; benchmark: number; };
    responseRate: { value: number; benchmark: number; };
    costEfficiency: { value: number; benchmark: number; };
  };
  timeAnalysis: {
    bestHours: number[];
    bestDays: string[];
    worstHours: number[];
    worstDays: string[];
  };
  audienceAnalysis: {
    mostEngaged: string[];
    leastEngaged: string[];
    optimalGroupSize: number;
    toneEffectiveness: Record<string, number>;
  };
}

interface CampaignAnalyticsProps {
  campaigns: any[];
  onOptimizeCampaign: (campaignId: string, optimizations: string[]) => void;
}

const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({
  campaigns,
  onOptimizeCampaign
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'delivery' | 'engagement' | 'cost' | 'timing'>('delivery');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // Gerar insights baseados nos dados das campanhas
  const generateInsights = useMemo((): CampaignInsight[] => {
    const insights: CampaignInsight[] = [];

    if (campaigns.length === 0) return insights;

    // Análise de taxa de entrega
    const avgDeliveryRate = campaigns.reduce((acc, c) => acc + c.metrics.deliveryRate, 0) / campaigns.length;
    if (avgDeliveryRate < 85) {
      insights.push({
        type: 'warning',
        title: 'Taxa de Entrega Baixa',
        description: `Sua taxa média de entrega é ${avgDeliveryRate.toFixed(1)}%, abaixo do ideal (>90%)`,
        recommendation: 'Verifique a qualidade da lista de contatos e remova números inválidos',
        impact: 'high',
        metric: avgDeliveryRate,
        trend: 'down'
      });
    }

    // Análise de taxa de leitura
    const avgReadRate = campaigns.reduce((acc, c) => acc + c.metrics.readRate, 0) / campaigns.length;
    if (avgReadRate < 60) {
      insights.push({
        type: 'warning',
        title: 'Taxa de Leitura Baixa',
        description: `${avgReadRate.toFixed(1)}% das mensagens entregues são lidas`,
        recommendation: 'Teste diferentes horários de envio e melhore o preview da mensagem',
        impact: 'medium',
        metric: avgReadRate,
        trend: 'down'
      });
    }

    // Análise de taxa de resposta
    const avgResponseRate = campaigns.reduce((acc, c) => acc + c.metrics.responseRate, 0) / campaigns.length;
    if (avgResponseRate > 15) {
      insights.push({
        type: 'success',
        title: 'Excelente Engajamento',
        description: `Taxa de resposta de ${avgResponseRate.toFixed(1)}% está acima da média do setor (8-12%)`,
        recommendation: 'Continue usando as estratégias atuais e replique para outras campanhas',
        impact: 'high',
        metric: avgResponseRate,
        trend: 'up'
      });
    }

    // Análise de custos
    const avgCostPerResponse = campaigns.reduce((acc, c) => acc + c.costs.costPerResponse, 0) / campaigns.length;
    if (avgCostPerResponse > 5) {
      insights.push({
        type: 'error',
        title: 'Custo por Resposta Alto',
        description: `Custo médio de R$ ${avgCostPerResponse.toFixed(2)} por resposta está elevado`,
        recommendation: 'Otimize a segmentação e melhore a qualidade das mensagens',
        impact: 'high',
        metric: avgCostPerResponse,
        trend: 'up'
      });
    }

    // Análise de bloqueios
    const totalBlocked = campaigns.reduce((acc, c) => acc + c.metrics.blocked, 0);
    const totalSent = campaigns.reduce((acc, c) => acc + c.metrics.totalSent, 0);
    const blockRate = (totalBlocked / totalSent) * 100;
    
    if (blockRate > 2) {
      insights.push({
        type: 'error',
        title: 'Taxa de Bloqueio Elevada',
        description: `${blockRate.toFixed(1)}% dos contatos bloquearam as mensagens`,
        recommendation: 'Revise o conteúdo e frequência dos disparos. Implemente opt-out.',
        impact: 'high',
        metric: blockRate,
        trend: 'up'
      });
    }

    // Análise de horários
    const campaignsWithTimeData = campaigns.filter(c => c.timeline && c.timeline.length > 0);
    if (campaignsWithTimeData.length > 0) {
      const hourAnalysis = Array.from({ length: 24 }, (_, hour) => {
        const hourEvents = campaignsWithTimeData.flatMap(c => 
          c.timeline.filter((e: any) => new Date(e.timestamp).getHours() === hour && e.event === 'read')
        );
        return { hour, readCount: hourEvents.length };
      });

      const bestHour = hourAnalysis.reduce((best, current) => 
        current.readCount > best.readCount ? current : best
      );

      if (bestHour.readCount > 0) {
        insights.push({
          type: 'info',
          title: 'Horário Ótimo Identificado',
          description: `${bestHour.hour}h é o horário com maior taxa de leitura`,
          recommendation: `Concentre os disparos entre ${bestHour.hour}h e ${(bestHour.hour + 2) % 24}h`,
          impact: 'medium',
          metric: bestHour.hour
        });
      }
    }

    return insights;
  }, [campaigns]);

  // Calcular performance das campanhas
  const campaignPerformances = useMemo((): CampaignPerformance[] => {
    return campaigns.map(campaign => {
      // Calcular score geral (0-100)
      const deliveryScore = Math.min(campaign.metrics.deliveryRate, 100);
      const readScore = Math.min(campaign.metrics.readRate * 1.5, 100);
      const responseScore = Math.min(campaign.metrics.responseRate * 5, 100);
      const costScore = Math.max(0, 100 - (campaign.costs.costPerResponse * 10));
      
      const score = (deliveryScore + readScore + responseScore + costScore) / 4;

      return {
        campaignId: campaign.id,
        name: campaign.name,
        score: Math.round(score),
        benchmarkComparison: {
          deliveryRate: { value: campaign.metrics.deliveryRate, benchmark: 90 },
          readRate: { value: campaign.metrics.readRate, benchmark: 65 },
          responseRate: { value: campaign.metrics.responseRate, benchmark: 10 },
          costEfficiency: { value: campaign.costs.costPerResponse, benchmark: 3 }
        },
        timeAnalysis: {
          bestHours: [9, 10, 14, 15, 19, 20], // Simulado
          bestDays: ['Tuesday', 'Wednesday', 'Thursday'], // Simulado
          worstHours: [0, 1, 2, 3, 4, 5, 6], // Simulado
          worstDays: ['Sunday', 'Saturday'] // Simulado
        },
        audienceAnalysis: {
          mostEngaged: ['Clientes Premium', 'Produtores de Soja'], // Simulado
          leastEngaged: ['Fornecedores'], // Simulado
          optimalGroupSize: 25,
          toneEffectiveness: {
            formal: 85,
            normal: 75,
            informal: 65,
            alegre: 70
          }
        }
      };
    });
  }, [campaigns]);

  // Função para obter cor do insight
  const getInsightColor = (type: CampaignInsight['type']) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  // Função para obter ícone do insight
  const getInsightIcon = (type: CampaignInsight['type']) => {
    switch (type) {
      case 'success': return <CheckBadgeIcon className="h-5 w-5 text-green-600" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'error': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'info': return <LightBulbIcon className="h-5 w-5 text-blue-600" />;
      default: return <LightBulbIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  // Função para gerar recomendações de otimização
  const generateOptimizations = (performance: CampaignPerformance): string[] => {
    const optimizations: string[] = [];

    if (performance.benchmarkComparison.deliveryRate.value < performance.benchmarkComparison.deliveryRate.benchmark) {
      optimizations.push('Limpar lista de contatos inválidos');
    }

    if (performance.benchmarkComparison.readRate.value < performance.benchmarkComparison.readRate.benchmark) {
      optimizations.push('Ajustar horários de envio para os períodos de maior engajamento');
    }

    if (performance.benchmarkComparison.responseRate.value < performance.benchmarkComparison.responseRate.benchmark) {
      optimizations.push('Melhorar call-to-action e personalização das mensagens');
    }

    if (performance.benchmarkComparison.costEfficiency.value > performance.benchmarkComparison.costEfficiency.benchmark) {
      optimizations.push('Refinar segmentação para reduzir custos');
    }

    return optimizations;
  };

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <ArrowTrendingUpIcon className="h-6 w-6 mr-2" />
            Análise Avançada de Campanhas
          </h2>
          
          <div className="flex items-center space-x-3">
            <select
              value={selectedMetric}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="delivery">Entrega</option>
              <option value="engagement">Engajamento</option>
              <option value="cost">Custo</option>
              <option value="timing">Timing</option>
            </select>
            
            <select
              value={timeframe}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Insights e Recomendações */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <LightBulbIcon className="h-5 w-5 mr-2" />
          Insights e Recomendações
        </h3>

        {generateInsights.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <LightBulbIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum insight disponível. Execute algumas campanhas para obter análises.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generateInsights.map((insight, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                        insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {insight.impact === 'high' ? 'Alto Impacto' :
                         insight.impact === 'medium' ? 'Médio Impacto' : 'Baixo Impacto'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                    
                    {insight.recommendation && (
                      <div className="bg-white bg-opacity-50 rounded p-2">
                        <p className="text-sm font-medium text-gray-800">
                          💡 {insight.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance das Campanhas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          Performance das Campanhas
        </h3>

        <div className="space-y-4">
          {campaignPerformances.map(performance => (
            <div
              key={performance.campaignId}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{performance.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            performance.score >= 80 ? 'bg-green-500' :
                            performance.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${performance.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{performance.score}/100</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => onOptimizeCampaign(
                    performance.campaignId,
                    generateOptimizations(performance)
                  )}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Otimizar
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Taxa de Entrega</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {performance.benchmarkComparison.deliveryRate.value.toFixed(1)}%
                    </span>
                    <span className={`text-xs ${
                      performance.benchmarkComparison.deliveryRate.value >= performance.benchmarkComparison.deliveryRate.benchmark
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      vs {performance.benchmarkComparison.deliveryRate.benchmark}%
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-gray-500">Taxa de Leitura</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {performance.benchmarkComparison.readRate.value.toFixed(1)}%
                    </span>
                    <span className={`text-xs ${
                      performance.benchmarkComparison.readRate.value >= performance.benchmarkComparison.readRate.benchmark
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      vs {performance.benchmarkComparison.readRate.benchmark}%
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-gray-500">Taxa de Resposta</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {performance.benchmarkComparison.responseRate.value.toFixed(1)}%
                    </span>
                    <span className={`text-xs ${
                      performance.benchmarkComparison.responseRate.value >= performance.benchmarkComparison.responseRate.benchmark
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      vs {performance.benchmarkComparison.responseRate.benchmark}%
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-gray-500">Eficiência de Custo</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      R$ {performance.benchmarkComparison.costEfficiency.value.toFixed(2)}
                    </span>
                    <span className={`text-xs ${
                      performance.benchmarkComparison.costEfficiency.value <= performance.benchmarkComparison.costEfficiency.benchmark
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      vs R$ {performance.benchmarkComparison.costEfficiency.benchmark.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recomendações específicas */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Recomendações:</p>
                <div className="flex flex-wrap gap-2">
                  {generateOptimizations(performance).map((optimization, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {optimization}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CampaignAnalytics; 