import React, { useEffect, useState } from 'react';
import { produtosAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { Plus, Pencil, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    preco: '',
    custo_producao: '',
    ncm_code: '18063210',
    unidade: 'UN',
  });

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const response = await produtosAPI.listar();
      setProdutos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        preco: parseFloat(formData.preco),
        custo_producao: parseFloat(formData.custo_producao || 0),
      };

      if (editingProduto) {
        await produtosAPI.atualizar(editingProduto.id, data);
        toast.success('Produto atualizado com sucesso');
      } else {
        await produtosAPI.criar(data);
        toast.success('Produto criado com sucesso');
      }
      setDialogOpen(false);
      resetForm();
      fetchProdutos();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este produto?')) {
      try {
        await produtosAPI.deletar(id);
        toast.success('Produto excluído com sucesso');
        fetchProdutos();
      } catch (error) {
        toast.error('Erro ao excluir produto');
      }
    }
  };

  const handleEdit = (produto) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || '',
      categoria: produto.categoria,
      preco: produto.preco.toString(),
      custo_producao: (produto.custo_producao || 0).toString(),
      ncm_code: produto.ncm_code || '18063210',
      unidade: produto.unidade || 'UN',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      categoria: '',
      preco: '',
      custo_producao: '',
      ncm_code: '18063210',
      unidade: 'UN',
    });
    setEditingProduto(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  return (
    <div data-testid="produtos-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Produtos</h1>
          <p className="text-base font-sans text-[#705A4D]">Gerencie o catálogo de chocolates</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-produto" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <Plus size={20} weight="bold" className="mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Descrição</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Categoria *</label>
                  <select
                    required
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  >
                    <option value="">Selecione...</option>
                    <option value="Trufas">Trufas</option>
                    <option value="Bombons">Bombons</option>
                    <option value="Barras">Barras</option>
                    <option value="Ovos de Páscoa">Ovos de Páscoa</option>
                    <option value="Tabletes">Tabletes</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Preço de Venda *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Custo de Produção</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.custo_producao}
                    onChange={(e) => setFormData({ ...formData, custo_producao: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Unidade</label>
                  <input
                    type="text"
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  {editingProduto ? 'Atualizar' : 'Criar'}
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
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Nome</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Categoria</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Descrição</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Preço</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Custo</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhum produto cadastrado
                  </td>
                </tr>
              ) : (
                produtos.map((produto) => (
                  <tr key={produto.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{produto.nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{produto.categoria}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{produto.descricao || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">{formatCurrency(produto.preco)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">{formatCurrency(produto.custo_producao || 0)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(produto)}
                          className="p-2 text-[#6B4423] hover:bg-[#E8D5C4] rounded-lg transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(produto.id)}
                          className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg transition-colors"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
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