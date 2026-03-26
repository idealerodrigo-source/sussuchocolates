import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';
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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.stats();
      setStats(response.data);
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
                {stats?.vendas_mes?.quantidade || 0} vendas realizadas
              </p>
            </div>
          </div>
          <p className="text-4xl font-serif font-bold text-[#3E2723]">
            {formatCurrency(stats?.vendas_mes?.valor_total || 0)}
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
                {stats?.vendas_hoje?.quantidade || 0} vendas realizadas
              </p>
            </div>
          </div>
          <p className="text-4xl font-serif font-bold text-[#3E2723]">
            {formatCurrency(stats?.vendas_hoje?.valor_total || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
