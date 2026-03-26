import React, { useState } from 'react';
import { relatoriosAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState('vendas');
  const [relatorioVendas, setRelatorioVendas] = useState(null);
  const [relatorioProducao, setRelatorioProducao] = useState(null);
  const [relatorioClientes, setRelatorioClientes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
  });

  const buscarRelatorioVendas = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.vendas(filtros.data_inicio, filtros.data_fim);
      setRelatorioVendas(response.data);
      toast.success('Relatório gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarRelatorioProducao = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.producao(filtros.data_inicio, filtros.data_fim);
      setRelatorioProducao(response.data);
      toast.success('Relatório gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarRelatorioClientes = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.clientes();
      setRelatorioClientes(response.data);
      toast.success('Relatório gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="relatorios-page">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Relatórios</h1>
        <p className="text-base font-sans text-[#705A4D]">Visualize relatórios e análises</p>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 border-b border-[#8B5A3C]/15">
          <button
            onClick={() => setActiveTab('vendas')}
            className={`px-6 py-3 font-sans font-medium transition-colors ${
              activeTab === 'vendas'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            Vendas
          </button>
          <button
            onClick={() => setActiveTab('producao')}
            className={`px-6 py-3 font-sans font-medium transition-colors ${
              activeTab === 'producao'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            Produção
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`px-6 py-3 font-sans font-medium transition-colors ${
              activeTab === 'clientes'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            Clientes
          </button>
        </div>
      </div>

      {activeTab === 'vendas' && (
        <div className="space-y-6">
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Início</label>
                <input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={buscarRelatorioVendas}
                  disabled={loading}
                  className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                >
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>

          {relatorioVendas && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total de Vendas</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{relatorioVendas.total_vendas}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Valor Total</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{formatCurrency(relatorioVendas.valor_total)}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Ticket Médio</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{formatCurrency(relatorioVendas.ticket_medio)}</p>
                </div>
              </div>

              <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Vendas por Dia</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={relatorioVendas.vendas_por_dia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                    <XAxis dataKey="data" tick={{ fill: '#705A4D', fontSize: 12 }} />
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
                    <Line type="monotone" dataKey="valor" stroke="#6B4423" strokeWidth={2} name="Valor" />
                    <Line type="monotone" dataKey="quantidade" stroke="#8B5A3C" strokeWidth={2} name="Quantidade" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'producao' && (
        <div className="space-y-6">
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Início</label>
                <input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={buscarRelatorioProducao}
                  disabled={loading}
                  className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                >
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>

          {relatorioProducao && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total Produções</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{relatorioProducao.total_producoes}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Concluídas</p>
                  <p className="text-3xl font-serif font-bold text-[#2F855A]">{relatorioProducao.concluidas}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Em Andamento</p>
                  <p className="text-3xl font-serif font-bold text-[#D97706]">{relatorioProducao.em_andamento}</p>
                </div>
              </div>

              <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Produção por Produto</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={relatorioProducao.por_produto}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                    <XAxis dataKey="produto" tick={{ fill: '#705A4D', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFDF8',
                        border: '1px solid #8B5A3C40',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#6B4423" name="Quantidade" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'clientes' && (
        <div className="space-y-6">
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
            <Button
              onClick={buscarRelatorioClientes}
              disabled={loading}
              className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
            >
              <MagnifyingGlass size={20} weight="bold" className="mr-2" />
              Gerar Relatório
            </Button>
          </div>

          {relatorioClientes && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total de Clientes</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{relatorioClientes.total_clientes}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Clientes Ativos</p>
                  <p className="text-3xl font-serif font-bold text-[#2F855A]">{relatorioClientes.clientes_ativos}</p>
                </div>
              </div>

              <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#8B5A3C]/15">
                  <h3 className="text-xl font-serif font-semibold text-[#3E2723]">Top 10 Clientes</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#E8D5C4]">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Cliente</th>
                        <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Total Compras</th>
                        <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioClientes.top_clientes.map((cliente, index) => (
                        <tr key={index} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                          <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{cliente.cliente_nome}</td>
                          <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">{cliente.total_compras}</td>
                          <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">
                            {formatCurrency(cliente.valor_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
