import React, { useEffect, useState } from 'react';
import { analiseAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { TrendUp, TrendDown, ChartBar, Package } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export default function LucratividadePage() {
  const [lucratividade, setLucratividade] = useState(null);
  const [desempenho, setDesempenho] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lucroResponse, desempenhoResponse] = await Promise.all([
        analiseAPI.lucratividade(),
        analiseAPI.desempenho(),
      ]);
      setLucratividade(lucroResponse.data);
      setDesempenho(desempenhoResponse.data);
    } catch (error) {
      toast.error('Erro ao carregar análise de lucratividade');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6B4423] font-sans">Carregando análise...</p>
      </div>
    );
  }

  const COLORS = ['#6B4423', '#8B5A3C', '#A67B5B', '#C4A57B', '#E8D5C4'];

  const topLucrativos = lucratividade?.top_5_mais_lucrativos || [];
  const topMargem = lucratividade?.top_5_maior_margem || [];
  const resumo = lucratividade?.resumo || {};

  return (
    <div data-testid="lucratividade-page">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">
          Análise de Lucratividade
        </h1>
        <p className="text-base font-sans text-[#705A4D]">
          Análise detalhada de rentabilidade e desempenho de produtos
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <ChartBar size={20} weight="bold" />
            </div>
            <h3 className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C]">
              Receita Total
            </h3>
          </div>
          <p className="text-2xl font-serif font-bold text-[#3E2723]">
            {formatCurrency(resumo.receita_total || 0)}
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
              <TrendDown size={20} weight="bold" />
            </div>
            <h3 className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C]">
              Custo Total
            </h3>
          </div>
          <p className="text-2xl font-serif font-bold text-[#3E2723]">
            {formatCurrency(resumo.custo_total || 0)}
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#C6F6D5] text-[#2F855A]">
              <TrendUp size={20} weight="bold" />
            </div>
            <h3 className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C]">
              Lucro Total
            </h3>
          </div>
          <p className="text-2xl font-serif font-bold text-[#3E2723]">
            {formatCurrency(resumo.lucro_total || 0)}
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <Package size={20} weight="bold" />
            </div>
            <h3 className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C]">
              Margem Geral
            </h3>
          </div>
          <p className="text-2xl font-serif font-bold text-[#3E2723]">
            {resumo.margem_geral?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top 5 Produtos Mais Lucrativos */}
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">
            Top 5 Produtos Mais Lucrativos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topLucrativos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
              <XAxis
                dataKey="produto_nome"
                tick={{ fill: '#705A4D', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFDF8',
                  border: '1px solid #8B5A3C40',
                  borderRadius: '8px',
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="lucro_total" fill="#6B4423" name="Lucro Total" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Produtos com Maior Margem */}
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">
            Top 5 Produtos com Maior Margem
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topMargem}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
              <XAxis
                dataKey="produto_nome"
                tick={{ fill: '#705A4D', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFDF8',
                  border: '1px solid #8B5A3C40',
                  borderRadius: '8px',
                }}
                formatter={(value) => `${value.toFixed(1)}%`}
              />
              <Legend />
              <Bar
                dataKey="margem_percentual"
                fill="#8B5A3C"
                name="Margem (%)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparação Custo vs Preço */}
      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm mb-8">
        <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">
          Comparação: Custo x Preço de Venda (Top 10)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topLucrativos.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
            <XAxis
              dataKey="produto_nome"
              tick={{ fill: '#705A4D', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFDF8',
                border: '1px solid #8B5A3C40',
                borderRadius: '8px',
              }}
              formatter={(value) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="custo_producao" fill="#D97706" name="Custo de Produção" radius={[8, 8, 0, 0]} />
            <Bar dataKey="preco_venda" fill="#2F855A" name="Preço de Venda" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#8B5A3C]/15">
          <h3 className="text-xl font-serif font-semibold text-[#3E2723]">
            Detalhamento por Produto
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#E8D5C4]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">
                  Produto
                </th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">
                  Categoria
                </th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">
                  Qtd. Vendida
                </th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">
                  Receita
                </th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">
                  Custo
                </th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">
                  Lucro
                </th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">
                  Margem
                </th>
              </tr>
            </thead>
            <tbody>
              {topLucrativos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhum dado de lucratividade disponível
                  </td>
                </tr>
              ) : (
                topLucrativos.map((produto, index) => (
                  <tr
                    key={index}
                    className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50"
                  >
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">
                      {produto.produto_nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                      {produto.categoria}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">
                      {produto.quantidade_vendida.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">
                      {formatCurrency(produto.receita_total)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">
                      {formatCurrency(produto.custo_total)}
                    </td>
                    <td className="px-6 py-4 text-sm font-sans text-right">
                      <span
                        className={`font-medium ${
                          produto.lucro_total > 0 ? 'text-[#2F855A]' : 'text-[#C53030]'
                        }`}
                      >
                        {formatCurrency(produto.lucro_total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-sans text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          produto.margem_percentual >= 50
                            ? 'bg-[#C6F6D5] text-[#2F855A]'
                            : produto.margem_percentual >= 30
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-[#FEFCBF] text-[#D97706]'
                        }`}
                      >
                        {produto.margem_percentual.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
