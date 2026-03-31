import React, { useEffect, useState, useMemo } from 'react';
import { vendasAPI, pedidosAPI, nfceAPI, clientesAPI, produtosAPI } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Plus, MagnifyingGlass, UserPlus, Factory, ShoppingBag } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { QuickCreateClienteModal, QuickCreateProdutoModal } from '../components/QuickCreateModals';
import { SearchableSelect, SearchableInput } from '../components/SearchableSelect';
import { SelecionarSaboresModal, produtoPermiteMultiplosSabores, formatarSabores } from '../components/SelecionarSaboresModal';
import { useSortableTable } from '../hooks/useSortableTable';
import { 
  DescontoSection, 
  FormasPagamentoSection, 
  VendasTable,
  NFCePreviewModal,
  NFCeViewModal 
} from '../components/vendas';

export default function VendasPage() {
  // Estados principais
  const [vendas, setVendas] = useState([]);
  const [pedidosConcluidos, setPedidosConcluidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoVenda, setTipoVenda] = useState('pedido');
  const [searchTerm, setSearchTerm] = useState('');
  const [etapaVendaDireta, setEtapaVendaDireta] = useState(1);
  
  // Estado para modal de seleção de sabores
  const [saboresModalOpen, setSaboresModalOpen] = useState(false);
  const [produtoPendenteSabores, setProdutoPendenteSabores] = useState(null);
  const [quantidadePendenteSabores, setQuantidadePendenteSabores] = useState(1);
  const [tipoEntregaPendente, setTipoEntregaPendente] = useState('imediata');
  
  // Filtrar vendas pelo termo de pesquisa
  const filteredVendas = useMemo(() => {
    if (!searchTerm.trim()) return vendas;
    const term = searchTerm.toLowerCase();
    return vendas.filter(venda => {
      if (venda.cliente_nome?.toLowerCase().includes(term)) return true;
      if (venda.forma_pagamento?.toLowerCase().includes(term)) return true;
      if (venda.tipo_venda?.toLowerCase().includes(term)) return true;
      if (venda.pedido_numero?.toLowerCase().includes(term)) return true;
      if (venda.items?.some(item => item.produto_nome?.toLowerCase().includes(term))) return true;
      if (venda.status_pagamento === 'pendente' && 'a receber'.includes(term)) return true;
      if (venda.status_pagamento === 'pago' && 'pago'.includes(term)) return true;
      if (venda.status_venda === 'cancelada' && 'cancelada'.includes(term)) return true;
      if (venda.status_venda !== 'cancelada' && 'ativa'.includes(term)) return true;
      return false;
    });
  }, [vendas, searchTerm]);
  
  const { sortedData, requestSort, sortConfig } = useSortableTable(filteredVendas, { key: 'data_venda', direction: 'desc' });
  
  const [formData, setFormData] = useState({
    pedido_id: '',
    cliente_id: '',
    items: [],
    forma_pagamento: '',
    formas_pagamento: [],
    parcelas: 1,
    entrega_posterior: false,
    data_previsao_pagamento: '',
    observacoes_pagamento: '',
    desconto_tipo: 'valor',
    desconto_valor: 0,
  });
  
  const [novaFormaPagamento, setNovaFormaPagamento] = useState({
    tipo: '',
    valor: '',
    parcelas: 1,
  });
  
  // Estados para modais de NFC-e
  const [previewNFCeOpen, setPreviewNFCeOpen] = useState(false);
  const [viewNFCeOpen, setViewNFCeOpen] = useState(false);
  const [selectedVendaForNFCe, setSelectedVendaForNFCe] = useState(null);
  const [emitindoNFCe, setEmitindoNFCe] = useState(false);

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
      // Filtrar pedidos que estão prontos para venda:
      // 1. Status 'concluido' ou 'em_embalagem'
      // 2. OU pedidos onde TODOS os itens estão marcados como 'já entregue'
      const pedidosFinalizados = pedidosRes.data.filter((p) => {
        // Condição tradicional: status concluido ou em_embalagem
        if (p.status === 'concluido' || p.status === 'em_embalagem') {
          return true;
        }
        // Nova condição: todos os itens do pedido estão marcados como 'já entregue'
        if (p.items && p.items.length > 0) {
          const todosEntregues = p.items.every(item => item.ja_entregue === true);
          if (todosEntregues) {
            return true;
          }
        }
        return false;
      });
      setPedidosConcluidos(pedidosFinalizados);
      setClientes(clientesRes.data);
      setProdutos(produtosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Funções de cálculo
  const calcularTotalFormasPagamento = () => {
    return formData.formas_pagamento.reduce((acc, fp) => acc + fp.valor, 0);
  };

  const calcularSubtotalItens = () => {
    if (tipoVenda === 'pedido' && formData.pedido_id) {
      const pedidoSelecionado = pedidosConcluidos.find(p => p.id === formData.pedido_id);
      return pedidoSelecionado?.valor_total || 0;
    }
    return formData.items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  };

  const calcularValorDesconto = () => {
    const subtotal = calcularSubtotalItens();
    if (formData.desconto_tipo === 'percentual') {
      return (subtotal * (formData.desconto_valor || 0)) / 100;
    }
    return formData.desconto_valor || 0;
  };

  const calcularTotalComDesconto = () => {
    const subtotal = calcularSubtotalItens();
    const desconto = calcularValorDesconto();
    return Math.max(0, subtotal - desconto);
  };

  const calcularRestantePagamento = () => {
    const totalVenda = calcularTotalComDesconto();
    const totalPago = calcularTotalFormasPagamento();
    return Math.max(0, totalVenda - totalPago);
  };

  // Handler para adicionar forma de pagamento
  const handleAdicionarFormaPagamento = () => {
    if (!novaFormaPagamento.tipo || !novaFormaPagamento.valor) {
      toast.error('Selecione o tipo e informe o valor');
      return;
    }
    
    const valor = parseFloat(novaFormaPagamento.valor);
    if (isNaN(valor) || valor <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    
    const totalAtual = formData.formas_pagamento.reduce((acc, fp) => acc + fp.valor, 0);
    const totalVenda = calcularTotalComDesconto();
    
    if (totalVenda <= 0) {
      toast.error('Selecione um pedido ou adicione produtos primeiro');
      return;
    }
    
    if (totalAtual + valor > totalVenda + 0.01) {
      toast.error(`O total das formas de pagamento não pode exceder ${formatCurrency(totalVenda)}`);
      return;
    }
    
    const novaForma = {
      tipo: novaFormaPagamento.tipo,
      valor: valor,
      parcelas: novaFormaPagamento.tipo === 'Cartão de Crédito' ? novaFormaPagamento.parcelas : 1,
    };
    
    setFormData({
      ...formData,
      formas_pagamento: [...formData.formas_pagamento, novaForma],
      forma_pagamento: novaFormaPagamento.tipo,
    });
    
    setNovaFormaPagamento({ tipo: '', valor: '', parcelas: 1 });
    toast.success(`${novaFormaPagamento.tipo}: ${formatCurrency(valor)} adicionado`);
  };

  const handleRemoverFormaPagamento = (index) => {
    const novasFormas = formData.formas_pagamento.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      formas_pagamento: novasFormas,
      forma_pagamento: novasFormas.length > 0 ? novasFormas[0].tipo : '',
    });
  };

  const resetForm = () => {
    setFormData({
      pedido_id: '',
      cliente_id: '',
      items: [],
      forma_pagamento: '',
      formas_pagamento: [],
      parcelas: 1,
      entrega_posterior: false,
      data_previsao_pagamento: '',
      observacoes_pagamento: '',
      desconto_tipo: 'valor',
      desconto_valor: 0,
    });
    setNovaFormaPagamento({ tipo: '', valor: '', parcelas: 1 });
    setTipoVenda('pedido');
    setEtapaVendaDireta(1);
    setTipoEntregaPendente('imediata');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let formaPagamentoFinal = formData.forma_pagamento;
      let formasPagamentoFinal = formData.formas_pagamento;
      
      if (formasPagamentoFinal.length === 0 && !formData.entrega_posterior) {
        toast.error('Adicione pelo menos uma forma de pagamento');
        return;
      }
      
      if (formasPagamentoFinal.length === 1) {
        formaPagamentoFinal = formasPagamentoFinal[0].tipo;
        if (formasPagamentoFinal[0].tipo === 'Cartão de Crédito' && formasPagamentoFinal[0].parcelas > 1) {
          formaPagamentoFinal = `Crédito ${formasPagamentoFinal[0].parcelas}x`;
        }
      } else if (formasPagamentoFinal.length > 1) {
        formaPagamentoFinal = formasPagamentoFinal.map(fp => {
          let nome = fp.tipo;
          if (fp.tipo === 'Cartão de Crédito' && fp.parcelas > 1) {
            nome = `Crédito ${fp.parcelas}x`;
          }
          return `${nome}: ${formatCurrency(fp.valor)}`;
        }).join(' + ');
      }

      const subtotal = calcularSubtotalItens();
      const valorDesconto = formData.desconto_tipo === 'percentual' 
        ? (subtotal * (formData.desconto_valor || 0)) / 100 
        : (formData.desconto_valor || 0);
      const valorTotal = Math.max(0, subtotal - valorDesconto);

      if (tipoVenda === 'pedido') {
        const pedido = pedidosConcluidos.find(p => p.id === formData.pedido_id);
        if (!pedido) {
          toast.error('Selecione um pedido válido');
          return;
        }

        const payload = {
          pedido_id: formData.pedido_id,
          forma_pagamento: formaPagamentoFinal,
          formas_pagamento: formasPagamentoFinal,
          parcelas: formData.parcelas,
          entrega_posterior: formData.entrega_posterior,
          data_previsao_pagamento: formData.data_previsao_pagamento || null,
          observacoes_pagamento: formData.observacoes_pagamento,
          desconto_tipo: formData.desconto_valor > 0 ? formData.desconto_tipo : null,
          desconto_valor: formData.desconto_valor || 0,
          valor_desconto: valorDesconto,
        };
        
        await vendasAPI.criar(payload);
        toast.success('Venda registrada com sucesso!');
      } else {
        if (!formData.cliente_id) {
          toast.error('Selecione um cliente');
          return;
        }
        if (formData.items.length === 0) {
          toast.error('Adicione pelo menos um produto');
          return;
        }

        const temItemAProduzir = formData.items.some(item => item.tipo_entrega === 'a_produzir');
        
        const payload = {
          tipo_venda: 'direta',
          cliente_id: formData.cliente_id,
          items: formData.items.map(item => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            subtotal: item.subtotal,
            tipo_entrega: item.tipo_entrega || 'imediata',
            sabores: item.sabores || null,
          })),
          forma_pagamento: formaPagamentoFinal,
          formas_pagamento: formasPagamentoFinal,
          parcelas: formData.parcelas,
          entrega_posterior: formData.entrega_posterior,
          data_previsao_pagamento: formData.data_previsao_pagamento || null,
          observacoes_pagamento: formData.observacoes_pagamento,
          tem_itens_a_produzir: temItemAProduzir,
          desconto_tipo: formData.desconto_valor > 0 ? formData.desconto_tipo : null,
          desconto_valor: formData.desconto_valor || 0,
          valor_desconto: valorDesconto,
          valor_total: valorTotal,
        };
        
        await vendasAPI.criarDireta(payload);
        toast.success(temItemAProduzir 
          ? 'Venda registrada! Pedido de produção criado automaticamente.' 
          : 'Venda registrada com sucesso!');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar venda');
    }
  };

  // Handlers de venda
  const handleConfirmarPagamento = async (vendaId) => {
    if (!window.confirm('Confirmar recebimento do pagamento desta venda?')) return;
    try {
      await vendasAPI.confirmarPagamento(vendaId);
      toast.success('Pagamento confirmado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao confirmar pagamento');
    }
  };

  const handleCancelarVenda = async (venda) => {
    const motivo = window.prompt('Informe o motivo do cancelamento:');
    if (!motivo) return;
    try {
      await vendasAPI.cancelar(venda.id, motivo);
      toast.success('Venda cancelada');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar venda');
    }
  };

  const handleRestaurarVenda = async (venda) => {
    if (!window.confirm('Deseja restaurar esta venda?')) return;
    try {
      await vendasAPI.restaurar(venda.id);
      toast.success('Venda restaurada!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao restaurar venda');
    }
  };

  // Handlers de NFC-e
  const handleEmitirNFCe = (venda) => {
    setSelectedVendaForNFCe(venda);
    setPreviewNFCeOpen(true);
  };

  const handleConfirmarEmissaoNFCe = async () => {
    if (!selectedVendaForNFCe) return;
    setEmitindoNFCe(true);
    try {
      await nfceAPI.emitir(selectedVendaForNFCe.id);
      toast.success('NFC-e emitida com sucesso!');
      setPreviewNFCeOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao emitir NFC-e');
    } finally {
      setEmitindoNFCe(false);
    }
  };

  const handleVisualizarNFCe = (venda) => {
    setSelectedVendaForNFCe(venda);
    setViewNFCeOpen(true);
  };

  const imprimirCupom = (venda) => {
    window.print();
    toast.info('Função de impressão em desenvolvimento');
  };

  const handleCancelarNFCe = async (venda) => {
    const justificativa = window.prompt('Informe a justificativa do cancelamento (mín. 15 caracteres):');
    if (!justificativa || justificativa.length < 15) {
      toast.error('A justificativa deve ter no mínimo 15 caracteres');
      return;
    }
    try {
      await nfceAPI.cancelar(venda.id, justificativa);
      toast.success('NFC-e cancelada com sucesso');
      setViewNFCeOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar NFC-e');
    }
  };

  // Handler para adicionar produto com sabores
  const handleAddItemComSabores = (saboresSelecionados) => {
    if (!produtoPendenteSabores) return;
    
    const newItem = {
      produto_id: produtoPendenteSabores.id,
      produto_nome: produtoPendenteSabores.nome,
      quantidade: quantidadePendenteSabores,
      preco_unitario: produtoPendenteSabores.preco,
      subtotal: produtoPendenteSabores.preco * quantidadePendenteSabores,
      tipo_entrega: tipoEntregaPendente,
      sabores: saboresSelecionados,
    };
    
    setFormData({ ...formData, items: [...formData.items, newItem] });
    toast.success(`${produtoPendenteSabores.nome} (${formatarSabores(saboresSelecionados)}) adicionado`);
    setSaboresModalOpen(false);
    setProdutoPendenteSabores(null);
  };

  const handleAvancarParaRevisao = () => {
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }
    setEtapaVendaDireta(2);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

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
              {/* Seletor de tipo de venda */}
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
                    {pedidosConcluidos.map((pedido) => {
                      // Verificar se é um pedido com todos itens já entregues (do estoque)
                      const todosEntregues = pedido.items?.length > 0 && pedido.items.every(item => item.ja_entregue === true);
                      const statusLabel = todosEntregues ? '[Itens Entregues]' : '';
                      return (
                        <option key={pedido.id} value={pedido.id}>
                          {pedido.numero} - {pedido.cliente_nome} - {formatCurrency(pedido.valor_total)} {statusLabel}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-[#705A4D] mt-1">Pedidos concluídos, em embalagem, ou com todos itens já entregues</p>
                </div>
              ) : etapaVendaDireta === 1 ? (
                /* ETAPA 1: Montar a venda */
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#6B4423] text-white flex items-center justify-center text-sm font-bold">1</span>
                      <span className="text-sm font-medium text-[#6B4423]">Montar Venda</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#E8D5C4] rounded"></div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#E8D5C4] text-[#8B5A3C] flex items-center justify-center text-sm font-bold">2</span>
                      <span className="text-sm text-[#8B5A3C]">Revisar e Finalizar</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Cliente *</label>
                    <SearchableSelect
                      options={clientes.map(c => ({ id: c.id, label: c.nome, subtitle: c.telefone || c.email }))}
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
                      <h3 className="text-lg font-serif font-semibold text-[#3E2723]">Adicionar Produtos</h3>
                      <QuickCreateProdutoModal onProdutoCreated={(novoProduto) => setProdutos([...produtos, novoProduto])} />
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setTipoEntregaPendente('imediata')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                          tipoEntregaPendente === 'imediata'
                            ? 'border-[#22C55E] bg-[#22C55E]/10 text-[#16A34A]'
                            : 'border-[#8B5A3C]/30 text-[#705A4D] hover:border-[#8B5A3C]/50'
                        }`}
                      >
                        <ShoppingBag size={20} weight={tipoEntregaPendente === 'imediata' ? 'fill' : 'regular'} />
                        <span className="text-sm font-medium">Entrega Imediata</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoEntregaPendente('a_produzir')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                          tipoEntregaPendente === 'a_produzir'
                            ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#D97706]'
                            : 'border-[#8B5A3C]/30 text-[#705A4D] hover:border-[#8B5A3C]/50'
                        }`}
                      >
                        <Factory size={20} weight={tipoEntregaPendente === 'a_produzir' ? 'fill' : 'regular'} />
                        <span className="text-sm font-medium">A Produzir</span>
                      </button>
                    </div>
                    <p className="text-xs text-[#8B5A3C] mb-3">
                      {tipoEntregaPendente === 'imediata' 
                        ? 'Produto será retirado do estoque e entregue agora'
                        : 'Será criado um pedido de produção para entrega posterior'}
                    </p>
                    
                    <SearchableInput
                      options={produtos.map(p => ({
                        id: p.id, label: p.nome, subtitle: p.categoria, extra: formatCurrency(p.preco), preco: p.preco
                      }))}
                      onSelect={(produto) => {
                        const produtoCompleto = produtos.find(p => p.id === produto.id);
                        if (produtoCompleto) {
                          if (produtoPermiteMultiplosSabores(produtoCompleto.nome)) {
                            setProdutoPendenteSabores(produtoCompleto);
                            setQuantidadePendenteSabores(1);
                            setSaboresModalOpen(true);
                          } else {
                            const existente = formData.items.find(
                              item => item.produto_id === produtoCompleto.id && item.tipo_entrega === tipoEntregaPendente && !item.sabores
                            );
                            if (existente) {
                              const newItems = formData.items.map(item => 
                                item.produto_id === produtoCompleto.id && item.tipo_entrega === tipoEntregaPendente && !item.sabores
                                  ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.preco_unitario }
                                  : item
                              );
                              setFormData({ ...formData, items: newItems });
                              toast.success(`${produtoCompleto.nome} - quantidade aumentada`);
                            } else {
                              const newItem = {
                                produto_id: produtoCompleto.id,
                                produto_nome: produtoCompleto.nome,
                                quantidade: 1,
                                preco_unitario: produtoCompleto.preco,
                                subtotal: produtoCompleto.preco,
                                tipo_entrega: tipoEntregaPendente
                              };
                              setFormData({ ...formData, items: [...formData.items, newItem] });
                              toast.success(`${produtoCompleto.nome} adicionado`);
                            }
                          }
                        }
                      }}
                      placeholder="Buscar produto para adicionar..."
                      emptyMessage="Nenhum produto encontrado"
                    />

                    {/* Lista de itens */}
                    {formData.items.length > 0 && (
                      <div className="mt-4 bg-[#F5E6D3]/30 rounded-lg p-3 space-y-2">
                        {formData.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-[#3E2723]">{item.produto_nome}</p>
                              {item.sabores && (
                                <p className="text-xs text-[#705A4D]">Sabores: {formatarSabores(item.sabores)}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                  item.tipo_entrega === 'imediata' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {item.tipo_entrega === 'imediata' ? 'Imediata' : 'A Produzir'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantidade > 1) {
                                      const newItems = [...formData.items];
                                      newItems[index] = { ...item, quantidade: item.quantidade - 1, subtotal: (item.quantidade - 1) * item.preco_unitario };
                                      setFormData({ ...formData, items: newItems });
                                    }
                                  }}
                                  className="w-6 h-6 rounded bg-[#E8D5C4] text-[#6B4423] flex items-center justify-center hover:bg-[#D4C4B0]"
                                >-</button>
                                <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...formData.items];
                                    newItems[index] = { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.preco_unitario };
                                    setFormData({ ...formData, items: newItems });
                                  }}
                                  className="w-6 h-6 rounded bg-[#E8D5C4] text-[#6B4423] flex items-center justify-center hover:bg-[#D4C4B0]"
                                >+</button>
                              </div>
                              <span className="font-bold text-[#3E2723] min-w-[80px] text-right">{formatCurrency(item.subtotal)}</span>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) })}
                                className="text-red-500 hover:text-red-700 p-1"
                              >×</button>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t border-[#8B5A3C]/20">
                          <span className="font-medium text-[#6B4423]">Total:</span>
                          <span className="font-bold text-[#3E2723]">{formatCurrency(calcularSubtotalItens())}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end mt-4">
                      <Button type="button" onClick={handleAvancarParaRevisao} className="bg-[#6B4423] text-white hover:bg-[#8B5A3C]">
                        Avançar para Revisão
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* ETAPA 2: Revisar e Finalizar */
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center text-sm font-bold">✓</span>
                      <span className="text-sm text-[#22C55E]">Montar Venda</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#22C55E] rounded"></div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#6B4423] text-white flex items-center justify-center text-sm font-bold">2</span>
                      <span className="text-sm font-medium text-[#6B4423]">Revisar e Finalizar</span>
                    </div>
                  </div>

                  <div className="bg-[#F5E6D3]/30 rounded-lg p-4">
                    <h3 className="font-medium text-[#6B4423] mb-2">Resumo da Venda</h3>
                    <p className="text-sm text-[#705A4D]">
                      Cliente: <span className="font-medium text-[#3E2723]">
                        {clientes.find(c => c.id === formData.cliente_id)?.nome}
                      </span>
                    </p>
                    <p className="text-sm text-[#705A4D]">{formData.items.length} item(ns)</p>
                    <p className="text-lg font-bold text-[#3E2723] mt-2">{formatCurrency(calcularSubtotalItens())}</p>
                  </div>
                </>
              )}

              {/* Desconto - mostra na etapa 2 para venda direta OU para venda de pedido */}
              {((tipoVenda === 'direta' && etapaVendaDireta === 2) || (tipoVenda === 'pedido' && formData.pedido_id)) && (
                <DescontoSection
                  descontoTipo={formData.desconto_tipo}
                  descontoValor={formData.desconto_valor}
                  onDescontoTipoChange={(tipo) => setFormData({ ...formData, desconto_tipo: tipo, desconto_valor: 0, formas_pagamento: [] })}
                  onDescontoValorChange={(valor) => setFormData({ ...formData, desconto_valor: valor, formas_pagamento: [] })}
                  onLimparDesconto={() => setFormData({ ...formData, desconto_valor: 0, formas_pagamento: [] })}
                  calcularSubtotal={calcularSubtotalItens}
                  calcularValorDesconto={calcularValorDesconto}
                  calcularTotalComDesconto={calcularTotalComDesconto}
                />
              )}

              {/* Forma de pagamento */}
              {(tipoVenda === 'pedido' || etapaVendaDireta === 2) && (
                <>
                  <FormasPagamentoSection
                    formasPagamento={formData.formas_pagamento}
                    novaFormaPagamento={novaFormaPagamento}
                    onNovaFormaPagamentoChange={setNovaFormaPagamento}
                    onAdicionarFormaPagamento={handleAdicionarFormaPagamento}
                    onRemoverFormaPagamento={handleRemoverFormaPagamento}
                    calcularTotalFormasPagamento={calcularTotalFormasPagamento}
                    calcularRestantePagamento={calcularRestantePagamento}
                    entregaPosterior={formData.entrega_posterior}
                    dataPrevisaoPagamento={formData.data_previsao_pagamento}
                    observacoesPagamento={formData.observacoes_pagamento}
                    onEntregaPosteriorChange={(checked) => setFormData({ ...formData, entrega_posterior: checked })}
                    onDataPrevisaoChange={(date) => setFormData({ ...formData, data_previsao_pagamento: date })}
                    onObservacoesChange={(obs) => setFormData({ ...formData, observacoes_pagamento: obs })}
                  />

                  <div className="flex gap-3 justify-end pt-4">
                    {tipoVenda === 'direta' && etapaVendaDireta === 2 && (
                      <Button type="button" onClick={() => setEtapaVendaDireta(1)} variant="outline">
                        Voltar e Editar
                      </Button>
                    )}
                    <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#22C55E] text-white hover:bg-[#16A34A]">
                      Finalizar Venda
                    </Button>
                  </div>
                </>
              )}
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
            placeholder="Pesquisar por cliente, pedido, produto, forma de pagamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans placeholder:text-[#8B5A3C]/60"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C] hover:text-[#6B4423]">
              ✕
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-[#705A4D] mt-1">Encontrados: {filteredVendas.length} de {vendas.length} vendas</p>
        )}
      </div>

      {/* Tabela de Vendas */}
      <VendasTable
        vendas={sortedData}
        sortConfig={sortConfig}
        onSort={requestSort}
        onConfirmarPagamento={handleConfirmarPagamento}
        onEmitirNFCe={handleEmitirNFCe}
        onVisualizarNFCe={handleVisualizarNFCe}
        onImprimirCupom={imprimirCupom}
        onCancelarNFCe={handleCancelarNFCe}
        onCancelarVenda={handleCancelarVenda}
        onRestaurarVenda={handleRestaurarVenda}
      />

      {/* Modais de NFC-e */}
      <NFCePreviewModal
        open={previewNFCeOpen}
        onOpenChange={setPreviewNFCeOpen}
        venda={selectedVendaForNFCe}
        emitindo={emitindoNFCe}
        onConfirmarEmissao={handleConfirmarEmissaoNFCe}
      />

      <NFCeViewModal
        open={viewNFCeOpen}
        onOpenChange={setViewNFCeOpen}
        venda={selectedVendaForNFCe}
        onImprimir={imprimirCupom}
        onCancelar={handleCancelarNFCe}
      />

      {/* Modal de seleção de sabores */}
      <SelecionarSaboresModal
        open={saboresModalOpen}
        onOpenChange={setSaboresModalOpen}
        produto={produtoPendenteSabores}
        quantidade={quantidadePendenteSabores}
        onQuantidadeChange={setQuantidadePendenteSabores}
        onConfirm={handleAddItemComSabores}
        produtos={produtos}
      />
    </div>
  );
}
