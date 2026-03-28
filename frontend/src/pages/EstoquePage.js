import React, { useEffect, useState } from 'react';
import { estoqueAPI, produtosAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { Plus, TrendUp, TrendDown, ArrowsClockwise, MapPin } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useSortableTable, SortableHeader } from '../hooks/useSortableTable';

export default function EstoquePage() {
  const [movimentos, setMovimentos] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('saldo');
  const { sortedData: sortedSaldos, requestSort: requestSortSaldos, sortConfig: sortConfigSaldos } = useSortableTable(saldos, { key: 'produto_nome', direction: 'asc' });
  const { sortedData: sortedMovimentos, requestSort: requestSortMovimentos, sortConfig: sortConfigMovimentos } = useSortableTable(movimentos, { key: 'data_movimento', direction: 'desc' });
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: '',
    tipo_movimento: 'entrada',
    responsavel: '',
    observacoes: '',
    localizacao: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [movimentosRes, saldosRes, produtosRes] = await Promise.all([
        estoqueAPI.listar(),
        estoqueAPI.saldo(),
        produtosAPI.listar(),
      ]);
      setMovimentos(movimentosRes.data);
      setSaldos(saldosRes.data);
      setProdutos(produtosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        quantidade: parseFloat(formData.quantidade),
        localizacao: formData.localizacao || null,
      };
      await estoqueAPI.criar(data);
      toast.success('Movimento registrado com sucesso');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao registrar movimento');
    }
  };

  const resetForm = () => {
    setFormData({
      produto_id: '',
      quantidade: '',
      tipo_movimento: 'entrada',
      responsavel: '',
      observacoes: '',
      localizacao: '',
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  const getMovimentoIcon = (tipo) => {
    if (tipo === 'entrada') return <TrendUp size={20} className="text-[#2F855A]" weight="bold" />;
    if (tipo === 'saida') return <TrendDown size={20} className="text-[#C53030]" weight="bold" />;
    return <ArrowsClockwise size={20} className="text-[#D97706]" weight="bold" />;
  };

  return (
    <div data-testid="estoque-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Estoque</h1>
          <p className="text-base font-sans text-[#705A4D]">Gerencie o estoque de produtos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-movimento" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <Plus size={20} weight="bold" className="mr-2" />
              Novo Movimento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">Registrar Movimento de Estoque</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Produto *</label>
                  <select
                    required
                    value={formData.produto_id}
                    onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  >
                    <option value="">Selecione um produto...</option>
                    {produtos.map((produto) => (
                      <option key={produto.id} value={produto.id}>{produto.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Tipo de Movimento *</label>
                  <select
                    required
                    value={formData.tipo_movimento}
                    onChange={(e) => setFormData({ ...formData, tipo_movimento: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Quantidade *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Responsável</label>
                  <input
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Localização no Estoque</label>
                  <input
                    type="text"
                    placeholder="Ex: Prateleira A3, Corredor 2, Freezer 1..."
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  Registrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 border-b border-[#8B5A3C]/15">
          <button
            onClick={() => setActiveTab('saldo')}
            className={`px-6 py-3 font-sans font-medium transition-colors ${
              activeTab === 'saldo'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            Saldo Atual
          </button>
          <button
            onClick={() => setActiveTab('movimentos')}
            className={`px-6 py-3 font-sans font-medium transition-colors ${
              activeTab === 'movimentos'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            Movimentações
          </button>
        </div>
      </div>

      {activeTab === 'saldo' && (
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#E8D5C4]">
                <tr>
                  <SortableHeader label="Produto" sortKey="produto_nome" sortConfig={sortConfigSaldos} onSort={requestSortSaldos} className="text-left" />
                  <SortableHeader label="Localização" sortKey="localizacao" sortConfig={sortConfigSaldos} onSort={requestSortSaldos} className="text-left" />
                  <SortableHeader label="Quantidade em Estoque" sortKey="quantidade" sortConfig={sortConfigSaldos} onSort={requestSortSaldos} className="text-right" />
                </tr>
              </thead>
              <tbody>
                {sortedSaldos.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-12 text-[#705A4D] font-sans">
                      Nenhum produto em estoque
                    </td>
                  </tr>
                ) : (
                  sortedSaldos.map((saldo) => (
                    <tr key={saldo.produto_id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{saldo.produto_nome}</td>
                      <td className="px-6 py-4">
                        {saldo.localizacao ? (
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-[#6B4423]" />
                            <span className="text-sm text-[#4A3B32] font-sans">{saldo.localizacao}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-[#705A4D] font-sans italic">Não informada</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-sans font-bold ${
                          saldo.quantidade > 10 ? 'text-[#2F855A]' : saldo.quantidade > 0 ? 'text-[#D97706]' : 'text-[#C53030]'
                        }`}>
                          {saldo.quantidade.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movimentos' && (
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#E8D5C4]">
                <tr>
                  <SortableHeader label="Data" sortKey="data_movimento" sortConfig={sortConfigMovimentos} onSort={requestSortMovimentos} className="text-left" />
                  <SortableHeader label="Produto" sortKey="produto_nome" sortConfig={sortConfigMovimentos} onSort={requestSortMovimentos} className="text-left" />
                  <SortableHeader label="Tipo" sortKey="tipo_movimento" sortConfig={sortConfigMovimentos} onSort={requestSortMovimentos} className="text-left" />
                  <SortableHeader label="Quantidade" sortKey="quantidade" sortConfig={sortConfigMovimentos} onSort={requestSortMovimentos} className="text-right" />
                  <SortableHeader label="Localização" sortKey="localizacao" sortConfig={sortConfigMovimentos} onSort={requestSortMovimentos} className="text-left" />
                  <SortableHeader label="Responsável" sortKey="responsavel" sortConfig={sortConfigMovimentos} onSort={requestSortMovimentos} className="text-left" />
                  <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Observações</th>
                </tr>
              </thead>
              <tbody>
                {sortedMovimentos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#705A4D] font-sans">
                      Nenhuma movimentação registrada
                    </td>
                  </tr>
                ) : (
                  sortedMovimentos.map((mov) => (
                    <tr key={mov.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(mov.data_movimento)}</td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{mov.produto_nome}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getMovimentoIcon(mov.tipo_movimento)}
                          <span className="text-sm text-[#4A3B32] font-sans capitalize">{mov.tipo_movimento}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">
                        {mov.quantidade.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {mov.localizacao ? (
                          <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-[#6B4423]" />
                            <span className="text-sm text-[#4A3B32] font-sans">{mov.localizacao}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-[#705A4D] font-sans">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{mov.responsavel || '-'}</td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{mov.observacoes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}