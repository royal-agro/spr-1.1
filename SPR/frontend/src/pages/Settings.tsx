import React, { useState } from 'react';
import { 
  CogIcon, 
  BellIcon, 
  UserIcon, 
  ShieldCheckIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface SettingsState {
  theme: string;
  notifications: {
    whatsapp: boolean;
    priceAlerts: boolean;
    systemUpdates: boolean;
  };
  whatsapp: {
    autoReply: boolean;
    autoReplyMessage: string;
    businessHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  profile: {
    name: string;
    email: string;
    phone: string;
  };
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    theme: 'light',
    notifications: {
      whatsapp: true,
      priceAlerts: true,
      systemUpdates: true,
    },
    whatsapp: {
      autoReply: false,
      autoReplyMessage: 'Obrigado pela mensagem! Responderemos em breve.',
      businessHours: {
        enabled: false,
        start: '09:00',
        end: '18:00',
      },
    },
    profile: {
      name: 'Administrador',
      email: 'admin@royal-agro.com',
      phone: '+55 11 99999-0000',
    },
  });

  const handleSettingChange = (section: keyof SettingsState, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as { [key: string]: any }),
        [key]: value,
      },
    }));
  };

  const handleNestedSettingChange = (
    section: keyof SettingsState,
    subsection: string,
    key: string,
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as { [key: string]: any }),
        [subsection]: {
          ...((prev[section] as { [key: string]: any })[subsection] as { [key: string]: any }),
          [key]: value,
        },
      },
    }));
  };

  const handleSave = () => {
    // Simular salvamento
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      <div className="space-y-6">
        {/* Perfil */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Perfil</h3>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={settings.profile.name}
                  onChange={(e) => handleSettingChange('profile', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={settings.profile.phone}
                onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tema */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <MoonIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Aparência</h3>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={settings.theme === 'light'}
                  onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <SunIcon className="h-5 w-5 text-yellow-500 ml-2 mr-1" />
                <span className="text-sm text-gray-700">Claro</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={settings.theme === 'dark'}
                  onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <MoonIcon className="h-5 w-5 text-gray-700 ml-2 mr-1" />
                <span className="text-sm text-gray-700">Escuro</span>
              </label>
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Notificações</h3>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">WhatsApp</h4>
                <p className="text-sm text-gray-500">Receber notificações de mensagens</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.whatsapp}
                  onChange={(e) => handleSettingChange('notifications', 'whatsapp', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Alertas de Preços</h4>
                <p className="text-sm text-gray-500">Notificações sobre mudanças de preços</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.priceAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'priceAlerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Atualizações do Sistema</h4>
                <p className="text-sm text-gray-500">Notificações sobre atualizações</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.systemUpdates}
                  onChange={(e) => handleSettingChange('notifications', 'systemUpdates', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-whatsapp-500 rounded mr-2"></div>
              <h3 className="text-lg font-medium text-gray-900">WhatsApp Business</h3>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Resposta Automática</h4>
                <p className="text-sm text-gray-500">Enviar mensagem automática para novos contatos</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.whatsapp.autoReply}
                  onChange={(e) => handleSettingChange('whatsapp', 'autoReply', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-whatsapp-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-whatsapp-600"></div>
              </label>
            </div>

            {settings.whatsapp.autoReply && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem Automática
                </label>
                <textarea
                  value={settings.whatsapp.autoReplyMessage}
                  onChange={(e) => handleSettingChange('whatsapp', 'autoReplyMessage', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-whatsapp-500 focus:border-transparent"
                  placeholder="Digite sua mensagem automática..."
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Horário Comercial</h4>
                <p className="text-sm text-gray-500">Definir horário de funcionamento</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.whatsapp.businessHours.enabled}
                  onChange={(e) => handleNestedSettingChange('whatsapp', 'businessHours', 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-whatsapp-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-whatsapp-600"></div>
              </label>
            </div>

            {settings.whatsapp.businessHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Início
                  </label>
                  <input
                    type="time"
                    value={settings.whatsapp.businessHours.start}
                    onChange={(e) => handleNestedSettingChange('whatsapp', 'businessHours', 'start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-whatsapp-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fim
                  </label>
                  <input
                    type="time"
                    value={settings.whatsapp.businessHours.end}
                    onChange={(e) => handleNestedSettingChange('whatsapp', 'businessHours', 'end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-whatsapp-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 