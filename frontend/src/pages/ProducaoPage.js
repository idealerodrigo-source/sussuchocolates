import React, { useEffect, useState } from 'react';
import { producaoAPI, pedidosAPI, produtosAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { Plus, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function ProducaoPage() {
  const [producoes, setProducoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    pedido_id: '',
    produto_id: '',
    quantidade: '',
    responsavel: '',
    observacoes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [producoesRes, pedidosRes, produtosRes] = await Promise.all([
        producaoAPI.listar(),
        pedidosAPI.listar(),
        produtosAPI.listar(),
      ]);
      setProducoes(producoesRes.data);
      
      const pedidosPendentes = pedidosRes.data.filter(
        (p) => p.status === 'pendente' || p.status === 'em_producao'
      );
      setPedidos(pedidosPendentes);
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
      };
      await producaoAPI.criar(data);
      toast.success('Produção iniciada com sucesso');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao iniciar produção');
    }
  };

  const handleConcluir = async (producaoId) => {
    try {
      await producaoAPI.concluir(producaoId);
      toast.success('Produção concluída');
      fetchData();
    } catch (error) {
      toast.error('Erro ao concluir produção');
    }
  };

  const resetForm = () => {
    setFormData({
      pedido_id: '',
      produto_id: '',
      quantidade: '',
      responsavel: '',
      observacoes: '',
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  return (
    <div data-testid="producao-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Produção</h1>
          <p className="text-base font-sans text-[#705A4D]">Controle a produção dos chocolates</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-producao" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <Plus size={20} weight="bold" className="mr-2" />
              Iniciar Produção
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">Iniciar Nova Produção</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Pedido *</label>
                  <select
                    required
                    value={formData.pedido_id}
                    onChange={(e) => setFormData({ ...formData, pedido_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  >
                    <option value="">Selecione um pedido...</option>
                    {pedidos.map((pedido) => (
                      <option key={pedido.id} value={pedido.id}>
                        {pedido.numero} - {pedido.cliente_nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
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
                <div className="md:col-span-2">
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
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  Iniciar Produção
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#E8D5C4]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Pedido</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Início</th>\n                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Conclusão</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Quantidade</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Responsável</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {producoes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhuma produção registrada
                  </td>
                </tr>
              ) : (
                producoes.map((producao) => (
                  <tr key={producao.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{producao.pedido_numero}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{producao.produto_nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(producao.data_inicio)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                      {producao.data_conclusao ? formatDateTime(producao.data_conclusao) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">{producao.quantidade}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{producao.responsavel || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {!producao.data_conclusao && (
                        <Button
                          onClick={() => handleConcluir(producao.id)}
                          size="sm"
                          className="bg-[#2F855A] text-white hover:bg-[#276749] text-xs"
                        >
                          <CheckCircle size={16} weight="bold" className="mr-1" />
                          Concluir
                        </Button>
                      )}
                      {producao.data_conclusao && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">
                          Concluído
                        </span>
                      )}
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
