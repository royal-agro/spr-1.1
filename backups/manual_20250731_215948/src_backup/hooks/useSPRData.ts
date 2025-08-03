import { useState, useEffect } from 'react';
import { getSPRApiUrl } from '../config';

interface SPRCommodity {
  id: number;
  symbol: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
}

interface SPRPrice {
  id: number;
  commodity_id: number;
  price: number;
  region: string;
  state: string;
  timestamp: string;
  source: string;
}

interface SPRPrediction {
  id: number;
  commodity_id: number;
  commodity_symbol: string;
  predicted_price: number;
  confidence: number;
  horizon_days: number;
  model: string;
}

interface SPRAlert {
  id: number;
  commodity_symbol: string;
  type: string;
  threshold: number;
  status: string;
}

interface SPRWeatherData {
  station: string;
  region: string;
  state: string;
  temp: number;
  humidity: number;
  rain: number;
}

interface SPRData {
  commodities: SPRCommodity[];
  predictions: SPRPrediction[];
  alerts: SPRAlert[];
  weather: SPRWeatherData[];
  agents: Record<string, any>;
  loading: boolean;
  error: string | null;
  lastUpdate: Date;
}

export const useSPRData = () => {
  const [data, setData] = useState<SPRData>({
    commodities: [],
    predictions: [],
    alerts: [],
    weather: [],
    agents: {},
    loading: true,
    error: null,
    lastUpdate: new Date()
  });

  const fetchSPRData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Buscar dados em paralelo
      const [
        commoditiesRes,
        predictionsRes,
        alertsRes,
        weatherRes,
        agentsRes
      ] = await Promise.all([
        fetch(getSPRApiUrl('/commodities/')),
        fetch(getSPRApiUrl('/predictions/')),
        fetch(getSPRApiUrl('/alerts/')),
        fetch(getSPRApiUrl('/weather/')),
        fetch(getSPRApiUrl('/agents/'))
      ]);

      // Verificar se todas as respostas foram bem-sucedidas
      if (!commoditiesRes.ok) throw new Error('Erro ao buscar commodities');
      if (!predictionsRes.ok) throw new Error('Erro ao buscar previsões');
      if (!alertsRes.ok) throw new Error('Erro ao buscar alertas');
      if (!weatherRes.ok) throw new Error('Erro ao buscar dados climáticos');
      if (!agentsRes.ok) throw new Error('Erro ao buscar status dos agentes');

      // Processar respostas
      const commoditiesData = await commoditiesRes.json();
      const predictionsData = await predictionsRes.json();
      const alertsData = await alertsRes.json();
      const weatherData = await weatherRes.json();
      const agentsData = await agentsRes.json();

      setData({
        commodities: commoditiesData.data || [],
        predictions: predictionsData.data || [],
        alerts: alertsData.data || [],
        weather: weatherData.data || [],
        agents: agentsData.agents || {},
        loading: false,
        error: null,
        lastUpdate: new Date()
      });

    } catch (error) {
      console.error('Erro ao buscar dados SPR:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  };

  const getCommodityById = (id: number): SPRCommodity | undefined => {
    return data.commodities.find(c => c.id === id);
  };

  const getCommodityBySymbol = (symbol: string): SPRCommodity | undefined => {
    return data.commodities.find(c => c.symbol === symbol);
  };

  const getPredictionsForCommodity = (commodityId: number): SPRPrediction[] => {
    return data.predictions.filter(p => p.commodity_id === commodityId);
  };

  const getActiveAlerts = (): SPRAlert[] => {
    return data.alerts.filter(a => a.status === 'active');
  };

  const getAgentStatus = (agentId: string) => {
    return data.agents[agentId] || { status: 'unknown', description: 'Status não disponível' };
  };

  // Buscar dados na inicialização
  useEffect(() => {
    fetchSPRData();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchSPRData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    ...data,
    refresh: fetchSPRData,
    getCommodityById,
    getCommodityBySymbol,
    getPredictionsForCommodity,
    getActiveAlerts,
    getAgentStatus
  };
};