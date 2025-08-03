import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useLicenseInfo } from '../../store/useLicenseStore';
import LicenseStatus from '../License/LicenseStatus';
import ConnectivityStatus from './ConnectivityStatus';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentPage, setCurrentPage } = useAppStore();
  const { isActivated } = useLicenseInfo();

  // Mapeamento entre rotas e IDs de página
  const routeToPageMap: { [key: string]: string } = {
    '/': 'dashboard',
    '/whatsapp': 'whatsapp',
    '/whatsapp/reports': 'whatsapp',
    '/agenda': 'agenda',
    '/settings': 'settings'
  };

  // Mapeamento entre IDs de página e rotas
  const pageToRouteMap: { [key: string]: string } = {
    'dashboard': '/',
    'whatsapp': '/whatsapp',
    'agenda': '/agenda',
    'settings': '/settings'
  };

  // Sincronizar estado com a rota atual
  React.useEffect(() => {
    const currentRoute = location.pathname;
    const pageId = routeToPageMap[currentRoute] || 'dashboard';
    if (currentPage !== pageId) {
      setCurrentPage(pageId);
    }
  }, [location.pathname, currentPage, setCurrentPage]);

  const handleNavigation = (pageId: string) => {
    const route = pageToRouteMap[pageId];
    if (route && route !== location.pathname) {
      navigate(route);
    }
    setCurrentPage(pageId);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Visão geral do sistema' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬', description: 'Comunicação e broadcast' },
    { id: 'agenda', label: 'Agenda', icon: '📅', description: 'Eventos e reuniões' },
    { id: 'settings', label: 'Configurações', icon: '⚙️', description: 'Configurações do sistema' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-slate-900 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-6 bg-slate-800">
            <img
              className="h-8 w-auto"
              src="/assets/logos/logo-royal.png"
              alt="SPR - Sistema Preditivo Royal"
            />
            <div className="ml-3">
              <h1 className="text-xl font-bold text-white">SPR</h1>
              <p className="text-xs text-slate-300">Sistema Preditivo Royal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs mt-0.5 ${
                    currentPage === item.id ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>

          {/* Bottom Status */}
          <div className="flex-shrink-0 p-4 border-t border-slate-700">
            <div className="space-y-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                Status do Sistema
              </div>
              <ConnectivityStatus />
              <LicenseStatus showInHeader={true} />
              
              {/* User Profile */}
              <div className="flex items-center mt-4 p-2 bg-slate-800 rounded-lg">
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-white">Admin</div>
                  <div className="text-xs text-slate-400">Royal Negócios</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Mobile Logo */}
            <div className="flex items-center">
              <img
                className="h-6 w-auto"
                src="/assets/logos/logo-royal.png"
                alt="SPR"
              />
              <h1 className="ml-2 text-lg font-semibold text-gray-900">SPR</h1>
            </div>
            {/* Mobile Status */}
            <div className="flex items-center space-x-2">
              <ConnectivityStatus />
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-4 gap-1 px-4 py-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-base mb-1">{item.icon}</span>
                <span className="text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* License Warning Banner */}
        {!isActivated && (
          <div className="bg-yellow-50 border-b border-yellow-200 lg:fixed lg:top-0 lg:right-0 lg:left-64 lg:z-30">
            <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-xs sm:text-sm text-yellow-800">
                    Sistema não ativado. Algumas funcionalidades podem estar limitadas.
                  </span>
                </div>
                <button
                  onClick={() => handleNavigation('settings')}
                  className="text-xs sm:text-sm bg-yellow-600 text-white px-2 sm:px-3 py-1 rounded hover:bg-yellow-700 transition-colors self-start sm:self-auto"
                >
                  Ativar Agora
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className={`flex-1 ${!isActivated ? 'lg:pt-16' : ''} lg:pt-0 pt-20 lg:pt-0`}>
          <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 