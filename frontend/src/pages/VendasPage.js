import React, { useEffect, useState } from 'react';
import { vendasAPI, pedidosAPI, nfceAPI, clientesAPI, produtosAPI } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Plus, Receipt, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useSortableTable, SortableHeader } from '../hooks/useSortableTable';

export default function VendasPage() {
  const [vendas, setVendas] = useState([]);
  const [pedidosConcluidos, setPedidosConcluidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoVenda, setTipoVenda] = useState('pedido');
  const { sortedData, requestSort, sortConfig } = useSortableTable(vendas, { key: 'data_venda', direction: 'desc' });
  const [formData, setFormData] = useState({
    pedido_id: '',
    cliente_id: '',
    items: [],
    forma_pagamento: '',
    entrega_posterior: false,
    data_previsao_pagamento: '',
    observacoes_pagamento: '',
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
          tipo_venda: 'pedido',
          entrega_posterior: formData.entrega_posterior,
          status_pagamento: formData.entrega_posterior ? 'pendente' : 'pago',
          data_previsao_pagamento: formData.entrega_posterior ? formData.data_previsao_pagamento : null,
          observacoes_pagamento: formData.observacoes_pagamento || null,
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
          tipo_venda: 'direta',
          entrega_posterior: formData.entrega_posterior,
          status_pagamento: formData.entrega_posterior ? 'pendente' : 'pago',
          data_previsao_pagamento: formData.entrega_posterior ? formData.data_previsao_pagamento : null,
          observacoes_pagamento: formData.observacoes_pagamento || null,
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

  const handleEmitirNFCe = async (venda) => {
    try {
      // Preparar dados para NFC-e
      const dadosNFCe = {
        venda_id: venda.id,
        items: venda.items.map(item => ({
          codigo: item.produto_id || '0001',
          descricao: item.produto_nome,
          ncm: '18069000', // NCM para chocolates
          cfop: '5102',
          unidade: 'UN',
          quantidade: item.quantidade,
          valor_unitario: item.preco_unitario,
          valor_total: item.subtotal
        })),
        valor_produtos: venda.valor_total,
        valor_desconto: 0,
        valor_total: venda.valor_total,
        forma_pagamento: venda.forma_pagamento === 'dinheiro' ? '01' : 
                         venda.forma_pagamento === 'cartao_credito' ? '03' :
                         venda.forma_pagamento === 'cartao_debito' ? '04' : 
                         venda.forma_pagamento === 'pix' ? '17' : '01',
        valor_pago: venda.valor_total,
        valor_troco: 0
      };
      
      const response = await nfceAPI.emitir(dadosNFCe);
      
      if (response.data.success) {
        toast.success(`NFC-e ${response.data.numero_nfce} emitida com sucesso!`);
        // Backend already updates the venda with NFC-e data, just refresh
        fetchData();
      } else {
        toast.error(response.data.message || 'Erro ao emitir NFC-e');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao emitir NFC-e');
    }
  };

  const handleConfirmarPagamento = async (vendaId) => {
    const confirmar = window.confirm('Confirmar o recebimento do pagamento desta venda?');
    if (!confirmar) return;
    
    try {
      await vendasAPI.confirmarPagamento(vendaId);
      toast.success('Pagamento confirmado com sucesso!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao confirmar pagamento');
    }
  };

  const resetForm = () => {
    setFormData({
      pedido_id: '',
      cliente_id: '',
      items: [],
      forma_pagamento: '',
      entrega_posterior: false,
      data_previsao_pagamento: '',
      observacoes_pagamento: '',
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
                  <option value="A Prazo">A Prazo (Fiado)</option>
                </select>
              </div>

              {/* Opção de entrega com pagamento posterior */}
              <div className="bg-[#F5E6D3]/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="entrega_posterior"
                    checked={formData.entrega_posterior}
                    onChange={(e) => setFormData({ ...formData, entrega_posterior: e.target.checked })}
                    className="w-5 h-5 text-[#6B4423] bg-[#FFFDF8] border-[#8B5A3C]/30 rounded focus:ring-[#6B4423]"
                  />
                  <label htmlFor="entrega_posterior" className="text-sm font-medium text-[#3E2723]">
                    Entrega com pagamento posterior (a receber)
                  </label>
                </div>
                
                {formData.entrega_posterior && (
                  <div className="ml-8 space-y-3 pt-2 border-t border-[#8B5A3C]/15">
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">
                        Previsão de Pagamento
                      </label>
                      <input
                        type="date"
                        value={formData.data_previsao_pagamento}
                        onChange={(e) => setFormData({ ...formData, data_previsao_pagamento: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">
                        Observações do Pagamento
                      </label>
                      <textarea
                        value={formData.observacoes_pagamento}
                        onChange={(e) => setFormData({ ...formData, observacoes_pagamento: e.target.value })}
                        placeholder="Ex: Pagamento na próxima entrega, cliente pagará em 2x, etc."
                        rows="2"
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans resize-none"
                      />
                    </div>
                    <p className="text-xs text-[#D97706] flex items-center gap-1">
                      <span>⚠️</span>
                      Esta venda ficará com status "Pagamento Pendente" até ser confirmado
                    </p>
                  </div>
                )}
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
                <SortableHeader label="Tipo" sortKey="tipo_venda" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Cliente" sortKey="cliente_nome" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Data" sortKey="data_venda" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Pagamento" sortKey="forma_pagamento" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Valor" sortKey="valor_total" sortConfig={sortConfig} onSort={requestSort} className="text-right" />
                <SortableHeader label="Status Pgto" sortKey="status_pagamento" sortConfig={sortConfig} onSort={requestSort} className="text-center" />
                <SortableHeader label="NFC-e" sortKey="nfce_emitida" sortConfig={sortConfig} onSort={requestSort} className="text-center" />
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhuma venda registrada
                  </td>
                </tr>
              ) : (
                sortedData.map((venda) => (
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
                    <td className="px-6 py-4 text-center">
                      {venda.status_pagamento === 'pendente' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FED7AA] text-[#C2410C]">
                            A Receber
                          </span>
                          {venda.data_previsao_pagamento && (
                            <span className="text-[10px] text-[#705A4D]">
                              Prev: {new Date(venda.data_previsao_pagamento).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">
                          Pago
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {venda.status_pagamento === 'pendente' && (
                          <Button
                            onClick={() => handleConfirmarPagamento(venda.id)}
                            size="sm"
                            className="bg-[#2F855A] text-white hover:bg-[#276749] text-xs"
                            title="Confirmar Pagamento"
                          >
                            Receber
                          </Button>
                        )}
                        {!venda.nfce_emitida && (
                          <Button
                            onClick={() => handleEmitirNFCe(venda)}
                            size="sm"
                            className="bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423] text-xs"
                          >
                            <Receipt size={16} weight="bold" className="mr-1" />
                            NFC-e
                          </Button>
                        )}
                        {venda.nfce_emitida && venda.nfce_numero && (
                          <span className="text-xs text-[#705A4D]">
                            NFC-e: {venda.nfce_numero}
                          </span>
                        )}
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
