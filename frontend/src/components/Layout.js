import React, { useState, useEffect } from 'react';
import { vendasAPI, estoqueAPI } from '../services/api';
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
  CalendarBlank,
  X,
} from '@phosphor-icons/react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [vendasVencidas, setVendasVencidas] = useState(0);
  const [alertasEstoque, setAlertasEstoque] = useState(0);

  // Detectar mobile e ajustar sidebar
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fechar sidebar ao navegar no mobile
  const location = useLocation();
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const carregar = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const [vendasRes, estoqueres] = await Promise.all([
          vendasAPI.listar(),
          estoqueAPI.alertas(),
        ]);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencidas = vendasRes.data.filter(v =>
          v.status_pagamento === 'pendente' &&
          v.status_venda !== 'cancelada' &&
          v.data_previsao_pagamento &&
          new Date(v.data_previsao_pagamento) < hoje
        );
        setVendasVencidas(vencidas.length);
        setAlertasEstoque(estoqueres.data?.criticos || 0);
      } catch (e) {}
    };
    carregar();
    const interval = setInterval(carregar, 60000);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { logo } = useEmpresa();
  const isOnline = useOnlineStatus();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: House },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/produtos', label: 'Produtos', icon: Package },
    { path: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
    { path: '/calendario', label: 'Calendário', icon: CalendarBlank },
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

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-[#6B4423] flex items-center justify-between">
        {logo && (
          <img src={logo} alt="Sussu Chocolates" className="h-14 max-w-[160px] object-contain" />
        )}
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="text-[#E8D5C4] hover:text-white p-1">
            <X size={22} weight="bold" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans transition-colors ${
                active ? 'bg-[#6B4423] text-[#F5E6D3]' : 'text-[#E8D5C4] hover:bg-[#6B4423]/50'
              }`}
            >
              <Icon size={22} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />
              <span className="font-medium text-sm truncate">{item.label}</span>
              {item.path === '/vendas' && vendasVencidas > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{vendasVencidas}</span>
              )}
              {item.path === '/estoque' && alertasEstoque > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{alertasEstoque}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#6B4423]">
        <div className="mb-2 px-3">
          <p className="text-sm font-medium text-[#F5E6D3] truncate">{user?.nome}</p>
          <p className="text-xs text-[#9A8476] truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          data-testid="btn-logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-[#E8D5C4] hover:bg-[#6B4423]/50 font-sans transition-colors"
        >
          <SignOut size={22} />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#F5E6D3]">

      {/* === MOBILE: overlay + drawer === */}
      {isMobile && (
        <>
          {/* Backdrop escurecido */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          {/* Drawer deslizante */}
          <aside
            className={`fixed top-0 left-0 h-full w-72 bg-[#3E2723] text-[#F5E6D3] flex flex-col z-50 transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* === DESKTOP: sidebar fixa === */}
      {!isMobile && (
        <aside
          className={`bg-[#3E2723] text-[#F5E6D3] border-r border-[#6B4423] flex flex-col transition-all duration-300 flex-shrink-0 ${
            sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
          }`}
        >
          {sidebarContent}
        </aside>
      )}

      {/* === Conteúdo principal === */}
      <main className="flex-1 overflow-auto min-w-0">
        {!isOnline && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
            <WifiSlash size={18} weight="bold" />
            Você está offline. Algumas funcionalidades podem estar indisponíveis.
          </div>
        )}

        <div className="sticky top-0 z-30 bg-[#F5E6D3]/90 backdrop-blur-xl border-b border-[#8B5A3C]/15 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#6B4423] hover:text-[#8B5A3C] transition-colors p-1"
            >
              <List size={24} weight="bold" />
            </button>
            <p className="text-xs font-medium text-[#705A4D] font-sans hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="text-xs font-medium text-[#705A4D] font-sans sm:hidden">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      <PWAInstallPrompt />
    </div>
  );
}
