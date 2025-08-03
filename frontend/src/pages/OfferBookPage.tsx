import React, { useState } from 'react';
import { OfferBookKPICards } from '../components/Common/KPICards';

const OfferBookPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'matches'>('overview');

  const mockData = {
    buyOffers: 23,
    sellOffers: 18,
    matches: 12,
    revenue: 250000
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <OfferBookKPICards
              buyOffers={mockData.buyOffers}
              sellOffers={mockData.sellOffers}
              matches={mockData.matches}
              revenue={mockData.revenue}
              loading={false}
            />
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Últimas Atividades</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Nova oferta BUY: Soja 500 ton - R$ 125,30/sc</span>
                  <span className="text-xs text-gray-500 ml-auto">há 5 min</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Match realizado: Milho 300 ton - R$ 63,50/sc</span>
                  <span className="text-xs text-gray-500 ml-auto">há 12 min</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Nova oferta SELL: Algodão 150 ton - R$ 145,00/@</span>
                  <span className="text-xs text-gray-500 ml-auto">há 18 min</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'offers':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Ofertas Ativas</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            BUY
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Soja</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">500 ton</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ 125,30/sc</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            SELL
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Milho</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">300 ton</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ 63,50/sc</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'matches':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Matches Realizados</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-green-900">Match #001</h4>
                        <p className="text-sm text-green-700">Soja - 200 ton @ R$ 125,00/sc</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-900">R$ 416.667</p>
                        <p className="text-xs text-green-600">Concluído</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-green-900">Match #002</h4>
                        <p className="text-sm text-green-700">Milho - 150 ton @ R$ 63,20/sc</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-900">R$ 158.000</p>
                        <p className="text-xs text-green-600">Concluído</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'overview', name: 'Visão Geral' },
    { id: 'offers', name: 'Ofertas' },
    { id: 'matches', name: 'Matches' }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <p className="text-gray-600">Sistema de negociação de commodities via WhatsApp</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 rounded-lg">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default OfferBookPage;