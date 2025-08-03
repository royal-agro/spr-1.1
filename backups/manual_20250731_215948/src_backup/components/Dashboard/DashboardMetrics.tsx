import React from 'react';
import { 
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, change }) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    change.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.trend === 'up' ? '↑' : '↓'} {Math.abs(change.value)}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DashboardMetricsProps {
  metrics: {
    totalMessages: number;
    totalContacts: number;
    activeChats: number;
    responseTime: number;
    deliveryRate: number;
    readRate: number;
  };
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ metrics }) => {
  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const metricCards = [
    {
      title: 'Total de Mensagens',
      value: metrics.totalMessages.toLocaleString('pt-BR'),
      icon: ChatBubbleLeftRightIcon,
      color: 'text-blue-600',
      change: { value: 12, trend: 'up' as const }
    },
    {
      title: 'Contatos Ativos',
      value: metrics.totalContacts,
      icon: UsersIcon,
      color: 'text-green-600',
      change: { value: 8, trend: 'up' as const }
    },
    {
      title: 'Tempo de Resposta',
      value: formatResponseTime(metrics.responseTime),
      icon: ClockIcon,
      color: 'text-yellow-600',
      change: { value: 5, trend: 'down' as const }
    },
    {
      title: 'Taxa de Entrega',
      value: `${metrics.deliveryRate}%`,
      icon: CheckCircleIcon,
      color: 'text-purple-600',
      change: { value: 2, trend: 'up' as const }
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};

export default DashboardMetrics; 