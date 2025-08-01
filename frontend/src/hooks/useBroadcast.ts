import { useState, useEffect, useCallback } from 'react';
import { 
  BroadcastCampaign, 
  BroadcastGroup, 
  BroadcastStats,
  CreateBroadcastRequest,
  ApprovalRequest 
} from '../types';

interface UseBroadcastReturn {
  // Estado
  campaigns: BroadcastCampaign[];
  groups: BroadcastGroup[];
  stats: BroadcastStats | null;
  loading: boolean;
  error: string | null;
  
  // Ações para campanhas
  fetchPendingCampaigns: () => Promise<void>;
  fetchCampaignHistory: (limit?: number) => Promise<void>;
  createCampaign: (data: CreateBroadcastRequest) => Promise<{ success: boolean; error?: string; campaign_id?: number }>;
  processApproval: (campaignId: number, data: ApprovalRequest) => Promise<{ success: boolean; error?: string }>;
  
  // Ações para grupos
  fetchGroups: () => Promise<void>;
  createGroup: (data: { name: string; description?: string; manual_contacts: Array<{ phone: string; name: string }> }) => Promise<{ success: boolean; error?: string; group_id?: number }>;
  
  // Ações para stats
  fetchStats: () => Promise<void>;
  
  // Utilitários
  clearError: () => void;
  refresh: () => Promise<void>;
}

// Simulação de API - substituir pelas chamadas reais
const API_BASE = '/api/spr/broadcast';

const mockFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
  
  let mockData: any;
  
  // Mock responses baseadas no endpoint
  if (endpoint.includes('/campaigns/pending')) {
    mockData = {
      success: true,
      campaigns: [
        {
          id: 1,
          name: "Relatório Semanal - Preços Soja",
          message_content: "📊 *Relatório Semanal - Soja*\n\n💰 Preço atual: R$ 127,50/saca\n📈 Variação: +2,3% na semana",
          status: 'pending_approval',
          created_by: "maria.silva",
          created_by_role: "operator",
          created_at: new Date().toISOString(),
          total_recipients: 45,
          messages_sent: 0,
          messages_delivered: 0,
          messages_failed: 0,
          group_name: "Produtores de Soja",
          priority: "medium",
          can_approve: true,
          can_edit: true,
          already_voted: false
        }
      ],
      total: 1
    };
  } else if (endpoint.includes('/groups')) {
    mockData = {
      success: true,
      groups: [
        {
          id: 1,
          name: "Produtores de Soja",
          description: "Produtores especializados em soja",
          contact_count: 45,
          created_by: "admin",
          created_at: new Date().toISOString(),
          auto_approve: false,
          manual_contacts: []
        }
      ],
      total: 1
    };
  } else if (endpoint.includes('/status')) {
    mockData = {
      success: true,
      status: {
        total_campaigns: 12,
        pending_approvals: 3,
        my_campaigns: 5,
        active_groups: 6,
        user_permissions: {
          can_create_campaigns: true,
          can_approve: true,
          can_edit: true,
          can_create_groups: true
        }
      }
    };
  } else {
    // Default success response
    mockData = { success: true };
  }
  
  // Retornar um objeto Response real
  return new Response(JSON.stringify(mockData), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const useBroadcast = (): UseBroadcastReturn => {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [groups, setGroups] = useState<BroadcastGroup[]>([]);
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<Response>,
    onSuccess?: (data: any) => void
  ): Promise<T | null> => {
    try {
      setError(null);
      const response = await apiCall();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Operação falhou');
      }
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro na API:', err);
      return null;
    }
  }, []);

  // Campanhas
  const fetchPendingCampaigns = useCallback(async () => {
    setLoading(true);
    await handleApiCall(
      () => mockFetch(`${API_BASE}/campaigns/pending`),
      (data) => setCampaigns(data.campaigns || [])
    );
    setLoading(false);
  }, [handleApiCall]);

  const fetchCampaignHistory = useCallback(async (limit = 50) => {
    setLoading(true);
    await handleApiCall(
      () => mockFetch(`${API_BASE}/campaigns/history?limit=${limit}`),
      (data) => setCampaigns(data.campaigns || [])
    );
    setLoading(false);
  }, [handleApiCall]);

  const createCampaign = useCallback(async (data: CreateBroadcastRequest) => {
    const result = await handleApiCall<{ campaign_id: number }>(
      () => mockFetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    );

    if (result) {
      // Recarregar campanhas pendentes
      await fetchPendingCampaigns();
      return { success: true, campaign_id: result.campaign_id };
    }

    return { success: false, error: error || 'Erro ao criar campanha' };
  }, [handleApiCall, fetchPendingCampaigns, error]);

  const processApproval = useCallback(async (campaignId: number, data: ApprovalRequest) => {
    const result = await handleApiCall(
      () => mockFetch(`${API_BASE}/campaigns/${campaignId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    );

    if (result) {
      // Atualizar campanha local
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { 
              ...campaign, 
              already_voted: true, 
              my_vote: data.action === 'approve' ? 'approved' : 'rejected' 
            }
          : campaign
      ));
      return { success: true };
    }

    return { success: false, error: error || 'Erro ao processar aprovação' };
  }, [handleApiCall, error]);

  // Grupos
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    await handleApiCall(
      () => mockFetch(`${API_BASE}/groups`),
      (data) => setGroups(data.groups || [])
    );
    setLoading(false);
  }, [handleApiCall]);

  const createGroup = useCallback(async (data: { 
    name: string; 
    description?: string; 
    manual_contacts: Array<{ phone: string; name: string }> 
  }) => {
    const result = await handleApiCall<{ group_id: number }>(
      () => mockFetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    );

    if (result) {
      // Recarregar grupos
      await fetchGroups();
      return { success: true, group_id: result.group_id };
    }

    return { success: false, error: error || 'Erro ao criar grupo' };
  }, [handleApiCall, fetchGroups, error]);

  // Stats
  const fetchStats = useCallback(async () => {
    await handleApiCall(
      () => mockFetch(`${API_BASE}/status`),
      (data) => setStats(data.status || null)
    );
  }, [handleApiCall]);

  // Refresh geral
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchPendingCampaigns(),
      fetchGroups(),
      fetchStats()
    ]);
  }, [fetchPendingCampaigns, fetchGroups, fetchStats]);

  // Carregar dados iniciais
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // Estado
    campaigns,
    groups,
    stats,
    loading,
    error,
    
    // Ações para campanhas
    fetchPendingCampaigns,
    fetchCampaignHistory,
    createCampaign,
    processApproval,
    
    // Ações para grupos
    fetchGroups,
    createGroup,
    
    // Ações para stats
    fetchStats,
    
    // Utilitários
    clearError,
    refresh
  };
};