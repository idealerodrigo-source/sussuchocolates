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
  NFCeViewModal,
  ProdutosExtrasSection
} from '../components/vendas';
import CupomVendaModal from '../components/vendas/CupomVendaModal';

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
  
  // Estado para pesquisa de pedidos
  const [pesquisaPedido, setPesquisaPedido] = useState('');
  
  // Filtrar pedidos pelo termo de pesquisa
  const pedidosFiltrados = useMemo(() => {
    if (!pesquisaPedido.trim()) return pedidosConcluidos;
    const termo = pesquisaPedido.toLowerCase().trim();
    return pedidosConcluidos.filter(pedido => {
      const numero = (pedido.numero || '').toLowerCase();
      const cliente = (pedido.cliente_nome || '').toLowerCase();
      const cpf = (pedido.cliente_cpf || '').replace(/\D/g, '');
      const telefone = (pedido.cliente_telefone || '').replace(/\D/g, '');
      const termoLimpo = termo.replace(/\D/g, '');
      
      return numero.includes(termo) || 
             cliente.includes(termo) ||
             (termoLimpo && cpf.includes(termoLimpo)) ||
             (termoLimpo && telefone.includes(termoLimpo));
    });
  }, [pedidosConcluidos, pesquisaPedido]);

  // Estado para o modal de cupom
  const [cupomModalOpen, setCupomModalOpen] = useState(false);
  const [vendaParaCupom, setVendaParaCupom] = useState(null);

  // Quantidade inicial ao adicionar produto
  const [quantidadeInicial, setQuantidadeInicial] = useState(1);
  
  // Função para formatar quantidade
  const formatarQuantidade = (qtd) => {
    if (Number.isInteger(qtd)) return `${qtd}x`;
    return `${qtd.toFixed(1).replace('.', ',')}kg`;
  };
  
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
      // 2. OU pedidos onde TODOS os itens estão marcados como 'já entregue' OU 'já separado'
      const pedidosFinalizados = pedidosRes.data.filter((p) => {
        // Condição tradicional: status concluido ou em_embalagem
        if (p.status === 'concluido' || p.status === 'em_embalagem') {
          return true;
        }
        // Nova condição: todos os itens do pedido estão marcados como 'já entregue' ou 'já separado'
        if (p.items && p.items.length > 0) {
          const todosProntos = p.items.every(item => item.ja_entregue === true || item.ja_separado === true);
          if (todosProntos) {
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
      const valorPedido = pedidoSelecionado?.valor_total || 0;
      // Adicionar valor dos itens extras
      const valorExtras = formData.items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
      return valorPedido + valorExtras;
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

  // Calcular adiantamento do pedido (se existir)
  const calcularAdiantamentoPedido = () => {
    if (tipoVenda === 'pedido' && formData.pedido_id) {
      const pedidoSelecionado = pedidosConcluidos.find(p => p.id === formData.pedido_id);
      return pedidoSelecionado?.valor_pago || 0;
    }
    return 0;
  };

  // Calcular o saldo a pagar (total - adiantamento)
  const calcularSaldoAPagar = () => {
    const totalComDesconto = calcularTotalComDesconto();
    const adiantamento = calcularAdiantamentoPedido();
    return Math.max(0, totalComDesconto - adiantamento);
  };

  const calcularRestantePagamento = () => {
    const saldoAPagar = calcularSaldoAPagar();
    const totalPago = calcularTotalFormasPagamento();
    return Math.max(0, saldoAPagar - totalPago);
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
    const saldoAPagar = calcularSaldoAPagar(); // Usa saldo considerando adiantamento
    
    if (saldoAPagar <= 0) {
      toast.error('Este pedido já foi pago integralmente');
      return;
    }
    
    if (totalAtual + valor > saldoAPagar + 0.01) {
      toast.error(`O total das formas de pagamento não pode exceder ${formatCurrency(saldoAPagar)}`);
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
      
      // Calcular saldo a pagar considerando adiantamento
      const saldoAPagar = calcularSaldoAPagar();
      const totalPagoAgora = calcularTotalFormasPagamento();
      
      // Se há saldo a pagar e não há formas de pagamento E não é entrega posterior, exigir pagamento
      if (saldoAPagar > 0.01 && formasPagamentoFinal.length === 0 && !formData.entrega_posterior) {
        toast.error('Adicione pelo menos uma forma de pagamento para o saldo restante');
        return;
      }
      
      // Se o pedido já foi pago integralmente (saldo = 0), não precisa de forma de pagamento adicional
      if (saldoAPagar === 0) {
        // Marcar como já pago no pedido
        formaPagamentoFinal = 'Pago Antecipadamente';
        formasPagamentoFinal = []; // Não precisa adicionar formas de pagamento
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

      // Determinar status de pagamento:
      // - "pendente" se marcou entrega posterior OU se alguma forma de pagamento é "A Prazo"
      // - "pago" caso contrário
      const temPagamentoAPrazo = formasPagamentoFinal.some(fp => fp.tipo === 'A Prazo');
      const statusPagamento = (formData.entrega_posterior || temPagamentoAPrazo) ? 'pendente' : 'pago';

      if (tipoVenda === 'pedido') {
        const pedido = pedidosConcluidos.find(p => p.id === formData.pedido_id);
        if (!pedido) {
          toast.error('Selecione um pedido válido');
          return;
        }

        // Preparar itens extras (se houver)
        const itensExtras = formData.items.length > 0 ? formData.items.map(item => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
          tipo_entrega: item.tipo_entrega || 'imediata',
          sabores: item.sabores || null,
          is_extra: true, // Marcar como item extra
        })) : [];

        const payload = {
          pedido_id: formData.pedido_id,
          forma_pagamento: formaPagamentoFinal,
          formas_pagamento: formasPagamentoFinal,
          parcelas: formData.parcelas,
          entrega_posterior: formData.entrega_posterior,
          status_pagamento: statusPagamento,
          data_previsao_pagamento: formData.data_previsao_pagamento || null,
          observacoes_pagamento: formData.observacoes_pagamento,
          desconto_tipo: formData.desconto_valor > 0 ? formData.desconto_tipo : null,
          desconto_valor: formData.desconto_valor || 0,
          valor_desconto: valorDesconto,
          itens_extras: itensExtras, // Enviar itens extras
        };
        
        await vendasAPI.criar(payload);
        const msgSucesso = itensExtras.length > 0 
          ? `Venda registrada com ${itensExtras.length} produto(s) extra(s)!` 
          : 'Venda registrada com sucesso!';
        toast.success(msgSucesso);
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
            produto_nome: item.produto_nome,
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
          status_pagamento: statusPagamento,
          data_previsao_pagamento: formData.data_previsao_pagamento || null,
          observacoes_pagamento: formData.observacoes_pagamento,
          tem_itens_a_produzir: temItemAProduzir,
          desconto_tipo: formData.desconto_valor > 0 ? formData.desconto_tipo : null,
          desconto_valor: formData.desconto_valor || 0,
          valor_desconto: valorDesconto,
          valor_total: valorTotal,
        };
        
        await vendasAPI.criar(payload);
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
    setVendaParaCupom(venda);
    setCupomModalOpen(true);
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
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-2">Buscar Pedido *</label>
                    
                    {/* Campo de pesquisa */}
                    <div className="relative mb-3">
                      <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5A3C]" />
                      <input
                        type="text"
                        value={pesquisaPedido}
                        onChange={(e) => setPesquisaPedido(e.target.value)}
                        placeholder="Pesquisar por nome, CPF, telefone ou número do pedido..."
                        className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                      {pesquisaPedido && (
                        <button
                          type="button"
                          onClick={() => setPesquisaPedido('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B5A3C] hover:text-[#6B4423]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    
                    {/* Lista de pedidos filtrados */}
                    <div className="bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg max-h-64 overflow-y-auto">
                      {pedidosFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-[#705A4D]">
                          {pesquisaPedido ? 'Nenhum pedido encontrado' : 'Nenhum pedido disponível'}
                        </div>
                      ) : (
                        pedidosFiltrados.map((pedido) => {
                          const todosProntos = pedido.items?.length > 0 && pedido.items.every(item => item.ja_entregue === true || item.ja_separado === true);
                          const todosEntregues = pedido.items?.length > 0 && pedido.items.every(item => item.ja_entregue === true);
                          const isSelected = formData.pedido_id === pedido.id;
                          
                          return (
                            <button
                              key={pedido.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, pedido_id: pedido.id })}
                              className={`w-full p-3 text-left border-b border-[#8B5A3C]/10 last:border-0 transition-colors ${
                                isSelected 
                                  ? 'bg-[#6B4423]/10 border-l-4 border-l-[#6B4423]' 
                                  : 'hover:bg-[#F5E6D3]/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#3E2723]">{pedido.numero}</span>
                                    {todosEntregues && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Entregue</span>
                                    )}
                                    {todosProntos && !todosEntregues && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">Separado</span>
                                    )}
                                    {pedido.status_pagamento === 'pago' && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Pago</span>
                                    )}
                                    {pedido.status_pagamento === 'parcial' && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-700 rounded">Adiant.</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-[#705A4D]">{pedido.cliente_nome}</p>
                                  {pedido.cliente_cpf && (
                                    <p className="text-xs text-[#8B5A3C]">CPF: {pedido.cliente_cpf}</p>
                                  )}
                                  {pedido.localizacao_estoque && (
                                    <p className="text-xs text-blue-600 font-medium">📍 {pedido.localizacao_estoque}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-[#3E2723]">{formatCurrency(pedido.valor_total)}</p>
                                  {pedido.data_entrega && (
                                    <p className="text-xs text-[#705A4D]">
                                      {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    
                    <p className="text-xs text-[#705A4D] mt-2">
                      {pedidosFiltrados.length} pedido(s) encontrado(s) • Clique para selecionar
                    </p>
                  </div>

                  {/* RESUMO DO PEDIDO SELECIONADO */}
                  {formData.pedido_id && (() => {
                    const pedidoSelecionado = pedidosConcluidos.find(p => p.id === formData.pedido_id);
                    if (!pedidoSelecionado) return null;
                    
                    const itensEntregues = pedidoSelecionado.items?.filter(i => i.ja_entregue) || [];
                    const itensSeparados = pedidoSelecionado.items?.filter(i => i.ja_separado && !i.ja_entregue) || [];
                    const itensPendentes = pedidoSelecionado.items?.filter(i => !i.ja_entregue && !i.ja_separado) || [];
                    
                    const valorPago = pedidoSelecionado.valor_pago || 0;
                    const valorTotal = pedidoSelecionado.valor_total || 0;
                    const saldoRestante = valorTotal - valorPago;
                    
                    return (
                      <div className="bg-[#F5E6D3]/40 rounded-xl p-4 border border-[#8B5A3C]/20 space-y-4">
                        {/* Cabeçalho */}
                        <div className="flex items-center justify-between border-b border-[#8B5A3C]/20 pb-3">
                          <div>
                            <h3 className="text-lg font-serif font-bold text-[#3E2723]">
                              {pedidoSelecionado.numero}
                            </h3>
                            <p className="text-sm text-[#705A4D]">{pedidoSelecionado.cliente_nome}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-[#3E2723]">{formatCurrency(valorTotal)}</p>
                            <p className="text-xs text-[#705A4D]">
                              {pedidoSelecionado.data_entrega 
                                ? `Entrega: ${new Date(pedidoSelecionado.data_entrega).toLocaleDateString('pt-BR')}`
                                : 'Sem data de entrega'}
                            </p>
                          </div>
                        </div>

                        {/* Localização no Estoque */}
                        {pedidoSelecionado.localizacao_estoque && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                                <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"></path>
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-blue-600">📍 Localização no Estoque</p>
                              <p className="text-lg font-bold text-blue-800">{pedidoSelecionado.localizacao_estoque}</p>
                            </div>
                          </div>
                        )}

                        {/* Status de Pagamento */}
                        <div className="bg-white rounded-lg p-3 border border-[#8B5A3C]/10">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-[#6B4423]">💰 Pagamento</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              pedidoSelecionado.status_pagamento === 'pago' ? 'bg-green-100 text-green-700' :
                              pedidoSelecionado.status_pagamento === 'parcial' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {pedidoSelecionado.status_pagamento === 'pago' ? '✓ Pago Integralmente' :
                               pedidoSelecionado.status_pagamento === 'parcial' ? '◐ Adiantamento' : 
                               '○ Pendente'}
                            </span>
                          </div>
                          
                          {valorPago > 0 && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-[#705A4D]">Já pago:</span>
                                <span className="ml-1 font-semibold text-green-600">{formatCurrency(valorPago)}</span>
                                {pedidoSelecionado.pagamento_forma && (
                                  <span className="ml-1 text-xs text-[#8B5A3C]">
                                    ({pedidoSelecionado.pagamento_forma}
                                    {pedidoSelecionado.pagamento_parcelas > 1 && ` ${pedidoSelecionado.pagamento_parcelas}x`})
                                  </span>
                                )}
                              </div>
                              {saldoRestante > 0 && (
                                <div>
                                  <span className="text-[#705A4D]">Saldo restante:</span>
                                  <span className="ml-1 font-semibold text-[#D97706]">{formatCurrency(saldoRestante)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {valorPago === 0 && (
                            <p className="text-sm text-[#705A4D]">Nenhum pagamento registrado</p>
                          )}
                        </div>

                        {/* Itens do Pedido */}
                        <div className="bg-white rounded-lg p-3 border border-[#8B5A3C]/10">
                          <h4 className="text-sm font-semibold text-[#6B4423] mb-2">📦 Itens do Pedido</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {pedidoSelecionado.items?.map((item, idx) => (
                              <div key={idx} className={`flex items-center justify-between p-2 rounded ${
                                item.ja_entregue ? 'bg-green-50 border border-green-200' :
                                item.ja_separado ? 'bg-blue-50 border border-blue-200' :
                                'bg-gray-50 border border-gray-200'
                              }`}>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-[#3E2723]">{item.produto_nome}</p>
                                  {item.sabores && item.sabores.length > 0 && (
                                    <p className="text-xs text-[#8B5A3C]">
                                      {formatarSabores(item.sabores)}
                                    </p>
                                  )}
                                  <p className="text-xs text-[#705A4D]">
                                    {formatarQuantidade(item.quantidade)} × {formatCurrency(item.preco_unitario)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                    item.ja_entregue ? 'bg-green-500 text-white' :
                                    item.ja_separado ? 'bg-blue-500 text-white' :
                                    'bg-gray-400 text-white'
                                  }`}>
                                    {item.ja_entregue ? '✓ Entregue' : item.ja_separado ? '◎ Separado' : '○ Pendente'}
                                  </span>
                                  <span className="text-sm font-semibold text-[#3E2723]">{formatCurrency(item.subtotal)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Resumo de itens */}
                          <div className="mt-2 pt-2 border-t border-[#8B5A3C]/10 flex flex-wrap gap-2 text-xs">
                            {itensEntregues.length > 0 && (
                              <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                                ✓ {itensEntregues.length} entregue(s)
                              </span>
                            )}
                            {itensSeparados.length > 0 && (
                              <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">
                                ◎ {itensSeparados.length} separado(s)
                              </span>
                            )}
                            {itensPendentes.length > 0 && (
                              <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">
                                ○ {itensPendentes.length} pendente(s)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Observações */}
                        {pedidoSelecionado.observacoes && (
                          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                            <h4 className="text-sm font-semibold text-yellow-800 mb-1">📝 Observações</h4>
                            <p className="text-sm text-yellow-700">{pedidoSelecionado.observacoes}</p>
                          </div>
                        )}

                        {/* Informação sobre saldo */}
                        {saldoRestante > 0 && (
                          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                            <p className="text-sm text-orange-700">
                              <strong>⚠️ Atenção:</strong> Este pedido possui saldo de <strong>{formatCurrency(saldoRestante)}</strong> a receber na finalização.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* SEÇÃO DE PRODUTOS EXTRAS - Para vendas de pedido */}
                  {formData.pedido_id && (
                    <ProdutosExtrasSection
                      formData={formData}
                      setFormData={setFormData}
                      produtos={produtos}
                      setProdutos={setProdutos}
                      tipoEntregaPendente={tipoEntregaPendente}
                      setTipoEntregaPendente={setTipoEntregaPendente}
                      quantidadeInicial={quantidadeInicial}
                      setQuantidadeInicial={setQuantidadeInicial}
                      onSelectProduto={(produto) => {
                        const produtoCompleto = produtos.find(p => p.id === produto.id);
                        if (produtoCompleto) {
                          if (produtoPermiteMultiplosSabores(produtoCompleto.nome)) {
                            setProdutoPendenteSabores(produtoCompleto);
                            setQuantidadePendenteSabores(quantidadeInicial);
                            setSaboresModalOpen(true);
                          } else {
                            const newItem = {
                              produto_id: produtoCompleto.id,
                              produto_nome: produtoCompleto.nome,
                              quantidade: quantidadeInicial,
                              preco_unitario: produtoCompleto.preco,
                              subtotal: quantidadeInicial * produtoCompleto.preco,
                              tipo_entrega: tipoEntregaPendente
                            };
                            setFormData({ ...formData, items: [...formData.items, newItem] });
                            toast.success(`${produtoCompleto.nome} (extra) adicionado`);
                            setQuantidadeInicial(1);
                          }
                        }
                      }}
                      formatCurrency={formatCurrency}
                      formatarQuantidade={formatarQuantidade}
                    />
                  )}
                </>
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
                    
                    {/* Busca de produtos com campo de quantidade */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <SearchableInput
                          options={produtos.map(p => ({
                            id: p.id, label: p.nome, subtitle: p.categoria, extra: formatCurrency(p.preco), preco: p.preco
                          }))}
                          onSelect={(produto) => {
                            const produtoCompleto = produtos.find(p => p.id === produto.id);
                            if (produtoCompleto) {
                              if (produtoPermiteMultiplosSabores(produtoCompleto.nome)) {
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
                                  subtotal: quantidadeInicial * produtoCompleto.preco,
                                  tipo_entrega: tipoEntregaPendente
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
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-[#705A4D] mb-1">Qtd</label>
                        <div className="flex items-center gap-1 bg-[#F5E6D3] rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => setQuantidadeInicial(Math.max(0.1, Math.round((quantidadeInicial - 0.5) * 10) / 10))}
                            disabled={quantidadeInicial <= 0.1}
                            className="w-6 h-6 flex items-center justify-center rounded bg-[#FFFDF8] hover:bg-[#E8D5C4] disabled:opacity-50 text-[#6B4423] font-bold text-sm"
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
                            className="w-12 text-center bg-[#FFFDF8] border-0 text-[#3E2723] font-semibold text-sm rounded focus:ring-1 focus:ring-[#6B4423]"
                          />
                          <button
                            type="button"
                            onClick={() => setQuantidadeInicial(Math.round((quantidadeInicial + 0.5) * 10) / 10)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-[#6B4423] hover:bg-[#8B5A3C] text-white font-bold text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

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
                                    if (item.quantidade > 0.1) {
                                      const novaQtd = Math.round((item.quantidade - 0.5) * 10) / 10;
                                      const newItems = [...formData.items];
                                      newItems[index] = { ...item, quantidade: Math.max(0.1, novaQtd), subtotal: Math.max(0.1, novaQtd) * item.preco_unitario };
                                      setFormData({ ...formData, items: newItems });
                                    }
                                  }}
                                  className="w-6 h-6 rounded bg-[#E8D5C4] text-[#6B4423] flex items-center justify-center hover:bg-[#D4C4B0]"
                                >-</button>
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={item.quantidade}
                                  onChange={(e) => {
                                    const novaQtd = parseFloat(e.target.value) || 0.1;
                                    if (novaQtd >= 0.1) {
                                      const newItems = [...formData.items];
                                      newItems[index] = { ...item, quantidade: novaQtd, subtotal: novaQtd * item.preco_unitario };
                                      setFormData({ ...formData, items: newItems });
                                    }
                                  }}
                                  className="w-12 text-center text-sm font-medium bg-transparent border border-[#8B5A3C]/30 rounded"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const novaQtd = Math.round((item.quantidade + 0.5) * 10) / 10;
                                    const newItems = [...formData.items];
                                    newItems[index] = { ...item, quantidade: novaQtd, subtotal: novaQtd * item.preco_unitario };
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

                  {/* RESUMO COMPLETO DA VENDA DIRETA */}
                  <div className="bg-[#F5E6D3]/40 rounded-xl p-4 border border-[#8B5A3C]/20 space-y-4">
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between border-b border-[#8B5A3C]/20 pb-3">
                      <div>
                        <h3 className="text-lg font-serif font-bold text-[#3E2723]">Venda Direta</h3>
                        <p className="text-sm text-[#705A4D]">
                          {clientes.find(c => c.id === formData.cliente_id)?.nome}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#3E2723]">{formatCurrency(calcularSubtotalItens())}</p>
                        <p className="text-xs text-[#705A4D]">{formData.items.length} item(ns)</p>
                      </div>
                    </div>

                    {/* Itens da Venda */}
                    <div className="bg-white rounded-lg p-3 border border-[#8B5A3C]/10">
                      <h4 className="text-sm font-semibold text-[#6B4423] mb-2">📦 Itens da Venda</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {formData.items.map((item, idx) => (
                          <div key={idx} className={`flex items-center justify-between p-2 rounded ${
                            item.tipo_entrega === 'imediata' 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-yellow-50 border border-yellow-200'
                          }`}>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[#3E2723]">{item.produto_nome}</p>
                              {item.sabores && item.sabores.length > 0 && (
                                <p className="text-xs text-[#8B5A3C]">
                                  {formatarSabores(item.sabores)}
                                </p>
                              )}
                              <p className="text-xs text-[#705A4D]">
                                {formatarQuantidade(item.quantidade)} × {formatCurrency(item.preco_unitario)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                item.tipo_entrega === 'imediata' 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-yellow-500 text-white'
                              }`}>
                                {item.tipo_entrega === 'imediata' ? '✓ Imediata' : '⏱ A Produzir'}
                              </span>
                              <span className="text-sm font-semibold text-[#3E2723]">{formatCurrency(item.subtotal)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Resumo por tipo de entrega */}
                      {(() => {
                        const imediatos = formData.items.filter(i => i.tipo_entrega === 'imediata');
                        const aProduzir = formData.items.filter(i => i.tipo_entrega === 'a_produzir');
                        return (
                          <div className="mt-2 pt-2 border-t border-[#8B5A3C]/10 flex flex-wrap gap-2 text-xs">
                            {imediatos.length > 0 && (
                              <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                                ✓ {imediatos.length} entrega imediata
                              </span>
                            )}
                            {aProduzir.length > 0 && (
                              <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                                ⏱ {aProduzir.length} a produzir
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Aviso sobre itens a produzir */}
                    {formData.items.some(i => i.tipo_entrega === 'a_produzir') && (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <p className="text-sm text-yellow-700">
                          <strong>⏱ Atenção:</strong> Esta venda possui itens "A Produzir". Um pedido de produção será criado automaticamente.
                        </p>
                      </div>
                    )}
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
                  {/* Resumo do Cálculo - Adiantamento e Saldo */}
                  {tipoVenda === 'pedido' && formData.pedido_id && (() => {
                    const pedidoSelecionado = pedidosConcluidos.find(p => p.id === formData.pedido_id);
                    const adiantamento = calcularAdiantamentoPedido();
                    const totalComDesconto = calcularTotalComDesconto();
                    const saldoAPagar = calcularSaldoAPagar();
                    
                    return (
                      <div className="bg-gradient-to-r from-[#F5E6D3] to-[#E8D5C4] rounded-xl p-4 border border-[#8B5A3C]/30">
                        <h4 className="text-sm font-bold text-[#6B4423] mb-3 flex items-center gap-2">
                          💵 Resumo do Pagamento
                        </h4>
                        
                        <div className="space-y-2">
                          {/* Total do Pedido */}
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#705A4D]">Total do Pedido:</span>
                            <span className="font-semibold text-[#3E2723]">{formatCurrency(calcularSubtotalItens())}</span>
                          </div>
                          
                          {/* Desconto (se houver) */}
                          {formData.desconto_valor > 0 && (
                            <div className="flex justify-between items-center text-orange-600">
                              <span className="text-sm">Desconto:</span>
                              <span className="font-semibold">-{formatCurrency(calcularValorDesconto())}</span>
                            </div>
                          )}
                          
                          {/* Total com desconto (se houver desconto) */}
                          {formData.desconto_valor > 0 && (
                            <div className="flex justify-between items-center border-t border-[#8B5A3C]/20 pt-2">
                              <span className="text-sm text-[#705A4D]">Subtotal:</span>
                              <span className="font-semibold text-[#3E2723]">{formatCurrency(totalComDesconto)}</span>
                            </div>
                          )}
                          
                          {/* Adiantamento */}
                          {adiantamento > 0 && (
                            <div className="flex justify-between items-center bg-green-50 -mx-4 px-4 py-2 border-y border-green-200">
                              <div>
                                <span className="text-sm font-medium text-green-700">✓ Adiantamento Pago</span>
                                {pedidoSelecionado?.pagamento_forma && (
                                  <span className="text-xs text-green-600 ml-2">
                                    ({pedidoSelecionado.pagamento_forma})
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-green-700">-{formatCurrency(adiantamento)}</span>
                            </div>
                          )}
                          
                          {/* Saldo a Pagar */}
                          <div className={`flex justify-between items-center pt-2 ${adiantamento > 0 ? 'border-t border-[#8B5A3C]/20' : ''}`}>
                            <span className="text-base font-bold text-[#3E2723]">
                              {adiantamento > 0 ? '💰 Saldo a Pagar Agora:' : '💰 Total a Pagar:'}
                            </span>
                            <span className={`text-xl font-bold ${saldoAPagar > 0 ? 'text-[#D97706]' : 'text-green-600'}`}>
                              {formatCurrency(saldoAPagar)}
                            </span>
                          </div>
                          
                          {/* Aviso se já foi pago integralmente */}
                          {saldoAPagar === 0 && (
                            <div className="bg-green-100 rounded-lg p-2 mt-2 text-center">
                              <span className="text-sm font-medium text-green-700">
                                ✓ Pedido já pago integralmente! Apenas confirme a entrega.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <FormasPagamentoSection
                    formasPagamento={formData.formas_pagamento}
                    novaFormaPagamento={novaFormaPagamento}
                    onNovaFormaPagamentoChange={setNovaFormaPagamento}
                    onAdicionarFormaPagamento={handleAdicionarFormaPagamento}
                    onRemoverFormaPagamento={handleRemoverFormaPagamento}
                    calcularTotalFormasPagamento={calcularTotalFormasPagamento}
                    calcularRestantePagamento={calcularRestantePagamento}
                    calcularSaldoAPagar={calcularSaldoAPagar}
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

      {/* Modal de Cupom de Venda */}
      <CupomVendaModal
        open={cupomModalOpen}
        onClose={() => setCupomModalOpen(false)}
        venda={vendaParaCupom}
      />
    </div>
  );
}
