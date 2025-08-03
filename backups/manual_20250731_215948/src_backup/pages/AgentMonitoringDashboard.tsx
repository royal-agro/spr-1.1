import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
  RefreshCw,
} from 'lucide-react';

interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastUpdate: string;
  uptime: number;
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
  responseTime: number;
}

interface SystemMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  activeAgents: number;
  commoditiesTracked: number;
  priceUpdatesLastHour: number;
  whatsappMessagesLastHour: number;
}

const AgentMonitoringDashboard: React.FC = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    uptime: 0,
    activeAgents: 0,
    commoditiesTracked: 0,
    priceUpdatesLastHour: 0,
    whatsappMessagesLastHour: 0,
  });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Mock data for demonstration
  useEffect(() => {
    const mockAgents: AgentStatus[] = [
      {
        id: 'db-agent',
        name: 'Database Engineer',
        type: 'database_engineer',
        status: 'healthy',
        lastUpdate: '2024-01-15T10:30:00Z',
        uptime: 99.9,
        activeConnections: 25,
        requestsPerMinute: 150,
        errorRate: 0.1,
        responseTime: 45,
      },
      {
        id: 'backend-agent',
        name: 'Backend Python',
        type: 'backend_python',
        status: 'healthy',
        lastUpdate: '2024-01-15T10:29:30Z',
        uptime: 99.8,
        activeConnections: 42,
        requestsPerMinute: 320,
        errorRate: 0.2,
        responseTime: 120,
      },
      {
        id: 'frontend-agent',
        name: 'Frontend React',
        type: 'frontend_react',
        status: 'degraded',
        lastUpdate: '2024-01-15T10:28:45Z',
        uptime: 98.5,
        activeConnections: 18,
        requestsPerMinute: 80,
        errorRate: 1.2,
        responseTime: 250,
      },
      {
        id: 'whatsapp-agent',
        name: 'WhatsApp Integration',
        type: 'whatsapp_specialist',
        status: 'healthy',
        lastUpdate: '2024-01-15T10:30:15Z',
        uptime: 99.7,
        activeConnections: 12,
        requestsPerMinute: 45,
        errorRate: 0.3,
        responseTime: 180,
      },
      {
        id: 'analytics-agent',
        name: 'Business Intelligence',
        type: 'business_intelligence',
        status: 'healthy',
        lastUpdate: '2024-01-15T10:29:00Z',
        uptime: 99.6,
        activeConnections: 8,
        requestsPerMinute: 25,
        errorRate: 0.1,
        responseTime: 300,
      },
      {
        id: 'data-agent',
        name: 'AgriTech Data',
        type: 'agritech_data',
        status: 'offline',
        lastUpdate: '2024-01-15T09:45:00Z',
        uptime: 95.2,
        activeConnections: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        responseTime: 0,
      },
    ];

    const mockSystemMetrics: SystemMetrics = {
      totalRequests: 1250000,
      averageResponseTime: 156,
      errorRate: 0.3,
      uptime: 99.2,
      activeAgents: 5,
      commoditiesTracked: 6,
      priceUpdatesLastHour: 342,
      whatsappMessagesLastHour: 128,
    };

    const mockPerformanceData = [
      { time: '10:00', requests: 420, responseTime: 145, errors: 2 },
      { time: '10:05', requests: 380, responseTime: 132, errors: 1 },
      { time: '10:10', requests: 450, responseTime: 156, errors: 3 },
      { time: '10:15', requests: 520, responseTime: 178, errors: 2 },
      { time: '10:20', requests: 480, responseTime: 149, errors: 1 },
      { time: '10:25', requests: 390, responseTime: 134, errors: 2 },
      { time: '10:30', requests: 510, responseTime: 167, errors: 4 },
    ];

    setAgents(mockAgents);
    setSystemMetrics(mockSystemMetrics);
    setPerformanceData(mockPerformanceData);
    setLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'offline': return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const refreshData = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLastRefresh(new Date());
      setLoading(false);
    }, 1000);
  };

  const agentDistributionData = agents.reduce((acc, agent) => {
    const existing = acc.find(item => item.status === agent.status);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ status: agent.status, count: 1 });
    }
    return acc;
  }, [] as Array<{status: string, count: number}>);

  const COLORS = {
    healthy: '#10B981',
    degraded: '#F59E0B',
    unhealthy: '#EF4444',
    offline: '#6B7280',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando métricas dos agentes...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Multi-Agente SPR</h1>
          <p className="text-gray-600 mt-2">
            Monitoramento em tempo real do sistema AgriTech
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Última atualização: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.activeAgents}/6</div>
            <p className="text-xs text-muted-foreground">
              {((systemMetrics.activeAgents / 6) * 100).toFixed(1)}% operacional
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Resposta</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.averageResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Meta: &lt; 200ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              Última hora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime Sistema</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Status dos Agentes</CardTitle>
          <CardDescription>
            Monitoramento individual de cada agente especializado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(agent.status)}
                    <h3 className="font-semibold">{agent.name}</h3>
                  </div>
                  <Badge 
                    className={`${getStatusColor(agent.status)} text-white`}
                  >
                    {agent.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Uptime:</span>
                    <span className="ml-1 font-medium">{agent.uptime}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Conexões:</span>
                    <span className="ml-1 font-medium">{agent.activeConnections}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Req/min:</span>
                    <span className="ml-1 font-medium">{agent.requestsPerMinute}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Resp. Time:</span>
                    <span className="ml-1 font-medium">{agent.responseTime}ms</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  Última atualização: {new Date(agent.lastUpdate).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance do Sistema</CardTitle>
            <CardDescription>Requisições e tempo de resposta</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="requests" fill="#3B82F6" opacity={0.6} />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#EF4444" 
                  strokeWidth={2} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>Status atual dos agentes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={agentDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {agentDistributionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.status as keyof typeof COLORS]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AgriTech Specific Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commodities Monitoradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.commoditiesTracked}</div>
            <p className="text-xs text-muted-foreground">
              Soja, Milho, Boi, Café, Açúcar, Algodão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atualizações de Preço</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.priceUpdatesLastHour}</div>
            <p className="text-xs text-muted-foreground">
              Última hora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens WhatsApp</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.whatsappMessagesLastHour}</div>
            <p className="text-xs text-muted-foreground">
              Enviadas na última hora
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentMonitoringDashboard;