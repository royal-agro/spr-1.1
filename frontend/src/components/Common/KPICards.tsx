import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'green' | 'red';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  trend,
  loading = false 
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    orange: {
      bg: 'bg-orange-500',
      lightBg: 'bg-orange-50',
      text: 'text-orange-600',
      iconBg: 'bg-orange-100'
    },
    green: {
      bg: 'bg-green-500',
      lightBg: 'bg-green-50',
      text: 'text-green-600',
      iconBg: 'bg-green-100'
    },
    red: {
      bg: 'bg-red-500',
      lightBg: 'bg-red-50',
      text: 'text-red-600',
      iconBg: 'bg-red-100'
    }
  };

  const classes = colorClasses[color];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
            <div className={`w-12 h-12 ${classes.iconBg} rounded-lg flex items-center justify-center`}>
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${classes.lightBg} rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow min-h-[100px] sm:min-h-[110px] flex flex-col justify-between`}>
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2 truncate">{title}</p>
          <div className="flex items-baseline space-x-2 mb-2">
            <h3 className={`text-lg sm:text-xl lg:text-2xl font-bold ${classes.text} leading-tight`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {trend && (
              <span className={`inline-flex items-center text-xs sm:text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                  </svg>
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-auto">{subtitle}</p>
          )}
        </div>
        
        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${classes.iconBg} rounded-lg flex items-center justify-center ml-3 flex-shrink-0`}>
          <div className={`${classes.text} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

// SPR WhatsApp Metrics KPI Cards Component
interface SPRKPICardsProps {
  totalMessages: number;
  totalContacts: number;
  responseTime: number;
  deliveryRate: number;
  loading?: boolean;
}

const SPRKPICards: React.FC<SPRKPICardsProps> = ({ 
  totalMessages, 
  totalContacts, 
  responseTime, 
  deliveryRate,
  loading = false 
}) => {
  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      <KPICard
        title="Total de Mensagens"
        value={totalMessages}
        subtitle="Mensagens enviadas"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }
        color="blue"
        trend={{
          value: 12,
          isPositive: true
        }}
        loading={loading}
      />

      <KPICard
        title="Contatos Ativos"
        value={totalContacts}
        subtitle="Contatos conectados"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        }
        color="orange"
        trend={{
          value: 8,
          isPositive: true
        }}
        loading={loading}
      />

      <KPICard
        title="Tempo de Resposta"
        value={formatResponseTime(responseTime)}
        subtitle="Tempo médio de resposta"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="green"
        trend={{
          value: 5,
          isPositive: false
        }}
        loading={loading}
      />

      <KPICard
        title="Taxa de Entrega"
        value={`${deliveryRate}%`}
        subtitle="Mensagens entregues"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="red"
        trend={{
          value: 2,
          isPositive: true
        }}
        loading={loading}
      />
    </div>
  );
};

// General Offer Book KPI Cards Component (for when integrated)
interface OfferBookKPICardsProps {
  buyOffers: number;
  sellOffers: number;
  matches: number;
  revenue: number;
  loading?: boolean;
}

const OfferBookKPICards: React.FC<OfferBookKPICardsProps> = ({ 
  buyOffers, 
  sellOffers, 
  matches, 
  revenue,
  loading = false 
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      <KPICard
        title="BUY Abertos"
        value={buyOffers}
        subtitle="Ofertas de compra ativas"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6-5V5a2 2 0 00-2-2H9a2 2 0 00-2 2v3m6 0V5" />
          </svg>
        }
        color="blue"
        trend={{
          value: 12,
          isPositive: true
        }}
        loading={loading}
      />

      <KPICard
        title="SELL Abertos"
        value={sellOffers}
        subtitle="Ofertas de venda ativas"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="orange"
        trend={{
          value: 8,
          isPositive: true
        }}
        loading={loading}
      />

      <KPICard
        title="Matches"
        value={matches}
        subtitle="Negócios realizados"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        color="green"
        trend={{
          value: 25,
          isPositive: true
        }}
        loading={loading}
      />

      <KPICard
        title="Faturamento"
        value={`R$ ${revenue.toLocaleString()}`}
        subtitle="Receita do período"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        color="red"
        trend={{
          value: 15,
          isPositive: true
        }}
        loading={loading}
      />
    </div>
  );
};

export { KPICard, SPRKPICards, OfferBookKPICards };
export default SPRKPICards;