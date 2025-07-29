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
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'agenda', label: 'Agenda', icon: '📅' },
    { id: 'settings', label: 'Configurações', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 header-content">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center header-logo">
              <div className="flex-shrink-0">
                <img
                  className="h-6 w-auto sm:h-8"
                  src="/assets/logos/logo-royal.png"
                  alt="SPR - Sistema Preditivo Royal"
                />
              </div>
              <div className="ml-2 sm:ml-3">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  SPR
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Sistema Preditivo Royal
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-4 lg:space-x-8 header-nav">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`inline-flex items-center px-2 lg:px-3 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    currentPage === item.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1 lg:mr-2">{item.icon}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              ))}
            </nav>

                                    {/* License Status */}
                        <div className="flex items-center space-x-2 sm:space-x-4 header-actions">
                          <div className="hidden sm:block">
                            <ConnectivityStatus />
                          </div>
                          <div className="hidden sm:block">
                            <LicenseStatus showInHeader={true} />
                          </div>
                          
                          {/* User Menu */}
                          <div className="relative">
                            <button className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            </button>
                          </div>
                        </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-2 py-3 mobile-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`flex flex-col items-center justify-center px-2 py-3 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg mb-1 icon">{item.icon}</span>
                <span className="text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* License Warning Banner */}
      {!isActivated && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout; 