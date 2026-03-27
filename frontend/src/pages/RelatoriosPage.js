import React, { useState, useEffect } from 'react';
import { relatoriosAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { MagnifyingGlass, Factory, Package, Users, ShoppingCart, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6B4423', '#8B5A3C', '#A67C5B', '#C4A77D', '#D4B896', '#E8D5C4'];

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState('a-produzir');
  const [relatorioVendas, setRelatorioVendas] = useState(null);
  const [relatorioProducao, setRelatorioProducao] = useState(null);
  const [relatorioClientes, setRelatorioClientes] = useState(null);
  const [producaoPendente, setProducaoPendente] = useState(null);
  const [producaoConcluida, setProducaoConcluida] = useState(null);
  const [pedidosResumo, setPedidosResumo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
  });

  // Carregar relatórios de produção automaticamente
  useEffect(() => {
    if (activeTab === 'a-produzir') {
      buscarProducaoPendente();
    } else if (activeTab === 'produzidos') {
      buscarProducaoConcluida();
    } else if (activeTab === 'pedidos-resumo') {
      buscarPedidosResumo();
    }
  }, [activeTab]);

  const buscarProducaoPendente = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.producaoPendente();
      setProducaoPendente(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarProducaoConcluida = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.producaoConcluida(filtros.data_inicio, filtros.data_fim);
      setProducaoConcluida(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarPedidosResumo = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.pedidosResumo();
      setPedidosResumo(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

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

  const tabs = [
    { id: 'a-produzir', label: 'Itens a Produzir', icon: Factory },
    { id: 'produzidos', label: 'Itens Produzidos', icon: CheckCircle },
    { id: 'pedidos-resumo', label: 'Resumo Pedidos', icon: ShoppingCart },
    { id: 'vendas', label: 'Vendas', icon: Package },
    { id: 'producao', label: 'Produção Geral', icon: Factory },
    { id: 'clientes', label: 'Clientes', icon: Users },
  ];

  return (
    <div data-testid="relatorios-page">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Relatórios</h1>
        <p className="text-base font-sans text-[#705A4D]">Visualize relatórios e análises de produção</p>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-1 border-b border-[#8B5A3C]/15">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-sans font-medium transition-colors text-sm ${
                activeTab === tab.id
                  ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                  : 'text-[#705A4D] hover:text-[#6B4423]'
              }`}
            >
              <tab.icon size={18} weight={activeTab === tab.id ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: ITENS A PRODUZIR */}
      {activeTab === 'a-produzir' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif font-semibold text-[#3E2723]">Itens Pendentes de Produção</h2>
            <Button onClick={buscarProducaoPendente} disabled={loading} variant="outline" className="text-[#6B4423] border-[#6B4423]">
              <MagnifyingGlass size={18} className="mr-2" />
              Atualizar
            </Button>
          </div>

          {producaoPendente && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Tipos de Produtos</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{producaoPendente.total_itens}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total de Unidades</p>
                  <p className="text-3xl font-serif font-bold text-[#D97706]">{producaoPendente.quantidade_total_unidades}</p>
                </div>
              </div>

              {producaoPendente.itens?.length > 0 && (
                <>
                  <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Quantidade por Produto</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={producaoPendente.itens.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                        <XAxis type="number" tick={{ fill: '#705A4D', fontSize: 12 }} />
                        <YAxis type="category" dataKey="produto_nome" tick={{ fill: '#705A4D', fontSize: 11 }} width={150} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFDF8',
                            border: '1px solid #8B5A3C40',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="quantidade_total" fill="#D97706" name="Quantidade" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#8B5A3C]/15 bg-[#E8D5C4]">
                      <h3 className="text-xl font-serif font-semibold text-[#3E2723]">Lista Detalhada de Produção</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#F5E6D3]">
                          <tr>
                            <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                            <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Qtd Total</th>
                            <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Detalhes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {producaoPendente.itens.map((item, index) => (
                            <tr key={index} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                              <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{item.produto_nome}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-[#D97706]/20 text-[#D97706] px-3 py-1 rounded-full text-sm font-bold">
                                  {item.quantidade_total}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-[#705A4D]">
                                {item.pedidos?.map((p, i) => (
                                  <span key={i} className="inline-block bg-[#8B5A3C]/10 px-2 py-1 rounded mr-1 mb-1">
                                    {p.pedido_numero}: {p.quantidade} ({p.cliente_nome})
                                  </span>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {producaoPendente.itens?.length === 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-12 text-center">
                  <CheckCircle size={64} className="mx-auto mb-4 text-[#2F855A]" weight="fill" />
                  <p className="text-xl font-serif text-[#3E2723]">Nenhum item pendente de produção!</p>
                  <p className="text-[#705A4D] mt-2">Todas as produções estão em dia.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: ITENS PRODUZIDOS */}
      {activeTab === 'produzidos' && (
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
                <Button onClick={buscarProducaoConcluida} disabled={loading} className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>

          {producaoConcluida && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Tipos de Produtos</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{producaoConcluida.total_tipos_produto}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total Produzido</p>
                  <p className="text-3xl font-serif font-bold text-[#2F855A]">{producaoConcluida.quantidade_total_produzida}</p>
                </div>
              </div>

              {producaoConcluida.itens?.length > 0 && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                      <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Produção por Produto</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={producaoConcluida.itens.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                          <XAxis dataKey="produto_nome" tick={{ fill: '#705A4D', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFDF8',
                              border: '1px solid #8B5A3C40',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="quantidade_total" fill="#2F855A" name="Quantidade" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                      <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Distribuição</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={producaoConcluida.itens.slice(0, 6)}
                            dataKey="quantidade_total"
                            nameKey="produto_nome"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ produto_nome, percent }) => `${produto_nome?.substring(0, 15)} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {producaoConcluida.itens.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} unidades`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#8B5A3C]/15 bg-[#E8D5C4]">
                      <h3 className="text-xl font-serif font-semibold text-[#3E2723]">Lista de Produção Concluída</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#F5E6D3]">
                          <tr>
                            <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                            <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Qtd Produzida</th>
                            <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Nº Produções</th>
                          </tr>
                        </thead>
                        <tbody>
                          {producaoConcluida.itens.map((item, index) => (
                            <tr key={index} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                              <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{item.produto_nome}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-[#2F855A]/20 text-[#2F855A] px-3 py-1 rounded-full text-sm font-bold">
                                  {item.quantidade_total}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center text-sm text-[#705A4D]">{item.producoes_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {producaoConcluida.itens?.length === 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-12 text-center">
                  <Factory size={64} className="mx-auto mb-4 text-[#8B5A3C]" />
                  <p className="text-xl font-serif text-[#3E2723]">Nenhuma produção concluída no período</p>
                  <p className="text-[#705A4D] mt-2">Ajuste os filtros de data para ver resultados.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: RESUMO PEDIDOS */}
      {activeTab === 'pedidos-resumo' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif font-semibold text-[#3E2723]">Resumo de Itens dos Pedidos Ativos</h2>
            <Button onClick={buscarPedidosResumo} disabled={loading} variant="outline" className="text-[#6B4423] border-[#6B4423]">
              <MagnifyingGlass size={18} className="mr-2" />
              Atualizar
            </Button>
          </div>

          {pedidosResumo && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Tipos de Produtos</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{pedidosResumo.total_tipos_produto}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Unidades Totais</p>
                  <p className="text-3xl font-serif font-bold text-[#D97706]">{pedidosResumo.quantidade_total}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Valor Total</p>
                  <p className="text-3xl font-serif font-bold text-[#6B4423]">{formatCurrency(pedidosResumo.valor_total)}</p>
                </div>
              </div>

              {pedidosResumo.itens?.length > 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#8B5A3C]/15 bg-[#E8D5C4]">
                    <h3 className="text-xl font-serif font-semibold text-[#3E2723]">Itens dos Pedidos (Pendentes + Em Produção)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#F5E6D3]">
                        <tr>
                          <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                          <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Qtd Total</th>
                          <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Nº Pedidos</th>
                          <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidosResumo.itens.map((item, index) => (
                          <tr key={index} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                            <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{item.produto_nome}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-[#6B4423]/20 text-[#6B4423] px-3 py-1 rounded-full text-sm font-bold">
                                {item.quantidade_total}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-[#705A4D]">{item.pedidos_count}</td>
                            <td className="px-6 py-4 text-right text-sm text-[#4A3B32] font-medium">{formatCurrency(item.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: VENDAS */}
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
                <Button onClick={buscarRelatorioVendas} disabled={loading} className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
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

              {relatorioVendas.vendas_por_dia?.length > 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Vendas por Dia</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={relatorioVendas.vendas_por_dia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                      <XAxis dataKey="data" tick={{ fill: '#705A4D', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFDF8', border: '1px solid #8B5A3C40', borderRadius: '8px' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="valor" stroke="#6B4423" strokeWidth={2} name="Valor" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: PRODUÇÃO GERAL */}
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
                <Button onClick={buscarRelatorioProducao} disabled={loading} className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
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

              {relatorioProducao.por_produto?.length > 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Produção por Produto</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={relatorioProducao.por_produto}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                      <XAxis dataKey="produto" tick={{ fill: '#705A4D', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFDF8', border: '1px solid #8B5A3C40', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#6B4423" name="Quantidade" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: CLIENTES */}
      {activeTab === 'clientes' && (
        <div className="space-y-6">
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
            <Button onClick={buscarRelatorioClientes} disabled={loading} className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
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

              {relatorioClientes.top_clientes?.length > 0 && (
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
                            <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">{formatCurrency(cliente.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
