import React, { useState, useEffect } from 'react';
import DashboardMetrics from '../components/Dashboard/DashboardMetrics';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalMessages: 1247,
    totalContacts: 89,
    activeChats: 12,
    messagesPerDay: 156,
    responseTime: 8, // em minutos
    deliveryRate: 98.5,
    readRate: 87.3
  });

  const [commodityPrices] = useState([
    { name: 'Soja', price: 127.50, change: 2.3, trend: 'up' },
    { name: 'Milho', price: 65.80, change: -1.2, trend: 'down' },
    { name: 'Café', price: 890.00, change: 4.7, trend: 'up' },
    { name: 'Algodão', price: 156.30, change: 0.8, trend: 'up' },
    { name: 'Boi', price: 298.50, change: -0.5, trend: 'down' }
  ]);

  // Dados para gráfico de mensagens
  const messageChartData = {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Mensagens Enviadas',
        data: [120, 150, 180, 140, 200, 90, 110],
        borderColor: '#25d366',
        backgroundColor: 'rgba(37, 211, 102, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Mensagens Recebidas',
        data: [80, 100, 120, 95, 140, 60, 75],
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.4,
      }
    ]
  };

  // Dados para gráfico de commodities
  const commodityChartData = {
    labels: commodityPrices.map(item => item.name),
    datasets: [
      {
        label: 'Preço Atual (R$)',
        data: commodityPrices.map(item => item.price),
        backgroundColor: [
          '#22c55e',
          '#ef4444',
          '#f59e0b',
          '#8b5cf6',
          '#06b6d4'
        ],
        borderColor: [
          '#16a34a',
          '#dc2626',
          '#d97706',
          '#7c3aed',
          '#0891b2'
        ],
        borderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const refreshData = () => {
    // Simular atualização de dados
    setMetrics(prev => ({
      ...prev,
      totalMessages: prev.totalMessages + Math.floor(Math.random() * 10),
      activeChats: Math.floor(Math.random() * 20) + 5,
    }));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard SPR 1.1</h1>
            <p className="text-gray-600">
              Sistema de Precificação Rural - Visão Geral
            </p>
          </div>
          <button
            onClick={refreshData}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="mb-8">
        <DashboardMetrics metrics={metrics} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gráfico de Mensagens */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Atividade de Mensagens
            </h3>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64">
            <Line data={messageChartData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico de Commodities */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Preços das Commodities
            </h3>
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
          </div>
          <div className="h-64">
            <Bar data={commodityChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Tabela de Commodities */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Preços em Tempo Real
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commodity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Atual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tendência
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commodityPrices.map((commodity, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {commodity.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      R$ {commodity.price.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      commodity.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {commodity.trend === 'up' ? '+' : ''}{commodity.change}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {commodity.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas Recentes */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Alertas Recentes
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Soja:</strong> Preço subiu 2.3% nas últimas 24h
                </p>
                <p className="text-xs text-yellow-600">Há 2 horas</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  <strong>WhatsApp:</strong> 15 novas mensagens recebidas
                </p>
                <p className="text-xs text-green-600">Há 5 minutos</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>Sistema:</strong> Backup automático concluído
                </p>
                <p className="text-xs text-blue-600">Há 1 hora</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 