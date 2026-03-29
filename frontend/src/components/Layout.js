import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEmpresa } from '../contexts/EmpresaContext';
import { PWAInstallPrompt, useOnlineStatus } from './PWAInstallPrompt';
import {
  House,
  Users,
  ShoppingCart,
  Package,
  Factory,
  Archive,
  ChartBar,
  Receipt,
  SignOut,
  List,
  Truck,
  Gear,
  WifiSlash,
} from '@phosphor-icons/react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { logo } = useEmpresa();
  const isOnline = useOnlineStatus();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: House },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/produtos', label: 'Produtos', icon: Package },
    { path: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
    { path: '/producao', label: 'Produção', icon: Factory },
    { path: '/embalagem', label: 'Embalagem', icon: Archive },
    { path: '/estoque', label: 'Estoque', icon: List },
    { path: '/vendas', label: 'Vendas', icon: Receipt },
    { path: '/compras', label: 'Compras', icon: Truck },
    { path: '/lucratividade', label: 'Lucratividade', icon: ChartBar },
    { path: '/relatorios', label: 'Relatórios', icon: ChartBar },
    { path: '/configuracoes', label: 'Configurações', icon: Gear },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-[#F5E6D3]">
      <aside
        className={`bg-[#3E2723] text-[#F5E6D3] border-r border-[#6B4423] flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-6 border-b border-[#6B4423]">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <img
                src={logo}
                alt="Sussu Chocolates"
                className="h-16 max-w-[180px] object-contain"
              />
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-sans transition-colors ${
                  active
                    ? 'bg-[#6B4423] text-[#F5E6D3]'
                    : 'text-[#E8D5C4] hover:bg-[#6B4423]/50'
                }`}
              >
                <Icon size={24} weight={active ? 'fill' : 'regular'} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#6B4423]">
          <div className="mb-3 px-4">
            {sidebarOpen && (
              <div>
                <p className="text-sm font-medium text-[#F5E6D3]">{user?.nome}</p>
                <p className="text-xs text-[#9A8476]">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            data-testid="btn-logout"
            className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-[#E8D5C4] hover:bg-[#6B4423]/50 font-sans transition-colors"
          >
            <SignOut size={24} />
            {sidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {/* Banner de offline */}
        {!isOnline && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
            <WifiSlash size={18} weight="bold" />
            Você está offline. Algumas funcionalidades podem estar indisponíveis.
          </div>
        )}
        
        <div className="sticky top-0 z-40 bg-[#F5E6D3]/80 backdrop-blur-xl border-b border-[#8B5A3C]/15 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#6B4423] hover:text-[#8B5A3C] transition-colors"
            >
              <List size={24} weight="bold" />
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-[#3E2723] font-sans">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
      
      {/* Banner de instalação PWA */}
      <PWAInstallPrompt />
    </div>
  );
}
