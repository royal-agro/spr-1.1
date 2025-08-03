import React, { useState } from 'react';

interface CommodityData {
  price: number;
  variation: number;
  unit: string;
  source: string;
}

interface CommodityChartProps {
  data: Record<string, CommodityData>;
}

// Dados simulados para os últimos 30 dias
const generateChartData = (commodities: Record<string, CommodityData>) => {
  const days = 30;
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
  });

  const chartData = dates.map((date, index) => {
    const dataPoint: any = { date };
    
    Object.entries(commodities).forEach(([commodity, info]) => {
      // Simular variação histórica mais pronunciada
      const basePrice = info.price;
      const volatility = Math.max(0.05, Math.abs(info.variation) * 0.2); // Mínimo 5% de volatilidade
      const trend = info.variation / 100; // Tendência baseada na variação atual
      
      // Gerar variação senoidal para criar movimento mais visível
      const sineFactor = Math.sin((index / days) * Math.PI * 2) * 0.03; // Variação senoidal de 3%
      const randomFactor = (Math.random() - 0.5) * volatility;
      const trendFactor = (index / days) * trend;
      
      const price = basePrice * (1 + trendFactor + randomFactor + sineFactor);
      
      dataPoint[commodity] = Number(price.toFixed(2));
    });
    
    return dataPoint;
  });

  console.log('Generated chart data:', chartData); // Debug
  return chartData;
};

const CommodityChart: React.FC<CommodityChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'absolute' | 'normalized' | 'percentage'>('normalized');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('all');
  const chartData = generateChartData(data);
  
  // Cores para cada commodity
  const colors = {
    soja: '#10B981', // Verde
    milho: '#F59E0B', // Amarelo
    algodao: '#EF4444', // Vermelho
    boi: '#8B5CF6', // Roxo
    dolar: '#3B82F6' // Azul
  };

  // Função para obter commodities visíveis
  const getVisibleCommodities = () => {
    if (selectedCommodity === 'all') {
      return Object.keys(data);
    }
    return [selectedCommodity];
  };

  // Função para normalizar valores (0-100 baseado no valor inicial)
  const normalizeToPercentage = (commodity: string, currentValue: number, index: number) => {
    const initialValue = chartData[0][commodity];
    return ((currentValue - initialValue) / initialValue) * 100;
  };

  // Função para normalizar valores para escala 0-100
  const normalizeToScale = (commodity: string) => {
    const values = chartData.map(item => item[commodity]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    return chartData.map(item => {
      if (range === 0) return 50; // Se não há variação, centraliza
      return ((item[commodity] - min) / range) * 100;
    });
  };

  // Função para obter valores baseados no modo de visualização
  const getChartValues = () => {
    const result: Record<string, number[]> = {};
    const visibleCommodities = getVisibleCommodities();
    
    visibleCommodities.forEach(commodity => {
      if (viewMode === 'absolute') {
        // Valores absolutos - usar escala individual para cada commodity
        result[commodity] = normalizeToScale(commodity);
      } else if (viewMode === 'normalized') {
        // Valores normalizados (0-100 baseado no min/max individual)
        result[commodity] = normalizeToScale(commodity);
      } else {
        // Variação percentual baseada no primeiro valor
        result[commodity] = chartData.map((item, index) => {
          const percentChange = normalizeToPercentage(commodity, item[commodity], index);
          // Converter para escala 0-100 (50 = 0% de variação)
          return 50 + (percentChange * 2); // Amplifica a variação para melhor visualização
        });
      }
    });
    
    return result;
  };

  const chartValues = getChartValues();
  console.log('Chart values:', chartValues); // Debug

  // Gerar pontos para cada linha com curvas suaves
  const generatePath = (commodity: string) => {
    const values = chartValues[commodity];
    if (!values || values.length === 0) return '';
    
    if (values.length === 1) {
      const x = 0;
      const y = 100 - values[0];
      return `M ${x} ${y}`;
    }
    
    let path = '';
    
    // Começar o caminho
    const firstX = 0;
    const firstY = 100 - values[0];
    path += `M ${firstX} ${firstY}`;
    
    // Criar curvas suaves usando curvas quadráticas Bézier
    for (let i = 1; i < values.length; i++) {
      const currentX = (i / (values.length - 1)) * 100;
      const currentY = 100 - values[i];
      
      if (i === 1) {
        // Primeira curva - usar controle simples
        const prevX = ((i - 1) / (values.length - 1)) * 100;
        const controlX = (prevX + currentX) / 2;
        const controlY = 100 - values[i - 1];
        path += ` Q ${controlX} ${controlY} ${currentX} ${currentY}`;
      } else {
        // Curvas subsequentes - usar controles mais suaves
        const prevX = ((i - 1) / (values.length - 1)) * 100;
        const prevY = 100 - values[i - 1];
        
        // Calcular ponto de controle para suavização
        const controlX = prevX + (currentX - prevX) * 0.5;
        const controlY = prevY + (currentY - prevY) * 0.3;
        
        path += ` Q ${controlX} ${controlY} ${currentX} ${currentY}`;
      }
    }
    
    return path;
  };

  // Função para obter label do eixo Y baseado no modo
  const getYAxisLabels = () => {
    if (viewMode === 'percentage') {
      return ['+10%', '+5%', '0%', '-5%', '-10%'];
    } else if (viewMode === 'normalized') {
      return ['Máx', '75%', '50%', '25%', 'Mín'];
    } else {
      return ['Alto', '75%', '50%', '25%', 'Baixo'];
    }
  };

  // Função para obter tooltip
  const getTooltipValue = (commodity: string, index: number) => {
    const actualValue = chartData[index][commodity];
    const unit = data[commodity].unit;
    
    if (viewMode === 'percentage') {
      const percentChange = normalizeToPercentage(commodity, actualValue, index);
      return `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`;
    } else {
      return `${actualValue.toFixed(2)} ${unit}`;
    }
  };

  // Função para obter o nome formatado da commodity
  const getCommodityName = (commodity: string) => {
    return commodity === 'algodao' ? 'Algodão' : 
           commodity === 'dolar' ? 'Dólar' : commodity;
  };

  return (
    <div className="w-full h-full">
      {/* Controles de Visualização */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('normalized')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              viewMode === 'normalized' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Normalizado
          </button>
          <button
            onClick={() => setViewMode('percentage')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              viewMode === 'percentage' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Variação %
          </button>
          <button
            onClick={() => setViewMode('absolute')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              viewMode === 'absolute' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Absoluto
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Seletor de Commodity */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Commodity:</label>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              {Object.keys(data).map(commodity => (
                <option key={commodity} value={commodity}>
                  {getCommodityName(commodity)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Legenda */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {getVisibleCommodities().map(commodity => (
              <div key={commodity} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[commodity as keyof typeof colors] }}
                />
                <span className="text-xs sm:text-sm text-gray-600 capitalize">
                  {getCommodityName(commodity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Descrição do Modo */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          {viewMode === 'normalized' && 
            'Modo Normalizado: Cada commodity é escalada individualmente de 0% a 100% baseado em seus valores mínimo e máximo.'
          }
          {viewMode === 'percentage' && 
            'Modo Variação %: Mostra a variação percentual de cada commodity em relação ao primeiro valor do período.'
          }
          {viewMode === 'absolute' && 
            'Modo Absoluto: Cada commodity é escalada individualmente para melhor visualização das tendências.'
          }
          {selectedCommodity !== 'all' && (
            <span className="ml-2 font-medium">
              Visualizando apenas: {getCommodityName(selectedCommodity)}
            </span>
          )}
        </p>
      </div>

      {/* Gráfico SVG */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[400px]">
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full border border-gray-200 rounded-lg bg-gray-50"
          preserveAspectRatio="none"
        >
          {/* Grid horizontal */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#E5E7EB"
              strokeWidth="0.2"
            />
          ))}
          
          {/* Grid vertical */}
          {Array.from({ length: 7 }, (_, i) => i * (100 / 6)).map(x => (
            <line
              key={x}
              x1={x}
              y1="0"
              x2={x}
              y2="100"
              stroke="#E5E7EB"
              strokeWidth="0.2"
            />
          ))}

          {/* Linha de referência para modo percentual */}
          {viewMode === 'percentage' && (
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="#6B7280"
              strokeWidth="0.4"
              strokeDasharray="2,2"
            />
          )}

          {/* Linhas das commodities */}
          {getVisibleCommodities().map(commodity => {
            const path = generatePath(commodity);
            console.log(`Path for ${commodity}:`, path); // Debug
            return (
              <path
                key={commodity}
                d={path}
                fill="none"
                stroke={colors[commodity as keyof typeof colors]}
                strokeWidth={selectedCommodity === 'all' ? '0.8' : '1.2'}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="hover:opacity-100 transition-opacity"
                style={{ opacity: selectedCommodity === 'all' ? 0.85 : 1 }}
              />
            );
          })}

          {/* Pontos para cada commodity */}
          {getVisibleCommodities().map(commodity => 
            chartValues[commodity].map((value, index) => (
              <circle
                key={`${commodity}-${index}`}
                cx={(index / (chartValues[commodity].length - 1)) * 100}
                cy={100 - value}
                r={selectedCommodity === 'all' ? '0.6' : '0.8'}
                fill={colors[commodity as keyof typeof colors]}
                className="hover:r-2 transition-all cursor-pointer"
                style={{ opacity: selectedCommodity === 'all' ? 0.6 : 0.8 }}
              >
                <title>
                  {getCommodityName(commodity)}: {getTooltipValue(commodity, index)}
                </title>
              </circle>
            ))
          )}
        </svg>

        {/* Labels do eixo Y */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-12">
          {getYAxisLabels().map((label, index) => (
            <span key={index} className="transform -translate-y-2">
              {label}
            </span>
          ))}
        </div>

        {/* Labels do eixo X */}
        <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-gray-500 -mb-6">
          {chartData.filter((_, index) => index % 5 === 0).map((item, index) => (
            <span key={index}>{item.date}</span>
          ))}
        </div>
      </div>

      {/* Resumo estatístico */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {getVisibleCommodities().map(commodity => {
          const info = data[commodity];
          return (
            <div key={commodity} className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="font-medium capitalize text-xs sm:text-sm">
                {getCommodityName(commodity)}
              </div>
              <div className={`text-sm sm:text-base font-semibold ${info.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {info.variation >= 0 ? '+' : ''}{info.variation.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {info.price.toFixed(2)} {info.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommodityChart; 