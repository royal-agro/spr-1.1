import React from 'react';
import {
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ArrowTrendingDownIcon as TrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  CalendarDaysIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import {
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  PaperAirplaneIcon as PaperAirplaneIconSolid,
  ChartBarIcon as ChartBarIconSolid
} from '@heroicons/react/24/solid';

interface WidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  iconSolid?: React.ComponentType<any>;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  className?: string;
}

interface ActivityItem {
  id: string;
  type: 'message' | 'contact' | 'campaign' | 'system';
  title: string;
  subtitle: string;
  time: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface StatsGridProps {
  className?: string;
}

const StatWidget: React.FC<WidgetProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconSolid: IconSolid, 
  color, 
  trend,
  className = '' 
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-500',
      text: 'text-blue-600',
      textDark: 'text-blue-900'
    },
    green: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-500',
      text: 'text-green-600',
      textDark: 'text-green-900'
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-500',
      text: 'text-purple-600',
      textDark: 'text-purple-900'
    },
    orange: {
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-500',
      text: 'text-orange-600',
      textDark: 'text-orange-900'
    },
    red: {
      bg: 'bg-red-50',
      iconBg: 'bg-red-500',
      text: 'text-red-600',
      textDark: 'text-red-900'
    },
    indigo: {
      bg: 'bg-indigo-50',
      iconBg: 'bg-royal-primary',
      text: 'text-royal-primary',
      textDark: 'text-royal-primary-dark'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-royal-lg p-6 shadow-royal-sm hover:shadow-royal-md transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.text} mb-1`}>{title}</p>
          <p className={`text-3xl font-bold ${colors.textDark} mb-1`}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              {trend.isPositive ? (
                <TrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value}%
              </span>
              <span className="text-sm text-gray-500 ml-1">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`${colors.iconBg} p-3 rounded-royal-lg`}>
          {IconSolid ? (
            <IconSolid className="w-8 h-8 text-white" />
          ) : (
            <Icon className="w-8 h-8 text-white" />
          )}
        </div>
      </div>
    </div>
  );
};

const RecentActivity: React.FC<{ activities: ActivityItem[] }> = ({ activities }) => {
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'message': return 'text-blue-600 bg-blue-100';
      case 'contact': return 'text-green-600 bg-green-100';
      case 'campaign': return 'text-purple-600 bg-purple-100';
      case 'system': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-royal-lg shadow-royal-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-royal-gray-900">Atividade Recente</h3>
        <button className="text-royal-primary hover:text-royal-primary-dark text-sm font-medium">
          Ver todas
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {activity.title}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {activity.subtitle}
              </p>
            </div>
            <div className="text-xs text-gray-400">
              {activity.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QuickActions: React.FC = () => {
  const actions = [
    {
      id: 'new-message',
      label: 'Nova Mensagem',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => console.log('Nova mensagem')
    },
    {
      id: 'add-contact',
      label: 'Adicionar Contato',
      icon: UserGroupIcon,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => console.log('Adicionar contato')
    },
    {
      id: 'create-campaign',
      label: 'Criar Campanha',
      icon: PaperAirplaneIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => console.log('Criar campanha')
    },
    {
      id: 'view-analytics',
      label: 'Ver Relatórios',
      icon: ChartBarIcon,
      color: 'bg-royal-primary hover:bg-royal-primary-dark',
      onClick: () => console.log('Ver relatórios')
    }
  ];

  return (
    <div className="bg-white rounded-royal-lg shadow-royal-sm p-6">
      <h3 className="text-lg font-semibold text-royal-gray-900 mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`${action.color} text-white p-4 rounded-royal-md transition-all duration-200 hover:shadow-royal-md transform hover:scale-105`}
          >
            <action.icon className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const DashboardWidgets: React.FC<StatsGridProps> = ({ className = '' }) => {
  // Dados mockados - em produção viriam da API
  const stats = {
    totalMessages: 1247,
    totalContacts: 156,
    campaignsActive: 8,
    deliveryRate: 94.2
  };

  const recentActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'message',
      title: 'Nova mensagem recebida',
      subtitle: 'Cliente João Silva - Sobre preços da soja',
      time: '2 min',
      icon: ChatBubbleLeftRightIcon,
      color: 'blue'
    },
    {
      id: '2',
      type: 'contact',
      title: 'Novo contato adicionado',
      subtitle: 'Maria Santos - Produtora de milho',
      time: '15 min',
      icon: UserGroupIcon,
      color: 'green'
    },
    {
      id: '3',
      type: 'campaign',
      title: 'Campanha finalizada',
      subtitle: 'Relatório semanal - 89% entregue',
      time: '1h',
      icon: PaperAirplaneIcon,
      color: 'purple'
    },
    {
      id: '4',
      type: 'system',
      title: 'Backup automático',
      subtitle: 'Dados sincronizados com sucesso',
      time: '2h',
      icon: CheckCircleIcon,
      color: 'orange'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatWidget
          title="Total de Mensagens"
          value={stats.totalMessages}
          subtitle="Este mês"
          icon={ChatBubbleLeftRightIcon}
          iconSolid={ChatBubbleLeftRightIconSolid}
          color="indigo"
          trend={{
            value: 12.5,
            isPositive: true,
            label: 'vs mês anterior'
          }}
        />
        
        <StatWidget
          title="Contatos Ativos"
          value={stats.totalContacts}
          subtitle="Cadastrados"
          icon={UserGroupIcon}
          iconSolid={UserGroupIconSolid}
          color="green"
          trend={{
            value: 8.3,
            isPositive: true,
            label: 'novos contatos'
          }}
        />
        
        <StatWidget
          title="Campanhas Ativas"
          value={stats.campaignsActive}
          subtitle="Em andamento"
          icon={PaperAirplaneIcon}
          iconSolid={PaperAirplaneIconSolid}
          color="purple"
        />
        
        <StatWidget
          title="Taxa de Entrega"
          value={`${stats.deliveryRate}%`}
          subtitle="Últimos 30 dias"
          icon={ChartBarIcon}
          iconSolid={ChartBarIconSolid}
          color="blue"
          trend={{
            value: 2.1,
            isPositive: true,
            label: 'melhoria'
          }}
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity activities={recentActivities} />
        </div>
        
        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-royal-lg shadow-royal-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">WhatsApp Status</p>
              <div className="flex items-center mt-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-lg font-semibold text-gray-900">Conectado</span>
              </div>
            </div>
            <PhoneIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-royal-lg shadow-royal-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mensagens Pendentes</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">3</p>
            </div>
            <ClockIcon className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-royal-lg shadow-royal-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Próxima Agenda</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">14:30</p>
              <p className="text-sm text-gray-500">Reunião com cliente</p>
            </div>
            <CalendarDaysIcon className="w-8 h-8 text-royal-primary" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardWidgets;