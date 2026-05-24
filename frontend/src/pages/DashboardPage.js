import React, { useEffect, useState } from 'react';
import { dashboardAPI, vendasAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import {
  Users,
  Package,
  ShoppingCart,
  TrendUp,
  ChartLine,
  Factory,
} from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalPendente, setTotalPendente] = useState(0);
  const [numDevedores, setNumDevedores] = useState(0);
  const [vendasVencidas, setVendasVencidas] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.stats();
      setStats(response.data);
      try {
        const devRes = await vendasAPI.resumoDevedores();
        const total = devRes.data.reduce((acc, d) => acc + d.total_pendente, 0);
        setTotalPendente(total);
        setNumDevedores(devRes.data.length);
      } catch (e) {}
      try {
        const vendasRes = await vendasAPI.listar();
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        const vencidas = vendasRes.data.filter(v =>
          v.status_pagamento === 'pendente' &&
          v.status_venda !== 'cancelada' &&
          v.data_previsao_pagamento &&
          new Date(v.data_previsao_pagamento) < hoje
        );
        setVendasVencidas(vencidas);
      } catch (e) {}
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6B4423] font-sans">Carregando...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Clientes',
      value: stats?.total_clientes || 0,
      icon: Users,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Produtos Cadastrados',
      value: stats?.total_produtos || 0,
      icon: Package,
      color: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'Pedidos Pendentes',
      value: stats?.pedidos_pendentes || 0,
      icon: ShoppingCart,
      color: 'bg-[#FEFCBF] text-[#D97706]',
    },
    {
      title: 'Em Produção',
      value: stats?.pedidos_em_producao || 0,
      icon: Factory,
      color: 'bg-orange-100 text-orange-700',
    },
  ];

  return (
    <div data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">
          Dashboard
        </h1>
        <p className="text-base font-sans text-[#705A4D]">
          Visão geral do sistema Sussu Chocolates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              data-testid={`stat-card-${index}`}
              className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon size={24} weight="bold" />
                </div>
              </div>
              <h3 className="text-sm font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-1">
                {card.title}
              </h3>
              <p className="text-3xl font-serif font-bold text-[#3E2723]">{card.value}</p>
            </div>
          );
        })}
      </div>

      {totalPendente > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans uppercase tracking-wider font-semibold text-orange-600 mb-1">Total A Receber</p>
            <p className="text-3xl font-serif font-bold text-orange-700">{formatCurrency(totalPendente)}</p>
            <p className="text-sm text-orange-600 mt-1">{numDevedores} cliente(s) com saldo pendente</p>
          </div>
          <div className="p-4 rounded-xl bg-orange-100 text-orange-600 text-4xl">💰</div>
        </div>
      )}

      {vendasVencidas.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans uppercase tracking-wider font-semibold text-red-600 mb-1">Pagamentos Vencidos</p>
            <p className="text-3xl font-serif font-bold text-red-700">{vendasVencidas.length} venda(s)</p>
            <p className="text-sm text-red-600 mt-1">Com prazo de pagamento ultrapassado</p>
          </div>
          <div className="p-4 rounded-xl bg-red-100 text-red-600 text-4xl">⚠️</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm"
          data-testid="vendas-mes-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-[#C6F6D5] text-[#2F855A]">
              <TrendUp size={24} weight="bold" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-medium text-[#6B4423]">Vendas do Mês</h3>
              <p className="text-sm text-[#705A4D] font-sans">
                {stats?.vendas_mes || 0} vendas realizadas
              </p>
            </div>
          </div>
          <p className="text-4xl font-serif font-bold text-[#3E2723]">
            {formatCurrency(stats?.valor_vendas_mes || 0)}
          </p>
        </div>

        <div
          className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm"
          data-testid="vendas-hoje-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
              <ChartLine size={24} weight="bold" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-medium text-[#6B4423]">Vendas Hoje</h3>
              <p className="text-sm text-[#705A4D] font-sans">
                {stats?.vendas_hoje || 0} vendas realizadas
              </p>
            </div>
          </div>
          <p className="text-4xl font-serif font-bold text-[#3E2723]">
            {formatCurrency(stats?.valor_vendas_hoje || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
