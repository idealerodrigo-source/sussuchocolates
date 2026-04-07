import React, { useEffect, useState, useMemo } from 'react';
import { pedidosAPI, clientesAPI, produtosAPI } from '../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../utils/formatters';
import { Plus, ShoppingCart, Trash, PencilSimple, Eye, FilePdf, WhatsappLogo, UserPlus, Package, XCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { QuickCreateClienteModal, QuickCreateProdutoModal } from '../components/QuickCreateModals';
import { SearchableSelect, SearchableInput } from '../components/SearchableSelect';
import { SelecionarSaboresModal, produtoPermiteMultiplosSabores, formatarSabores } from '../components/SelecionarSaboresModal';
import { useSortableTable, SortableHeader } from '../hooks/useSortableTable';

// Componentes refatorados
import { generatePedidoPDF, enviarWhatsApp } from '../components/pedidos';
import { PedidoViewModal } from '../components/pedidos';
import { PedidosTable } from '../components/pedidos';

// Função para formatar quantidade (mostra decimal se for fracionado)
const formatarQuantidade = (qtd) => {
  if (Number.isInteger(qtd)) {
    return `${qtd}x`;
  }
  // Para quantidades fracionadas, mostrar com indicação de kg
  return `${qtd.toFixed(1).replace('.', ',')}kg`;
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingPedido, setViewingPedido] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrar pedidos pelo termo de pesquisa
  const filteredPedidos = useMemo(() => {
    if (!searchTerm.trim()) return pedidos;
    const term = searchTerm.toLowerCase();
    return pedidos.filter(p => 
      p.numero?.toLowerCase().includes(term) ||
      p.cliente_nome?.toLowerCase().includes(term) ||
      p.status?.toLowerCase().includes(term) ||
      p.observacoes?.toLowerCase().includes(term) ||
      p.items?.some(i => i.produto_nome?.toLowerCase().includes(term))
    );
  }, [pedidos, searchTerm]);
  
  const { sortedData, requestSort, sortConfig } = useSortableTable(filteredPedidos, { key: 'data_pedido', direction: 'desc' });
  
  // Estado para modal de seleção de sabores
  const [saboresModalOpen, setSaboresModalOpen] = useState(false);
  const [produtoPendenteSabores, setProdutoPendenteSabores] = useState(null);
  const [quantidadePendenteSabores, setQuantidadePendenteSabores] = useState(1);
  
  // Quantidade inicial ao adicionar produto
  const [quantidadeInicial, setQuantidadeInicial] = useState(1);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    items: [],
    observacoes: '',
    data_entrega: '',
    forma_pagamento: '',
    // Campos de pagamento antecipado
    pagamento_tipo: 'nenhum', // 'nenhum', 'total', 'parcial'
    valor_pago: 0,
    pagamento_forma: 'Dinheiro',
    pagamento_parcelas: 1,
  });
  const [itemTemp, setItemTemp] = useState({
    produto_id: '',
    produto_busca: '',
    quantidade: 1,
    desconto: 0,
    tipo_desconto: 'percentual', // 'percentual' ou 'valor'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pedidosRes, clientesRes, produtosRes] = await Promise.all([
        pedidosAPI.listar(),
        clientesAPI.listar(),
        produtosAPI.listar(),
      ]);
      setPedidos(pedidosRes.data);
      setClientes(clientesRes.data);
      setProdutos(produtosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Buscar produto pelo texto digitado
  const handleProdutoBuscaChange = (e) => {
    const busca = e.target.value;
    setItemTemp({ ...itemTemp, produto_busca: busca, produto_id: '' });
    
    // Tentar encontrar o produto pelo nome exato
    const produtoEncontrado = produtos.find(
      p => p.nome.toLowerCase() === busca.toLowerCase() ||
           `${p.nome} - R$ ${p.preco.toFixed(2)}`.toLowerCase() === busca.toLowerCase()
    );
    
    if (produtoEncontrado) {
      setItemTemp({ ...itemTemp, produto_busca: busca, produto_id: produtoEncontrado.id });
    }
  };

  const handleAddItem = () => {
    // Se não tem produto_id, tentar buscar pelo texto
    let produtoId = itemTemp.produto_id;
    if (!produtoId && itemTemp.produto_busca) {
      const produtoEncontrado = produtos.find(
        p => p.nome.toLowerCase() === itemTemp.produto_busca.toLowerCase() ||
             p.nome.toLowerCase().includes(itemTemp.produto_busca.toLowerCase())
      );
      if (produtoEncontrado) {
        produtoId = produtoEncontrado.id;
      }
    }
    
    if (!produtoId || itemTemp.quantidade <= 0) {
      toast.error('Selecione um produto válido e quantidade');
      return;
    }

    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) {
      toast.error('Produto não encontrado');
      return;
    }
    
    const valorBruto = produto.preco * itemTemp.quantidade;
    let valorDesconto = 0;
    
    if (itemTemp.desconto > 0) {
      if (itemTemp.tipo_desconto === 'percentual') {
        valorDesconto = valorBruto * (itemTemp.desconto / 100);
      } else {
        valorDesconto = itemTemp.desconto;
      }
    }
    
    const subtotal = valorBruto - valorDesconto;

    const newItem = {
      produto_id: produto.id,
      produto_nome: produto.nome,
      quantidade: itemTemp.quantidade,
      preco_unitario: produto.preco,
      desconto: itemTemp.desconto,
      tipo_desconto: itemTemp.tipo_desconto,
      valor_desconto: valorDesconto,
      subtotal: subtotal > 0 ? subtotal : 0,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setItemTemp({ produto_id: '', produto_busca: '', quantidade: 1, desconto: 0, tipo_desconto: 'percentual' });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      const payload = {
        ...formData,
        // Campos de pagamento antecipado
        status_pagamento: formData.pagamento_tipo === 'nenhum' ? 'pendente' : 
                          formData.pagamento_tipo === 'total' ? 'pago' : 'parcial',
        valor_pago: formData.valor_pago || 0,
        pagamento_forma: formData.pagamento_tipo !== 'nenhum' ? formData.pagamento_forma : null,
        pagamento_parcelas: formData.pagamento_parcelas || 1,
      };
      
      if (editMode && editingPedidoId) {
        await pedidosAPI.atualizar(editingPedidoId, payload);
        toast.success('Pedido atualizado com sucesso');
      } else {
        await pedidosAPI.criar(payload);
        toast.success('Pedido criado com sucesso');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(editMode ? 'Erro ao atualizar pedido' : 'Erro ao criar pedido');
    }
  };

  const handleEdit = (pedido) => {
    setEditMode(true);
    setEditingPedidoId(pedido.id);
    
    // Determinar tipo de pagamento com base no status
    let pagamentoTipo = 'nenhum';
    if (pedido.status_pagamento === 'pago') {
      pagamentoTipo = 'total';
    } else if (pedido.status_pagamento === 'parcial' || (pedido.valor_pago && pedido.valor_pago > 0)) {
      pagamentoTipo = 'parcial';
    }
    
    setFormData({
      cliente_id: pedido.cliente_id,
      items: pedido.items.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
      })),
      observacoes: pedido.observacoes || '',
      data_entrega: pedido.data_entrega ? pedido.data_entrega.split('T')[0] : '',
      forma_pagamento: pedido.forma_pagamento || '',
      pagamento_tipo: pagamentoTipo,
      valor_pago: pedido.valor_pago || 0,
      pagamento_forma: pedido.pagamento_forma || 'Dinheiro',
      pagamento_parcelas: pedido.pagamento_parcelas || 1,
    });
    setDialogOpen(true);
  };

  const handleView = (pedido) => {
    setViewingPedido(pedido);
    setViewDialogOpen(true);
  };

  const handleCancelarPedido = async (pedido) => {
    const statusLabel = getStatusLabel(pedido.status);
    
    let mensagemConfirmacao = `Deseja realmente cancelar o pedido ${pedido.numero}?`;
    
    if (pedido.status === 'em_producao') {
      mensagemConfirmacao += '\n\n⚠️ Este pedido está em produção. A produção será cancelada e o pedido voltará para pendente.';
    } else if (pedido.status === 'em_embalagem') {
      mensagemConfirmacao += '\n\n⚠️ Este pedido está em embalagem. A embalagem e produção serão canceladas.';
    } else if (pedido.status === 'concluido') {
      mensagemConfirmacao += '\n\n⚠️ Este pedido já foi produzido. Os produtos serão devolvidos ao estoque.';
    }
    
    if (!window.confirm(mensagemConfirmacao)) {
      return;
    }
    
    try {
      const response = await pedidosAPI.cancelar(pedido.id);
      const acoes = response.data.acoes_realizadas || [];
      
      let mensagemSucesso = `Pedido ${pedido.numero} cancelado com sucesso!`;
      if (acoes.length > 0) {
        mensagemSucesso += '\n\nAções realizadas:\n• ' + acoes.join('\n• ');
      }
      
      toast.success(mensagemSucesso);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar pedido');
    }
  };

  const handleMarcarEntregue = async (pedidoId, itemIndex) => {
    if (!window.confirm('Marcar este item como ENTREGUE ao cliente?\n\nIsso indica que o produto já foi entregue ao cliente.')) {
      return;
    }
    
    try {
      await pedidosAPI.marcarItemEntregue(pedidoId, itemIndex);
      toast.success('Item marcado como entregue!');
      
      // Atualizar viewingPedido localmente
      if (viewingPedido && viewingPedido.id === pedidoId) {
        const updatedItems = [...viewingPedido.items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], ja_entregue: true };
        setViewingPedido({ ...viewingPedido, items: updatedItems });
      }
      
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao marcar item como entregue');
    }
  };

  const handleMarcarSeparado = async (pedidoId, itemIndex) => {
    if (!window.confirm('Marcar este item como SEPARADO?\n\nIsso indica que o produto foi retirado do estoque e está pronto para entrega.\nO pedido ficará disponível para finalizar a venda.')) {
      return;
    }
    
    try {
      await pedidosAPI.marcarItemSeparado(pedidoId, itemIndex);
      toast.success('Item marcado como separado!');
      
      // Atualizar viewingPedido localmente
      if (viewingPedido && viewingPedido.id === pedidoId) {
        const updatedItems = [...viewingPedido.items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], ja_separado: true };
        setViewingPedido({ ...viewingPedido, items: updatedItems });
      }
      
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao marcar item como separado');
    }
  };

  const handleExcluirPedido = async (pedido) => {
    if (pedido.status !== 'pendente') {
      toast.error('Apenas pedidos pendentes podem ser excluídos. Use "Cancelar" para outros status.');
      return;
    }
    
    if (!window.confirm(`Deseja realmente EXCLUIR permanentemente o pedido ${pedido.numero}?`)) {
      return;
    }
    
    try {
      await pedidosAPI.excluir(pedido.id);
      toast.success(`Pedido ${pedido.numero} excluído com sucesso!`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir pedido');
    }
  };

  const handleExcluirItem = async (pedidoId, itemIndex, itemNome) => {
    if (!window.confirm(`Deseja remover o item "${itemNome}" deste pedido?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      const response = await pedidosAPI.excluirItem(pedidoId, itemIndex);
      toast.success(response.data.message || 'Item removido com sucesso!');
      
      // Atualizar viewingPedido localmente
      if (viewingPedido && viewingPedido.id === pedidoId) {
        const updatedItems = viewingPedido.items.filter((_, i) => i !== itemIndex);
        const novoValorTotal = updatedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        setViewingPedido({ 
          ...viewingPedido, 
          items: updatedItems,
          valor_total: novoValorTotal
        });
      }
      
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao remover item');
    }
  };

  // Funções de PDF e WhatsApp usando componentes refatorados
  const handleGeneratePDF = (pedido) => generatePedidoPDF(pedido, clientes);
  const handleEnviarWhatsApp = (pedido) => enviarWhatsApp(pedido, clientes);

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      items: [],
      observacoes: '',
      data_entrega: '',
      forma_pagamento: '',
      pagamento_tipo: 'nenhum',
      valor_pago: 0,
      pagamento_forma: 'Dinheiro',
      pagamento_parcelas: 1,
    });
    setItemTemp({ produto_id: '', produto_busca: '', quantidade: 1, desconto: 0, tipo_desconto: 'percentual' });
    setEditMode(false);
    setEditingPedidoId(null);
    setQuantidadeInicial(1);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  const totalPedido = formData.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div data-testid="pedidos-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Pedidos</h1>
          <p className="text-base font-sans text-[#705A4D]">Gerencie os pedidos dos clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-pedido" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <Plus size={20} weight="bold" className="mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">
                {editMode ? 'Editar Pedido' : 'Novo Pedido'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Cliente *</label>
                <SearchableSelect
                  options={clientes.map(c => ({ 
                    id: c.id, 
                    label: c.nome,
                    subtitle: c.telefone || c.email
                  }))}
                  value={formData.cliente_id}
                  onChange={(id) => setFormData({ ...formData, cliente_id: id })}
                  placeholder="Selecione um cliente..."
                  searchPlaceholder="Buscar cliente..."
                  emptyMessage="Nenhum cliente encontrado"
                  actionButton={
                    <QuickCreateClienteModal
                      onClienteCreated={(novoCliente) => {
                        setClientes([...clientes, novoCliente]);
                        setFormData({ ...formData, cliente_id: novoCliente.id });
                      }}
                      trigger={
                        <Button type="button" variant="ghost" size="sm" className="w-full text-[#6B4423] justify-start">
                          <UserPlus size={16} className="mr-2" />
                          Cadastrar novo cliente
                        </Button>
                      }
                    />
                  }
                />
              </div>

              <div className="border-t border-[#8B5A3C]/15 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-serif font-semibold text-[#3E2723]">Itens do Pedido</h3>
                  <QuickCreateProdutoModal
                    onProdutoCreated={(novoProduto) => {
                      setProdutos([...produtos, novoProduto]);
                    }}
                  />
                </div>
                
                {/* Busca de produtos com campo de quantidade */}
                <div className="mb-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <SearchableInput
                      options={produtos.map(p => ({
                        id: p.id,
                        label: p.nome,
                        subtitle: p.categoria,
                        extra: formatCurrency(p.preco),
                        preco: p.preco
                      }))}
                      onSelect={(produto) => {
                        const produtoCompleto = produtos.find(p => p.id === produto.id);
                        if (produtoCompleto) {
                          // Verificar se o produto permite múltiplos sabores
                          if (produtoPermiteMultiplosSabores(produtoCompleto.nome)) {
                            // Abrir modal de seleção de sabores
                            setProdutoPendenteSabores(produtoCompleto);
                            setQuantidadePendenteSabores(quantidadeInicial);
                            setSaboresModalOpen(true);
                          } else {
                            // Adicionar com a quantidade inicial definida
                            const newItem = {
                              produto_id: produtoCompleto.id,
                              produto_nome: produtoCompleto.nome,
                              quantidade: quantidadeInicial,
                              preco_unitario: produtoCompleto.preco,
                              subtotal: quantidadeInicial * produtoCompleto.preco
                            };
                            setFormData({ ...formData, items: [...formData.items, newItem] });
                            toast.success(`${produtoCompleto.nome} adicionado (${formatarQuantidade(quantidadeInicial)})`);
                            // Resetar quantidade inicial para 1
                            setQuantidadeInicial(1);
                          }
                        }
                      }}
                      placeholder="Buscar produto para adicionar..."
                      emptyMessage="Nenhum produto encontrado"
                      actionButton={
                        <QuickCreateProdutoModal
                          onProdutoCreated={(novoProduto) => {
                            setProdutos([...produtos, novoProduto]);
                          }}
                          trigger={
                            <Button type="button" variant="ghost" size="sm" className="w-full text-[#6B4423] justify-start">
                              <Package size={16} className="mr-2" />
                              Cadastrar novo produto
                            </Button>
                          }
                        />
                      }
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-[#705A4D] mb-1">Qtd</label>
                    <div className="flex items-center gap-1 bg-[#F5E6D3] rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setQuantidadeInicial(Math.max(0.1, Math.round((quantidadeInicial - 0.5) * 10) / 10))}
                        disabled={quantidadeInicial <= 0.1}
                        className="w-7 h-7 flex items-center justify-center rounded bg-[#FFFDF8] hover:bg-[#E8D5C4] disabled:opacity-50 text-[#6B4423] font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={quantidadeInicial}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0.1;
                          setQuantidadeInicial(Math.max(0.1, val));
                        }}
                        className="w-14 text-center bg-[#FFFDF8] border-0 text-[#3E2723] font-semibold text-sm rounded focus:ring-1 focus:ring-[#6B4423]"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantidadeInicial(Math.round((quantidadeInicial + 0.5) * 10) / 10)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-[#6B4423] hover:bg-[#8B5A3C] text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Modal de seleção de sabores */}
                <SelecionarSaboresModal
                  open={saboresModalOpen}
                  onOpenChange={setSaboresModalOpen}
                  produto={produtoPendenteSabores}
                  quantidade={quantidadePendenteSabores}
                  todosProdutos={produtos}
                  onConfirm={(sabores) => {
                    if (produtoPendenteSabores) {
                      const newItem = {
                        produto_id: produtoPendenteSabores.id,
                        produto_nome: produtoPendenteSabores.nome,
                        quantidade: quantidadePendenteSabores,
                        preco_unitario: produtoPendenteSabores.preco,
                        subtotal: quantidadePendenteSabores * produtoPendenteSabores.preco,
                        sabores: sabores // Array de {sabor, quantidade}
                      };
                      setFormData({ ...formData, items: [...formData.items, newItem] });
                      toast.success(`${produtoPendenteSabores.nome} adicionado com sabores`);
                      setProdutoPendenteSabores(null);
                    }
                  }}
                />
                
                {/* Campo de desconto */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-[#6B4423] mb-1">Desconto</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemTemp.desconto}
                      onChange={(e) => setItemTemp({ ...itemTemp, desconto: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                    />
                  </div>
                  <div className="col-span-4">
                    <div className="flex rounded-lg overflow-hidden border border-[#8B5A3C]/30">
                      <button
                        type="button"
                        onClick={() => setItemTemp({ ...itemTemp, tipo_desconto: 'percentual' })}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${
                          itemTemp.tipo_desconto === 'percentual' 
                            ? 'bg-[#8B5A3C] text-white' 
                            : 'bg-[#FFFDF8] text-[#6B4423] hover:bg-[#F5E6D3]'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemTemp({ ...itemTemp, tipo_desconto: 'valor' })}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${
                          itemTemp.tipo_desconto === 'valor' 
                            ? 'bg-[#8B5A3C] text-white' 
                            : 'bg-[#FFFDF8] text-[#6B4423] hover:bg-[#F5E6D3]'
                        }`}
                      >
                        R$
                      </button>
                    </div>
                  </div>
                  <div className="col-span-4 text-xs text-[#705A4D]">
                    {itemTemp.desconto > 0 && itemTemp.produto_busca && (
                      <span className="text-[#D97706]">
                        -{itemTemp.tipo_desconto === 'percentual' ? `${itemTemp.desconto}%` : formatCurrency(itemTemp.desconto)}
                      </span>
                    )}
                  </div>
                </div>

                {formData.items.length > 0 && (
                  <div className="bg-[#F5E6D3]/30 rounded-lg p-4 space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-[#FFFDF8] p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#3E2723]">{item.produto_nome}</p>
                          {item.sabores && item.sabores.length > 0 && (
                            <p className="text-xs text-[#6B4423] bg-[#F5E6D3] px-2 py-0.5 rounded inline-block mt-1">
                              Sabores: {formatarSabores(item.sabores)}
                            </p>
                          )}
                          <p className="text-xs text-[#705A4D] mt-1">
                            {formatarQuantidade(item.quantidade)} {formatCurrency(item.preco_unitario)}
                            {item.valor_desconto > 0 && (
                              <span className="text-[#D97706] ml-1">
                                (-{item.tipo_desconto === 'percentual' ? `${item.desconto}%` : formatCurrency(item.desconto)})
                              </span>
                            )}
                            <span className="ml-1">= {formatCurrency(item.subtotal)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Controles de quantidade */}
                          <div className="flex items-center gap-1 bg-[#F5E6D3] rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantidade > 0.1) {
                                  const novaQtd = Math.round((item.quantidade - 0.5) * 10) / 10; // Decrementa 0.5
                                  const newItems = [...formData.items];
                                  newItems[index] = {
                                    ...item,
                                    quantidade: Math.max(0.1, novaQtd),
                                    subtotal: Math.max(0.1, novaQtd) * item.preco_unitario - (item.valor_desconto || 0)
                                  };
                                  setFormData({ ...formData, items: newItems });
                                }
                              }}
                              disabled={item.quantidade <= 0.1}
                              className="w-7 h-7 flex items-center justify-center rounded bg-[#FFFDF8] hover:bg-[#E8D5C4] disabled:opacity-50 disabled:cursor-not-allowed text-[#6B4423] font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={item.quantidade}
                              onChange={(e) => {
                                const novaQtd = parseFloat(e.target.value) || 0.1;
                                if (novaQtd >= 0.1) {
                                  const newItems = [...formData.items];
                                  newItems[index] = {
                                    ...item,
                                    quantidade: novaQtd,
                                    subtotal: novaQtd * item.preco_unitario - (item.valor_desconto || 0)
                                  };
                                  setFormData({ ...formData, items: newItems });
                                }
                              }}
                              className="w-14 text-center bg-[#FFFDF8] border-0 text-[#3E2723] font-semibold text-sm rounded focus:ring-1 focus:ring-[#6B4423]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const novaQtd = Math.round((item.quantidade + 0.5) * 10) / 10; // Incrementa 0.5
                                const newItems = [...formData.items];
                                newItems[index] = {
                                  ...item,
                                  quantidade: novaQtd,
                                  subtotal: novaQtd * item.preco_unitario - (item.valor_desconto || 0)
                                };
                                setFormData({ ...formData, items: newItems });
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded bg-[#6B4423] hover:bg-[#8B5A3C] text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg transition-colors"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-[#8B5A3C]/15">
                      {formData.items.some(item => item.valor_desconto > 0) && (
                        <p className="text-sm text-[#D97706] text-right mb-1">
                          Descontos: -{formatCurrency(formData.items.reduce((sum, item) => sum + (item.valor_desconto || 0), 0))}
                        </p>
                      )}
                      <p className="text-lg font-serif font-bold text-[#3E2723] text-right">
                        Total: {formatCurrency(totalPedido)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Forma de Pagamento</label>
                <select
                  value={formData.forma_pagamento}
                  onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                >
                  <option value="">Selecione (opcional)...</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Boleto">Boleto</option>
                  <option value="A Combinar">A Combinar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows="2"
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data de Entrega (opcional)</label>
                <input
                  type="date"
                  value={formData.data_entrega}
                  onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>

              {/* Seção de Pagamento Antecipado */}
              <div className="bg-[#F5E6D3]/30 rounded-lg p-4 border border-[#8B5A3C]/20">
                <label className="block text-sm font-semibold text-[#6B4423] mb-3">Pagamento Antecipado</label>
                
                <div className="space-y-3">
                  {/* Tipo de pagamento */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pagamento_tipo"
                        value="nenhum"
                        checked={formData.pagamento_tipo === 'nenhum'}
                        onChange={(e) => setFormData({ ...formData, pagamento_tipo: e.target.value, valor_pago: 0 })}
                        className="w-4 h-4 text-[#6B4423] focus:ring-[#6B4423]"
                      />
                      <span className="text-sm text-[#3E2723]">Não pago</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pagamento_tipo"
                        value="total"
                        checked={formData.pagamento_tipo === 'total'}
                        onChange={(e) => setFormData({ ...formData, pagamento_tipo: e.target.value, valor_pago: totalPedido })}
                        className="w-4 h-4 text-[#6B4423] focus:ring-[#6B4423]"
                      />
                      <span className="text-sm text-[#3E2723]">Pago Total</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pagamento_tipo"
                        value="parcial"
                        checked={formData.pagamento_tipo === 'parcial'}
                        onChange={(e) => setFormData({ ...formData, pagamento_tipo: e.target.value })}
                        className="w-4 h-4 text-[#6B4423] focus:ring-[#6B4423]"
                      />
                      <span className="text-sm text-[#3E2723]">Adiantamento</span>
                    </label>
                  </div>
                  
                  {/* Campos de pagamento (visíveis quando pago total ou parcial) */}
                  {formData.pagamento_tipo !== 'nenhum' && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {/* Valor pago */}
                      <div>
                        <label className="block text-xs text-[#705A4D] mb-1">
                          {formData.pagamento_tipo === 'total' ? 'Valor Total' : 'Valor do Adiantamento'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.valor_pago}
                          onChange={(e) => setFormData({ ...formData, valor_pago: parseFloat(e.target.value) || 0 })}
                          disabled={formData.pagamento_tipo === 'total'}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg text-sm focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none disabled:bg-[#F5E6D3]"
                        />
                      </div>
                      
                      {/* Forma de pagamento */}
                      <div>
                        <label className="block text-xs text-[#705A4D] mb-1">Forma de Pagamento</label>
                        <select
                          value={formData.pagamento_forma}
                          onChange={(e) => setFormData({ ...formData, pagamento_forma: e.target.value })}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg text-sm focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none"
                        >
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="PIX">PIX</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="Transferência">Transferência</option>
                        </select>
                      </div>
                      
                      {/* Parcelas (se cartão de crédito) */}
                      {formData.pagamento_forma === 'Cartão de Crédito' && (
                        <div>
                          <label className="block text-xs text-[#705A4D] mb-1">Parcelas</label>
                          <select
                            value={formData.pagamento_parcelas}
                            onChange={(e) => setFormData({ ...formData, pagamento_parcelas: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg text-sm focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none"
                          >
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                              <option key={n} value={n}>{n}x</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {/* Saldo restante (se adiantamento) */}
                      {formData.pagamento_tipo === 'parcial' && (
                        <div>
                          <label className="block text-xs text-[#705A4D] mb-1">Saldo na Retirada</label>
                          <div className="px-3 py-2 bg-[#FEF3C7] border border-[#D97706]/30 rounded-lg text-sm font-semibold text-[#D97706]">
                            {formatCurrency(Math.max(0, totalPedido - (formData.valor_pago || 0)))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Resumo do pagamento */}
                  {formData.pagamento_tipo !== 'nenhum' && formData.valor_pago > 0 && (
                    <div className="pt-2 mt-2 border-t border-[#8B5A3C]/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#705A4D]">Valor pago agora:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(formData.valor_pago)}</span>
                      </div>
                      {formData.pagamento_tipo === 'parcial' && totalPedido > formData.valor_pago && (
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-[#705A4D]">Saldo a pagar na retirada:</span>
                          <span className="font-semibold text-[#D97706]">{formatCurrency(totalPedido - formData.valor_pago)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  {editMode ? 'Salvar Alterações' : 'Criar Pedido'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campo de Pesquisa */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <MagnifyingGlass size={20} weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C]" />
          <input
            type="text"
            placeholder="Pesquisar por número, cliente, produto, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans placeholder:text-[#8B5A3C]/60"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C] hover:text-[#6B4423]">✕</button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-[#705A4D] mt-1">Encontrados: {filteredPedidos.length} de {pedidos.length} pedidos</p>
        )}
      </div>

      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#E8D5C4]">
              <tr>
                <SortableHeader label="Número" sortKey="numero" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Cliente" sortKey="cliente_nome" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Data Pedido" sortKey="data_pedido" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Entrega" sortKey="data_entrega" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Pagamento" sortKey="forma_pagamento" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Valor" sortKey="valor_total" sortConfig={sortConfig} onSort={requestSort} className="text-right" />
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhum pedido cadastrado
                  </td>
                </tr>
              ) : (
                sortedData.map((pedido) => (
                  <tr key={pedido.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{pedido.numero}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{pedido.cliente_nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(pedido.data_pedido)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                      {pedido.data_entrega ? formatDateTime(pedido.data_entrega) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                      {pedido.forma_pagamento || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
                          {getStatusLabel(pedido.status)}
                        </span>
                        {pedido.items?.some(i => i.ja_entregue) && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full text-center">
                            {pedido.items.filter(i => i.ja_entregue).length}/{pedido.items.length} entregues
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">
                      {formatCurrency(pedido.valor_total)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => enviarWhatsApp(pedido)}
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          title="Enviar via WhatsApp"
                        >
                          <WhatsappLogo size={16} weight="bold" />
                        </Button>
                        <Button
                          onClick={() => generatePDF(pedido)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          title="Gerar PDF"
                        >
                          <FilePdf size={16} weight="bold" />
                        </Button>
                        <Button
                          onClick={() => handleView(pedido)}
                          size="sm"
                          variant="outline"
                          className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
                          title="Visualizar"
                          data-testid={`view-pedido-${pedido.numero}`}
                        >
                          <Eye size={16} weight="bold" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(pedido)}
                          size="sm"
                          className="bg-[#8B5A3C] text-white hover:bg-[#6B4423]"
                          title="Editar"
                          disabled={pedido.status === 'cancelado'}
                        >
                          <PencilSimple size={16} weight="bold" />
                        </Button>
                        {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
                          <Button
                            onClick={() => handleCancelarPedido(pedido)}
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            title="Cancelar Pedido"
                          >
                            <XCircle size={16} weight="bold" />
                          </Button>
                        )}
                        {pedido.status === 'pendente' && (
                          <Button
                            onClick={() => handleExcluirPedido(pedido)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            title="Excluir Pedido"
                          >
                            <Trash size={16} weight="bold" />
                          </Button>
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

      {/* Modal de visualização refatorado */}
      <PedidoViewModal
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        pedido={viewingPedido}
        onEdit={handleEdit}
        onGeneratePDF={handleGeneratePDF}
        onWhatsApp={handleEnviarWhatsApp}
        onMarcarSeparado={handleMarcarSeparado}
        onMarcarEntregue={handleMarcarEntregue}
        onExcluirItem={handleExcluirItem}
      />
    </div>
  );
}
