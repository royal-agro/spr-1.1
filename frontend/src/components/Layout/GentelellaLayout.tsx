import React, { useState, useEffect } from 'react';
import { 
  HomeIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  BellIcon,
  UserIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import '../../styles/royal-theme.scss';

interface GentelellaLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
  children?: NavItem[];
}

const GentelellaLayout: React.FC<GentelellaLayoutProps> = ({ 
  children, 
  currentPage = 'dashboard' 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['dashboard']);
  const [notifications, setNotifications] = useState(3);

  const navigationItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: HomeIcon,
      path: '/'
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: ChatBubbleLeftRightIcon,
      path: '/whatsapp',
      badge: 5,
      children: [
        { id: 'chats', label: 'Conversas', icon: ChatBubbleLeftRightIcon, path: '/whatsapp/chats' },
        { id: 'contacts', label: 'Contatos', icon: UserGroupIcon, path: '/whatsapp/contacts' },
        { id: 'broadcast', label: 'Broadcast', icon: MegaphoneIcon, path: '/whatsapp/broadcast' }
      ]
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: CalendarDaysIcon,
      path: '/agenda',
      badge: 2
    },
    {
      id: 'analytics',
      label: 'Relatórios',
      icon: ChartBarIcon,
      path: '/analytics',
      children: [
        { id: 'dashboard-analytics', label: 'Dashboard', icon: ChartBarIcon, path: '/analytics/dashboard' },
        { id: 'messages', label: 'Mensagens', icon: ChatBubbleLeftRightIcon, path: '/analytics/messages' },
        { id: 'campaigns', label: 'Campanhas', icon: MegaphoneIcon, path: '/analytics/campaigns' }
      ]
    },
    {
      id: 'customers',
      label: 'Clientes',
      icon: UserGroupIcon,
      path: '/customers'
    },
    {
      id: 'campaigns',
      label: 'Campanhas',
      icon: MegaphoneIcon,
      path: '/campaigns'
    },
    {
      id: 'documents',
      label: 'Documentos',
      icon: DocumentTextIcon,
      path: '/documents'
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: CogIcon,
      path: '/settings',
      children: [
        { id: 'general', label: 'Geral', icon: CogIcon, path: '/settings/general' },
        { id: 'whatsapp-config', label: 'WhatsApp', icon: ChatBubbleLeftRightIcon, path: '/settings/whatsapp' },
        { id: 'users', label: 'Usuários', icon: UserGroupIcon, path: '/settings/users' }
      ]
    }
  ];

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = currentPage === item.id;

    return (
      <div key={item.id} className="nav-item-container">
        <div 
          className={`nav-item flex items-center justify-between cursor-pointer transition-all duration-200 px-4 py-3 ${
            level > 0 ? 'pl-8' : ''
          } ${isActive ? 'active bg-royal-primary-light text-white' : 'text-royal-gray-100 hover:bg-royal-primary-light hover:text-white'}`}
          onClick={() => hasChildren ? toggleMenu(item.id) : null}
        >
          <div className="flex items-center space-x-3">
            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-royal-gray-300'}`} />
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <span className="bg-royal-error text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                {item.badge}
              </span>
            )}
          </div>
          {hasChildren && (
            <ChevronDownIcon 
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'transform rotate-180' : ''
              }`} 
            />
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="submenu bg-royal-primary-dark">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-royal-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-royal-primary transition-all duration-300 flex flex-col shadow-royal-xl`}>
        {/* Logo Header */}
        <div className="p-4 border-b border-royal-primary-light">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-royal-primary font-bold text-lg">SPR</span>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-lg">Royal Negócios</h1>
                <p className="text-royal-gray-300 text-sm">Agrícolas</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <div className="py-4">
            {navigationItems.map(item => renderNavItem(item))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-royal-primary-light">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-royal-accent rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="text-white font-medium">Admin</p>
                <p className="text-royal-gray-300 text-sm">admin@royal.agr.br</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-royal-sm border-b border-royal-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-royal-gray-100 transition-colors"
              >
                <Bars3Icon className="w-6 h-6 text-royal-gray-600" />
              </button>
              
              <div className="hidden md:block">
                <h2 className="text-xl font-semibold text-royal-gray-900 capitalize">
                  {currentPage === 'dashboard' ? 'Dashboard Principal' : currentPage}
                </h2>
                <p className="text-sm text-royal-gray-500">
                  Sistema de Gestão Royal Negócios Agrícolas
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:flex items-center space-x-2 bg-royal-gray-100 rounded-lg px-3 py-2">
                <MagnifyingGlassIcon className="w-5 h-5 text-royal-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="bg-transparent border-none outline-none text-royal-gray-700 placeholder-royal-gray-400"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button className="p-2 rounded-lg hover:bg-royal-gray-100 transition-colors relative">
                  <BellIcon className="w-6 h-6 text-royal-gray-600" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-royal-error text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-royal-accent rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-royal-gray-900">Administrator</p>
                  <p className="text-xs text-royal-gray-500">Online</p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-royal-gray-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <nav className="flex items-center space-x-2 text-sm text-royal-gray-600">
              <span>Home</span>
              <span>/</span>
              <span className="text-royal-primary font-medium capitalize">{currentPage}</span>
            </nav>
          </div>

          {/* Content */}
          <div className="royal-fade-in">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-royal-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-royal-gray-500">
            <div>
              © 2025 Royal Negócios Agrícolas. Sistema SPR v2.0
            </div>
            <div className="flex items-center space-x-4">
              <span>Desenvolvido com</span>
              <span className="text-royal-error">♥</span>
              <span>by Claude & SPR Team</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default GentelellaLayout;