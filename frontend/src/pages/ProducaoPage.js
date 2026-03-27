import React, { useEffect, useState } from 'react';
import { producaoAPI, pedidosAPI, produtosAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { Plus, CheckCircle, Package, ShoppingCart, Trash, PlusCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function ProducaoPage() {
  const [producoes, setProducoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tipoProducao, setTipoProducao] = useState('estoque'); // 'pedido' ou 'estoque'
  const [formData, setFormData] = useState({
    pedido_id: '',
    responsavel: '',
    observacoes: '',
  });
  
  // Lista de itens de produção (produto + quantidade)
  const [itensProducao, setItensProducao] = useState([
    { produto_id: '', quantidade: '' }
  ]);

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

  const addItemProducao = () => {
    setItensProducao([...itensProducao, { produto_id: '', quantidade: '' }]);
  };

  const removeItemProducao = (index) => {
    if (itensProducao.length > 1) {
      const newItens = itensProducao.filter((_, i) => i !== index);
      setItensProducao(newItens);
    }
  };

  const updateItemProducao = (index, field, value) => {
    const newItens = [...itensProducao];
    newItens[index][field] = value;
    setItensProducao(newItens);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar se há pelo menos um item válido
    const itensValidos = itensProducao.filter(item => item.produto_id && item.quantidade);
    if (itensValidos.length === 0) {
      toast.error('Adicione pelo menos um produto com quantidade');
      return;
    }

    setSubmitting(true);
    
    try {
      // Criar uma produção para cada item
      const promises = itensValidos.map(item => {
        const data = {
          produto_id: item.produto_id,
          quantidade: parseFloat(item.quantidade),
          responsavel: formData.responsavel || null,
          observacoes: formData.observacoes || null,
          tipo_producao: tipoProducao,
        };
        
        if (tipoProducao === 'pedido' && formData.pedido_id) {
          data.pedido_id = formData.pedido_id;
        }
        
        return producaoAPI.criar(data);
      });
      
      await Promise.all(promises);
      
      const produtosNomes = itensValidos.map(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        return `${item.quantidade}x ${produto?.nome || 'Produto'}`;
      }).join(', ');
      
      toast.success(`Produção iniciada: ${produtosNomes}`);
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao iniciar produção');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConcluir = async (producaoId) => {
    try {
      const result = await producaoAPI.concluir(producaoId);
      toast.success(result.data.message || 'Produção concluída! Enviada para embalagem.');
      fetchData();
    } catch (error) {
      toast.error('Erro ao concluir produção');
    }
  };

  const resetForm = () => {
    setFormData({
      pedido_id: '',
      responsavel: '',
      observacoes: '',
    });
    setItensProducao([{ produto_id: '', quantidade: '' }]);
    setTipoProducao('estoque');
  };

  const getProdutoNome = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || '';
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
          <DialogContent className="bg-[#FFFDF8] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">Iniciar Nova Produção</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seleção do tipo de produção */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoProducao('pedido')}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    tipoProducao === 'pedido'
                      ? 'border-[#6B4423] bg-[#F5E6D3]'
                      : 'border-[#8B5A3C]/30 hover:border-[#8B5A3C]/50'
                  }`}
                >
                  <ShoppingCart size={28} className={tipoProducao === 'pedido' ? 'text-[#6B4423]' : 'text-[#705A4D]'} weight="bold" />
                  <span className={`text-sm font-medium ${tipoProducao === 'pedido' ? 'text-[#6B4423]' : 'text-[#705A4D]'}`}>
                    Produção com Pedido
                  </span>
                  <span className="text-xs text-[#705A4D]">Vinculada a um pedido</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoProducao('estoque')}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    tipoProducao === 'estoque'
                      ? 'border-[#6B4423] bg-[#F5E6D3]'
                      : 'border-[#8B5A3C]/30 hover:border-[#8B5A3C]/50'
                  }`}
                >
                  <Package size={28} className={tipoProducao === 'estoque' ? 'text-[#6B4423]' : 'text-[#705A4D]'} weight="bold" />
                  <span className={`text-sm font-medium ${tipoProducao === 'estoque' ? 'text-[#6B4423]' : 'text-[#705A4D]'}`}>
                    Produção para Estoque
                  </span>
                  <span className="text-xs text-[#705A4D]">Sem pedido vinculado</span>
                </button>
              </div>

              {tipoProducao === 'pedido' && (
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Pedido *</label>
                  <select
                    required={tipoProducao === 'pedido'}
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
              )}

              {/* Lista de produtos a produzir */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[#6B4423]">Produtos a Produzir *</label>
                  <Button
                    type="button"
                    onClick={addItemProducao}
                    size="sm"
                    variant="outline"
                    className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
                  >
                    <PlusCircle size={16} weight="bold" className="mr-1" />
                    Adicionar Produto
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {itensProducao.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-[#F5E6D3]/50 rounded-lg">
                      <div className="flex-1">
                        <select
                          required
                          value={item.produto_id}
                          onChange={(e) => updateItemProducao(index, 'produto_id', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                        >
                          <option value="">Selecione um produto...</option>
                          {produtos.map((produto) => (
                            <option key={produto.id} value={produto.id}>{produto.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          placeholder="Qtd"
                          value={item.quantidade}
                          onChange={(e) => updateItemProducao(index, 'quantidade', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                        />
                      </div>
                      {itensProducao.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItemProducao(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                        >
                          <Trash size={18} weight="bold" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Resumo dos itens */}
                {itensProducao.some(item => item.produto_id && item.quantidade) && (
                  <div className="bg-[#E8D5C4] rounded-lg p-3 mt-2">
                    <p className="text-xs font-medium text-[#6B4423] mb-2">Resumo da Produção:</p>
                    <div className="flex flex-wrap gap-2">
                      {itensProducao.filter(item => item.produto_id && item.quantidade).map((item, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 bg-[#FFFDF8] rounded text-xs text-[#3E2723]">
                          {item.quantidade}x {getProdutoNome(item.produto_id)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Responsável</label>
                  <input
                    type="text"
                    placeholder="Nome do responsável pela produção"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label>
                  <textarea
                    placeholder="Observações sobre a produção..."
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
                <Button 
                  type="submit" 
                  className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                  disabled={submitting}
                >
                  {submitting ? 'Iniciando...' : 'Iniciar Produção'}
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
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Referência</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Quantidade</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Responsável</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Início</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Conclusão</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Status</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {producoes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhuma produção registrada
                  </td>
                </tr>
              ) : (
                producoes.map((producao) => (
                  <tr key={producao.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{producao.pedido_numero || '-'}</td>
                    <td className="px-6 py-4">
                      {producao.tipo_producao === 'estoque' || (producao.pedido_numero && producao.pedido_numero.startsWith('EST-')) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#E8D5C4] text-[#6B4423]">
                          <Package size={12} weight="bold" />
                          Estoque
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#DBEAFE] text-[#1E40AF]">
                          <ShoppingCart size={12} weight="bold" />
                          Pedido
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{producao.produto_nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">{producao.quantidade}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{producao.responsavel || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(producao.data_inicio)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                      {producao.data_conclusao ? formatDateTime(producao.data_conclusao) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {producao.data_conclusao ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">
                          Concluído
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FEFCBF] text-[#D97706]">
                          Pendente
                        </span>
                      )}
                    </td>
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
