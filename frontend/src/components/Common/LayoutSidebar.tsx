import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useLicenseInfo } from '../../store/useLicenseStore';
import LicenseStatus from '../License/LicenseStatus';
import ConnectivityStatus from './ConnectivityStatus';

interface LayoutSidebarProps {
  children: React.ReactNode;
}

const LayoutSidebar: React.FC<LayoutSidebarProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentPage, setCurrentPage } = useAppStore();
  const { isActivated } = useLicenseInfo();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  // Mapeamento entre rotas e IDs de página
  const routeToPageMap: { [key: string]: string } = {
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/agenda': 'agenda',
    '/whatsapp': 'whatsapp',
    '/whatsapp/reports': 'whatsapp',
    '/ofertas': 'ofertas',
    '/broadcast': 'broadcast',
    '/settings': 'settings'
  };

  // Mapeamento entre IDs de página e rotas
  const pageToRouteMap: { [key: string]: string } = {
    'dashboard': '/',
    'agenda': '/agenda',
    'whatsapp': '/whatsapp',
    'ofertas': '/ofertas',
    'broadcast': '/broadcast',
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
    setIsMobileSidebarOpen(false); // Close mobile sidebar on navigation
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', route: '/' },
    { id: 'agenda', label: 'Agenda', icon: '📅', route: '/agenda' },
    { id: 'ofertas', label: 'Ofertas', icon: '🎯', route: '/ofertas' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬', route: '/whatsapp' },
    { id: 'broadcast', label: 'Broadcast', icon: '📢', route: '/broadcast' }
  ];

  const utilityItems = [
    { id: 'settings', label: 'Configurações', icon: '⚙️', route: '/settings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-56 lg:w-60 bg-white shadow-lg border-r border-gray-200 flex flex-col hidden md:flex">
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <img
              className="h-4 sm:h-5 lg:h-6 w-auto max-w-[80px] sm:max-w-[90px] lg:max-w-[100px] object-contain"
              src="/assets/logos/logo-royal.png"
              alt="SPR - Sistema Preditivo Royal"
            />
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-900">SPR</h1>
              <p className="text-xs text-gray-500">Sistema Preditivo Royal</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Utility Items */}
          <div className="space-y-1">
            {utilityItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {/* Connectivity Status */}
          <div className="flex justify-center">
            <ConnectivityStatus />
          </div>
          
          {/* License Status */}
          <div className="flex justify-center">
            <LicenseStatus showInHeader={false} />
          </div>

          {/* User Profile */}
          <div className="flex items-center px-4 py-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-700">Usuário</p>
              <p className="text-xs text-gray-500">Royal Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <div className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300" 
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
          <div className={`relative w-80 max-w-xs bg-white shadow-lg border-r border-gray-200 flex flex-col transform transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Mobile Logo Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img
                    className="h-4 sm:h-5 w-auto max-w-[70px] sm:max-w-[80px] object-contain"
                    src="/assets/logos/logo-royal.png"
                    alt="SPR - Sistema Preditivo Royal"
                  />
                  <div className="ml-3">
                    <h1 className="text-lg font-bold text-gray-900">SPR</h1>
                    <p className="text-xs text-gray-500">Sistema Preditivo Royal</p>
                  </div>
                </div>
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700" 
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3 text-base">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200 my-6"></div>

              <div className="space-y-1">
                {utilityItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3 text-base">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Mobile Bottom Section */}
            <div className="p-4 border-t border-gray-200 space-y-3">
              <div className="flex justify-center">
                <ConnectivityStatus />
              </div>
              <div className="flex justify-center">
                <LicenseStatus showInHeader={false} />
              </div>
              <div className="flex items-center px-4 py-2 rounded-lg bg-gray-50">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">Usuário</p>
                  <p className="text-xs text-gray-500">Royal Admin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              {/* Mobile menu button */}
              <div className="flex items-center">
                <button 
                  className="md:hidden p-2 text-gray-500 hover:text-gray-700 mr-3"
                  onClick={toggleMobileSidebar}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Page Title */}
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    {menuItems.find(item => item.id === currentPage)?.label || 
                     utilityItems.find(item => item.id === currentPage)?.label || 
                     'Dashboard'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">
                    {new Date().toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* License Warning Banner */}
        {!isActivated && (
          <div className="bg-yellow-50 border-b border-yellow-200">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-yellow-800">
                    Sistema não ativado. Algumas funcionalidades podem estar limitadas.
                  </span>
                </div>
                <button
                  onClick={() => handleNavigation('settings')}
                  className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                >
                  Ativar Agora
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LayoutSidebar;