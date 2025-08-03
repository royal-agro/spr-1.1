import React from 'react';
import GentelellaLayout from '../components/Layout/GentelellaLayout';
import DashboardWidgets from '../components/Dashboard/DashboardWidgets';
import ModernWhatsAppInterface from '../components/WhatsApp/ModernWhatsAppInterface';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

const DashboardGentelella: React.FC = () => {
  // Dados para gráficos (mockados)
  const chartData = {
    messagesPerDay: [
      { day: 'Seg', sent: 45, received: 32 },
      { day: 'Ter', sent: 52, received: 41 },
      { day: 'Qua', sent: 49, received: 35 },
      { day: 'Qui', sent: 63, received: 48 },
      { day: 'Sex', sent: 58, received: 42 },
      { day: 'Sáb', sent: 35, received: 28 },
      { day: 'Dom', sent: 28, received: 22 }
    ],
    campaignPerformance: [
      { name: 'Relatório Semanal', delivered: 89, failed: 11 },
      { name: 'Preços da Soja', delivered: 94, failed: 6 },
      { name: 'Clima e Plantio', delivered: 87, failed: 13 },
      { name: 'Mercado Futuro', delivered: 92, failed: 8 }
    ]
  };

  return (
    <GentelellaLayout currentPage="dashboard">
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="bg-royal-gradient-primary rounded-royal-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Bem-vindo ao SPR Dashboard
              </h1>
              <p className="text-royal-gray-100 text-lg">
                Sistema de Gestão Royal Negócios Agrícolas - Painel Administrativo
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white bg-opacity-20 rounded-royal-lg p-4">
                <div className="flex items-center space-x-2 text-white">
                  <CalendarDaysIcon className="w-6 h-6" />
                  <div>
                    <p className="font-medium">
                      {new Date().toLocaleDateString('pt-BR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm opacity-80">
                      {new Date().toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Widgets */}
        <DashboardWidgets />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Chart */}
          <div className="bg-white rounded-royal-lg shadow-royal-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-royal-gray-900">
                  Mensagens por Dia
                </h3>
                <p className="text-sm text-royal-gray-500">
                  Últimos 7 dias
                </p>
              </div>
              <ChartBarIcon className="w-6 h-6 text-royal-primary" />
            </div>
            
            <div className="space-y-3">
              {chartData.messagesPerDay.map((day, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-8 text-sm font-medium text-royal-gray-600">
                    {day.day}
                  </div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="flex-1 bg-royal-gray-200 rounded-full h-2">
                      <div 
                        className="bg-royal-primary h-2 rounded-full"
                        style={{ width: `${(day.sent / 70) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-royal-gray-600">{day.sent}</span>
                  </div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="flex-1 bg-royal-gray-200 rounded-full h-2">
                      <div 
                        className="bg-royal-secondary h-2 rounded-full"
                        style={{ width: `${(day.received / 70) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-royal-gray-600">{day.received}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-royal-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-royal-primary rounded-full"></div>
                <span className="text-sm text-royal-gray-600">Enviadas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-royal-secondary rounded-full"></div>
                <span className="text-sm text-royal-gray-600">Recebidas</span>
              </div>
            </div>
          </div>

          {/* Campaign Performance */}
          <div className="bg-white rounded-royal-lg shadow-royal-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-royal-gray-900">
                  Performance de Campanhas
                </h3>
                <p className="text-sm text-royal-gray-500">
                  Taxa de entrega por campanha
                </p>
              </div>
              <TrendingUpIcon className="w-6 h-6 text-green-500" />
            </div>
            
            <div className="space-y-4">
              {chartData.campaignPerformance.map((campaign, index) => (
                <div key={index} className="p-4 bg-royal-gray-50 rounded-royal-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-royal-gray-900">
                      {campaign.name}
                    </h4>
                    <span className="text-sm font-semibold text-green-600">
                      {campaign.delivered}%
                    </span>
                  </div>
                  <div className="w-full bg-royal-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${campaign.delivered}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-royal-gray-500 mt-1">
                    <span>Entregue: {campaign.delivered}%</span>
                    <span>Falhada: {campaign.failed}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WhatsApp Interface */}
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-royal-gray-900">
              Interface WhatsApp
            </h2>
            <p className="text-royal-gray-600">
              Gerencie suas conversas e mensagens em tempo real
            </p>
          </div>
          <ModernWhatsAppInterface />
        </div>

        {/* Performance Summary */}
        <div className="bg-white rounded-royal-lg shadow-royal-sm p-6">
          <h3 className="text-lg font-semibold text-royal-gray-900 mb-4">
            Resumo de Performance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserGroupIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-royal-gray-900 mb-1">
                Engajamento
              </h4>
              <p className="text-2xl font-bold text-blue-600 mb-1">87%</p>
              <p className="text-sm text-royal-gray-500">
                Taxa de resposta dos clientes
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUpIcon className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-royal-gray-900 mb-1">
                Crescimento
              </h4>
              <p className="text-2xl font-bold text-green-600 mb-1">+23%</p>
              <p className="text-sm text-royal-gray-500">
                Novos contatos este mês
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ChartBarIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-royal-gray-900 mb-1">
                Eficiência
              </h4>
              <p className="text-2xl font-bold text-purple-600 mb-1">94%</p>
              <p className="text-sm text-royal-gray-500">
                Taxa de entrega geral
              </p>
            </div>
          </div>
        </div>
      </div>
    </GentelellaLayout>
  );
};

export default DashboardGentelella;