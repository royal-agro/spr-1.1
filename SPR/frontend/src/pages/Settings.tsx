import React, { useState } from 'react';
import LicenseStatus from '../components/License/LicenseStatus';
import { useLicenseInfo } from '../store/useLicenseStore';

const Settings: React.FC = () => {
  const { isActivated } = useLicenseInfo();
  const [activeTab, setActiveTab] = useState<'license' | 'general' | 'notifications'>('license');

  const tabs = [
    { id: 'license', label: 'Licença', icon: '🔐' },
    { id: 'general', label: 'Geral', icon: '⚙️' },
    { id: 'notifications', label: 'Notificações', icon: '🔔' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie suas preferências e configurações do sistema
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'license' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Gerenciamento de Licença
              </h2>
              <LicenseStatus showFullDetails={true} />
            </div>
          )}

          {activeTab === 'general' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Configurações Gerais
              </h2>
              
              <div className="space-y-6">
                {/* Tema */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tema
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Claro</option>
                    <option>Escuro</option>
                    <option>Automático</option>
                  </select>
                </div>

                {/* Idioma */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Português (Brasil)</option>
                    <option>English</option>
                    <option>Español</option>
                  </select>
                </div>

                {/* Formato de Data */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato de Data
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>

                {/* Moeda */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Moeda
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Real (R$)</option>
                    <option>Dólar (US$)</option>
                    <option>Euro (€)</option>
                  </select>
                </div>

                {/* Auto-save */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autosave"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    defaultChecked
                  />
                  <label htmlFor="autosave" className="ml-2 block text-sm text-gray-700">
                    Salvar automaticamente as alterações
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notificações
              </h2>
              
              <div className="space-y-6">
                {/* Notificações Push */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Notificações Push
                      </h3>
                      <p className="text-sm text-gray-600">
                        Receber notificações no navegador
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Notificações de Som */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Som das Notificações
                      </h3>
                      <p className="text-sm text-gray-600">
                        Tocar som quando receber notificações
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Notificações de Email */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Notificações por Email
                      </h3>
                      <p className="text-sm text-gray-600">
                        Receber resumos diários por email
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Notificações WhatsApp */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Notificações WhatsApp
                      </h3>
                      <p className="text-sm text-gray-600">
                        Alertas para mensagens do WhatsApp
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Horário de Silêncio */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Horário de Silêncio
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Não receber notificações durante este período
                  </p>
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">De</label>
                      <input
                        type="time"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue="22:00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Até</label>
                      <input
                        type="time"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue="08:00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Versão 1.1.0 - SPR Sistema Preditivo Royal
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 