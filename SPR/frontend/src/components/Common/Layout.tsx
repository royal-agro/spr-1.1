import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useLicenseInfo } from '../../store/useLicenseStore';
import LicenseStatus from '../License/LicenseStatus';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isActivated } = useLicenseInfo();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬', path: '/whatsapp' },
    { id: 'agenda', label: 'Agenda', icon: '📅', path: '/agenda' },
    { id: 'settings', label: 'Configurações', icon: '⚙️', path: '/settings' }
  ];

  const isCurrentPath = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  className="h-8 w-auto"
                  src="/assets/logos/logo-royal.png"
                  alt="SPR - Sistema Preditivo Royal"
                />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">
                  SPR
                </h1>
                <p className="text-xs text-gray-500">
                  Sistema Preditivo Royal
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    isCurrentPath(item.path)
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* License Status */}
            <div className="flex items-center space-x-4">
              <LicenseStatus showInHeader={true} />
              
              {/* User Menu */}
              <div className="relative">
                <button className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="flex space-x-8 py-3 overflow-x-auto">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  isCurrentPath(item.path)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* License Warning Banner */}
      {!isActivated && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm text-yellow-800">
                  Sistema não ativado. Algumas funcionalidades podem estar limitadas.
                </span>
              </div>
              <Link
                to="/settings"
                className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
              >
                Ativar Agora
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout; 