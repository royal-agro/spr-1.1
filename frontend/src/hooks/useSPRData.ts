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

      // Testar se o endpoint principal está disponível
      const testRes = await fetch(getSPRApiUrl('/api/spr/broadcast/test'));
      if (!testRes.ok) {
        throw new Error('Backend SPR não está disponível');
      }

      // Dados mock enquanto endpoints reais não estão implementados
      const mockData = {
        commodities: [
          { id: 1, symbol: 'SOJA', name: 'Soja', category: 'grãos', unit: 'R$/60kg', active: true, current_price: 130.00, price_change_percent: 0.04 },
          { id: 2, symbol: 'MILHO', name: 'Milho', category: 'grãos', unit: 'R$/60kg', active: true, current_price: 63.19, price_change_percent: -0.25 },
          { id: 3, symbol: 'ALGODAO', name: 'Algodão', category: 'fibras', unit: '¢/lb', active: true, current_price: 66.11, price_change_percent: -0.38 },
          { id: 4, symbol: 'BOI', name: 'Boi Gordo', category: 'pecuária', unit: 'R$/@', active: true, current_price: 305.00, price_change_percent: -0.20 },
          { id: 5, symbol: 'DOLAR', name: 'Dólar', category: 'cambio', unit: 'R$/USD', active: true, current_price: 5.56, price_change_percent: 0.95 }
        ],
        predictions: [
          { id: 1, commodity_id: 1, commodity_symbol: 'SOJA', predicted_price: 135.50, confidence: 0.85, horizon_days: 30, model: 'LSTM' },
          { id: 2, commodity_id: 2, commodity_symbol: 'MILHO', predicted_price: 65.80, confidence: 0.78, horizon_days: 30, model: 'LSTM' }
        ],
        alerts: [
          { id: 1, commodity_symbol: 'SOJA', type: 'price_alert', threshold: 125.00, status: 'active' },
          { id: 2, commodity_symbol: 'MILHO', type: 'volume_alert', threshold: 1000, status: 'active' }
        ],
        weather: [
          { station: 'SORRISO-MT', region: 'Centro-Oeste', state: 'MT', temp: 28.5, humidity: 65, rain: 2.3 },
          { station: 'CASCAVEL-PR', region: 'Sul', state: 'PR', temp: 22.1, humidity: 78, rain: 0.0 }
        ],
        agents: {
          'backend': { status: 'online', description: 'Backend funcionando' },
          'whatsapp': { status: 'online', description: 'WhatsApp conectado' },
          'frontend': { status: 'online', description: 'Frontend ativo' }
        }
      };

      setData({
        commodities: mockData.commodities,
        predictions: mockData.predictions,
        alerts: mockData.alerts,
        weather: mockData.weather,
        agents: mockData.agents,
        loading: false,
        error: null,
        lastUpdate: new Date()
      });

    } catch (error) {
      console.error('Erro ao buscar dados SPR:', error);
      
      // Fallback para dados locais em caso de erro
      const fallbackData = {
        commodities: [
          { id: 1, symbol: 'SOJA', name: 'Soja', category: 'grãos', unit: 'R$/60kg', active: true, current_price: 130.00, price_change_percent: 0.04 },
          { id: 2, symbol: 'MILHO', name: 'Milho', category: 'grãos', unit: 'R$/60kg', active: true, current_price: 63.19, price_change_percent: -0.25 }
        ],
        predictions: [],
        alerts: [],
        weather: [],
        agents: {}
      };

      setData({
        commodities: fallbackData.commodities,
        predictions: fallbackData.predictions,
        alerts: fallbackData.alerts,
        weather: fallbackData.weather,
        agents: fallbackData.agents,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro ao conectar com backend',
        lastUpdate: new Date()
      });
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