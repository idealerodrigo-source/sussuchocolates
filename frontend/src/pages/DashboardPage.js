import React, { useEffect, useState } from 'react';
import { dashboardAPI, estoqueAPI, clientesAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  ShoppingCart,
  TrendUp,
  ChartLine,
  Factory,
  Plus,
  Receipt,
  CalendarBlank,
  ArrowRight,
  Cake,
} from '@phosphor-icons/react';
import { toast } from 'sonner';

function SkeletonCard() {
  return (
    <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#F5E6D3]" />
      </div>
      <div className="h-3 w-24 rounded bg-[#F5E6D3] mb-3" />
      <div className="h-8 w-16 rounded bg-[#F5E6D3]" />
    </div>
  );
}

function SkeletonWide() {
  return (
    <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#F5E6D3]" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-[#F5E6D3]" />
          <div className="h-3 w-20 rounded bg-[#F5E6D3]" />
        </div>
      </div>
      <div className="h-10 w-40 rounded bg-[#F5E6D3]" />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alertasEstoque, setAlertasEstoque] = useState(null);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [statsRes, alertasRes, anivRes] = await Promise.all([
        dashboardAPI.stats(),
        estoqueAPI.alertas(),
        clientesAPI.aniversariantes(7),
      ]);
      setStats(statsRes.data);
      setAlertasEstoque(alertasRes.data);
      setAniversariantes(anivRes.data || []);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">
            Dashboard
          </h1>
          <p className="text-base font-sans text-[#705A4D]">
            Visão geral do sistema Sussu Chocolates
          </p>
        </div>

        {/* Atalhos rápidos */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/vendas', { state: { openNovaVenda: true } })}
            className="flex items-center gap-2 px-5 py-3 bg-[#6B4423] text-[#F5E6D3] rounded-xl font-semibold text-sm hover:bg-[#8B5A3C] transition-colors shadow-sm"
          >
            <Plus size={18} weight="bold" />
            Nova Venda
          </button>
          <button
            onClick={() => navigate('/pedidos', { state: { openNovoPedido: true } })}
            className="flex items-center gap-2 px-5 py-3 bg-[#FFFDF8] border border-[#8B5A3C]/30 text-[#6B4423] rounded-xl font-semibold text-sm hover:bg-[#F5E6D3] transition-colors shadow-sm"
          >
            <ShoppingCart size={18} weight="bold" />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* Atalhos de navegação rápida */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Vendas', icon: Receipt, path: '/vendas', cor: 'text-purple-600 bg-purple-50 border-purple-200' },
          { label: 'Pedidos', icon: ShoppingCart, path: '/pedidos', cor: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Calendário', icon: CalendarBlank, path: '/calendario', cor: 'text-green-600 bg-green-50 border-green-200' },
          { label: 'Relatórios', icon: ChartLine, path: '/relatorios', cor: 'text-[#6B4423] bg-[#F5E6D3]/60 border-[#8B5A3C]/30' },
        ].map((atalho) => {
          const Icon = atalho.icon;
          return (
            <button
              key={atalho.path}
              onClick={() => navigate(atalho.path)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border font-medium text-sm transition-all hover:shadow-sm ${atalho.cor}`}
            >
              <div className="flex items-center gap-2">
                <Icon size={18} weight="bold" />
                <span>{atalho.label}</span>
              </div>
              <ArrowRight size={16} />
            </button>
          );
        })}
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card, index) => {
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

      {/* Alertas financeiros */}
      {loading ? (
        <div className="h-24 rounded-xl bg-[#F5E6D3]/50 animate-pulse mb-6" />
      ) : (
        <>
          {(stats?.total_pendente || 0) > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-sans uppercase tracking-wider font-semibold text-orange-600 mb-1">Total A Receber</p>
                <p className="text-3xl font-serif font-bold text-orange-700">{formatCurrency(stats.total_pendente)}</p>
                <p className="text-sm text-orange-600 mt-1">{stats.num_devedores} cliente(s) com saldo pendente</p>
              </div>
              <div className="p-4 rounded-xl bg-orange-100 text-orange-600 text-4xl">💰</div>
            </div>
          )}

          {(stats?.vendas_vencidas || 0) > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-sans uppercase tracking-wider font-semibold text-red-600 mb-1">Pagamentos Vencidos</p>
                <p className="text-3xl font-serif font-bold text-red-700">{stats.vendas_vencidas} venda(s)</p>
                <p className="text-sm text-red-600 mt-1">Com prazo de pagamento ultrapassado</p>
              </div>
              <div className="p-4 rounded-xl bg-red-100 text-red-600 text-4xl">⚠️</div>
            </div>
          )}

          {(alertasEstoque?.criticos || 0) > 0 && (
            <div className="bg-orange-50 border border-orange-300 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-sans uppercase tracking-wider font-semibold text-orange-600 mb-1">Estoque Crítico</p>
                <p className="text-3xl font-serif font-bold text-orange-700">{alertasEstoque.criticos} produto(s) zerado(s)</p>
                {(alertasEstoque?.baixos || 0) > 0 && (
                  <p className="text-sm text-orange-600 mt-1">+ {alertasEstoque.baixos} produto(s) abaixo do mínimo</p>
                )}
              </div>
              <div className="p-4 rounded-xl bg-orange-100 text-orange-600 text-4xl">📦</div>
            </div>
          )}

          {aniversariantes.length > 0 && (
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-6 shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-pink-100 text-pink-600">
                  <Cake size={24} weight="bold" />
                </div>
                <div>
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-pink-600">
                    🎂 Aniversários nos próximos 7 dias
                  </p>
                  <p className="text-sm text-pink-700">{aniversariantes.length} cliente(s)</p>
                </div>
              </div>
              <div className="space-y-2">
                {aniversariantes.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/60 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{a.hoje ? '🎉' : '🎂'}</span>
                      <div>
                        <p className="font-medium text-sm text-[#3E2723]">{a.nome}</p>
                        <p className="text-xs text-pink-600">
                          {a.hoje ? 'Hoje!' : `Em ${a.dias_faltam} dia(s)`} — {a.idade} anos
                        </p>
                      </div>
                    </div>
                    {a.telefone && (
                      <a
                        href={`https://wa.me/55${a.telefone.replace(/\D/g,'')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors font-medium"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Cards de vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <SkeletonWide />
            <SkeletonWide />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Top 5 produtos do mês */}
      {!loading && (stats?.top_produtos_mes || []).length > 0 && (
        <div className="mt-6 bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-4">
            🏆 Mais Vendidos este Mês
          </h3>
          <div className="space-y-3">
            {stats.top_produtos_mes.map((p, i) => {
              const max = stats.top_produtos_mes[0]?.total || 1;
              const pct = Math.round((p.total / max) * 100);
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold w-6 text-center">{medals[i] || `${i + 1}º`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-[#3E2723] truncate">{p.nome}</span>
                      <span className="text-sm font-bold text-[#6B4423] ml-2 flex-shrink-0">
                        {Number.isInteger(p.total) ? p.total : p.total.toFixed(1)}x
                      </span>
                    </div>
                    <div className="h-2 bg-[#F5E6D3] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6B4423] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
