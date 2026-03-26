import React, { useEffect, useState } from 'react';
import { vendasAPI, pedidosAPI, nfceAPI, clientesAPI, produtosAPI } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Plus, Receipt, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function VendasPage() {
  const [vendas, setVendas] = useState([]);
  const [pedidosConcluidos, setPedidosConcluidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoVenda, setTipoVenda] = useState('pedido');
  const [formData, setFormData] = useState({
    pedido_id: '',
    cliente_id: '',
    items: [],
    forma_pagamento: '',
  });
  const [itemTemp, setItemTemp] = useState({
    produto_id: '',
    quantidade: 1,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vendasRes, pedidosRes, clientesRes, produtosRes] = await Promise.all([
        vendasAPI.listar(),
        pedidosAPI.listar(),
        clientesAPI.listar(),
        produtosAPI.listar(),
      ]);
      setVendas(vendasRes.data);
      
      const pedidosFinalizados = pedidosRes.data.filter(
        (p) => p.status === 'concluido' || p.status === 'em_embalagem'
      );
      setPedidosConcluidos(pedidosFinalizados);
      setClientes(clientesRes.data);
      setProdutos(produtosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!itemTemp.produto_id || itemTemp.quantidade <= 0) {
      toast.error('Selecione um produto e quantidade válida');
      return;
    }

    const produto = produtos.find((p) => p.id === itemTemp.produto_id);
    const subtotal = produto.preco * itemTemp.quantidade;

    const newItem = {
      produto_id: produto.id,
      produto_nome: produto.nome,
      quantidade: itemTemp.quantidade,
      preco_unitario: produto.preco,
      subtotal: subtotal,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setItemTemp({ produto_id: '', quantidade: 1 });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (tipoVenda === 'pedido') {
        await vendasAPI.criar({
          pedido_id: formData.pedido_id,
          forma_pagamento: formData.forma_pagamento,
          tipo_venda: 'pedido'
        });
      } else {
        if (formData.items.length === 0) {
          toast.error('Adicione pelo menos um produto à venda');
          return;
        }
        await vendasAPI.criar({
          cliente_id: formData.cliente_id,
          items: formData.items,
          forma_pagamento: formData.forma_pagamento,
          tipo_venda: 'direta'
        });
      }
      toast.success('Venda registrada com sucesso');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar venda');
    }
  };

  const handleEmitirNFCe = async (vendaId) => {
    try {
      await nfceAPI.emitir(vendaId);
      toast.success('NFC-e emitida com sucesso');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao emitir NFC-e');
    }
  };

  const resetForm = () => {
    setFormData({
      pedido_id: '',
      cliente_id: '',
      items: [],
      forma_pagamento: '',
    });
    setItemTemp({ produto_id: '', quantidade: 1 });
    setTipoVenda('pedido');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  const totalVendaDireta = formData.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div data-testid="vendas-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Vendas</h1>
          <p className="text-base font-sans text-[#705A4D]">Registre vendas de pedidos ou vendas diretas do estoque</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-venda" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <Plus size={20} weight="bold" className="mr-2" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">Registrar Venda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4 p-4 bg-[#F5E6D3]/30 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoVenda"
                    value="pedido"
                    checked={tipoVenda === 'pedido'}
                    onChange={(e) => setTipoVenda(e.target.value)}
                    className="w-4 h-4 text-[#6B4423]"
                  />
                  <span className="text-sm font-sans font-medium text-[#3E2723]">Venda de Pedido</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoVenda"
                    value="direta"
                    checked={tipoVenda === 'direta'}
                    onChange={(e) => setTipoVenda(e.target.value)}
                    className="w-4 h-4 text-[#6B4423]"
                  />
                  <span className="text-sm font-sans font-medium text-[#3E2723]">Venda Direta (Estoque)</span>
                </label>
              </div>

              {tipoVenda === 'pedido' ? (
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Pedido *</label>
                  <select
                    required
                    value={formData.pedido_id}
                    onChange={(e) => setFormData({ ...formData, pedido_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  >
                    <option value="">Selecione um pedido...</option>
                    {pedidosConcluidos.map((pedido) => (
                      <option key={pedido.id} value={pedido.id}>
                        {pedido.numero} - {pedido.cliente_nome} - {formatCurrency(pedido.valor_total)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[#705A4D] mt-1">
                    Pedidos concluídos ou em embalagem
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Cliente *</label>
                    <select
                      required
                      value={formData.cliente_id}
                      onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-[#8B5A3C]/15 pt-4">
                    <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Produtos do Estoque</h3>
                    
                    <div className="grid grid-cols-12 gap-3 mb-3">
                      <div className="col-span-7">
                        <select
                          value={itemTemp.produto_id}
                          onChange={(e) => setItemTemp({ ...itemTemp, produto_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                        >
                          <option value="">Selecione um produto...</option>
                          {produtos.map((produto) => (
                            <option key={produto.id} value={produto.id}>
                              {produto.nome} - {formatCurrency(produto.preco)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="1"
                          value={itemTemp.quantidade}
                          onChange={(e) => setItemTemp({ ...itemTemp, quantidade: parseInt(e.target.value) || 1 })}
                          placeholder="Qtd"
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" onClick={handleAddItem} className="w-full bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423]">
                          <Plus size={18} weight="bold" />
                        </Button>
                      </div>
                    </div>

                    {formData.items.length > 0 && (
                      <div className="bg-[#F5E6D3]/30 rounded-lg p-4 space-y-2">
                        {formData.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between bg-[#FFFDF8] p-3 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[#3E2723]">{item.produto_nome}</p>
                              <p className="text-xs text-[#705A4D]">
                                {item.quantidade}x {formatCurrency(item.preco_unitario)} = {formatCurrency(item.subtotal)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg transition-colors"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-[#8B5A3C]/15 text-right">
                          <p className="text-lg font-serif font-bold text-[#3E2723]">
                            Total: {formatCurrency(totalVendaDireta)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Forma de Pagamento *</label>
                <select
                  required
                  value={formData.forma_pagamento}
                  onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                >
                  <option value="">Selecione...</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="PIX">PIX</option>
                  <option value="Boleto">Boleto</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  Registrar Venda
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
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Data</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Pagamento</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor</th>
                <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">NFC-e</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhuma venda registrada
                  </td>
                </tr>
              ) : (
                vendas.map((venda) => (
                  <tr key={venda.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        venda.tipo_venda === 'direta' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {venda.tipo_venda === 'direta' ? 'Direta' : 'Pedido'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{venda.cliente_nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(venda.data_venda)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{venda.forma_pagamento}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">
                      {formatCurrency(venda.valor_total)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {venda.nfce_emitida ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">
                          Emitida
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FEFCBF] text-[#D97706]">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!venda.nfce_emitida && (
                        <Button
                          onClick={() => handleEmitirNFCe(venda.id)}
                          size="sm"
                          className="bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423] text-xs"
                        >
                          <Receipt size={16} weight="bold" className="mr-1" />
                          Emitir NFC-e
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
