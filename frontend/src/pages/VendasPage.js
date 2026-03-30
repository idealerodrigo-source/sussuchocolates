import React, { useEffect, useState, useMemo } from 'react';
import { vendasAPI, pedidosAPI, nfceAPI, clientesAPI, produtosAPI } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Plus, Receipt, Trash, MagnifyingGlass, X, ArrowCounterClockwise, Eye, Printer, XCircle, QrCode, UserPlus, Package, Factory, ShoppingBag } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { QuickCreateClienteModal, QuickCreateProdutoModal } from '../components/QuickCreateModals';
import { SearchableSelect, SearchableInput } from '../components/SearchableSelect';
import { SelecionarSaboresModal, produtoPermiteMultiplosSabores, formatarSabores } from '../components/SelecionarSaboresModal';
import { useSortableTable, SortableHeader } from '../hooks/useSortableTable';

export default function VendasPage() {
  const [vendas, setVendas] = useState([]);
  const [pedidosConcluidos, setPedidosConcluidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoVenda, setTipoVenda] = useState('pedido');
  const [searchTerm, setSearchTerm] = useState('');
  const [etapaVendaDireta, setEtapaVendaDireta] = useState(1); // 1 = montar, 2 = revisar/finalizar
  const [editandoItem, setEditandoItem] = useState(null); // índice do item sendo editado
  
  // Estado para modal de seleção de sabores
  const [saboresModalOpen, setSaboresModalOpen] = useState(false);
  const [produtoPendenteSabores, setProdutoPendenteSabores] = useState(null);
  const [quantidadePendenteSabores, setQuantidadePendenteSabores] = useState(1);
  const [tipoEntregaPendente, setTipoEntregaPendente] = useState('imediata'); // Para quando fechar o modal de sabores
  
  // Filtrar vendas pelo termo de pesquisa
  const filteredVendas = useMemo(() => {
    if (!searchTerm.trim()) return vendas;
    const term = searchTerm.toLowerCase();
    return vendas.filter(venda => {
      // Pesquisar por nome do cliente
      if (venda.cliente_nome?.toLowerCase().includes(term)) return true;
      // Pesquisar por forma de pagamento
      if (venda.forma_pagamento?.toLowerCase().includes(term)) return true;
      // Pesquisar por tipo de venda
      if (venda.tipo_venda?.toLowerCase().includes(term)) return true;
      // Pesquisar por número do pedido (se existir)
      if (venda.pedido_numero?.toLowerCase().includes(term)) return true;
      // Pesquisar por itens vendidos
      if (venda.items?.some(item => item.produto_nome?.toLowerCase().includes(term))) return true;
      // Pesquisar por status de pagamento
      if (venda.status_pagamento === 'pendente' && 'a receber'.includes(term)) return true;
      if (venda.status_pagamento === 'pago' && 'pago'.includes(term)) return true;
      // Pesquisar por status de venda
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
    formas_pagamento: [], // Múltiplas formas de pagamento
    parcelas: 1,
    entrega_posterior: false,
    data_previsao_pagamento: '',
    observacoes_pagamento: '',
  });
  const [itemTemp, setItemTemp] = useState({
    produto_id: '',
    quantidade: 1,
  });
  
  // Estado para nova forma de pagamento
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
      // Determinar forma de pagamento resumida para compatibilidade
      let formaPagamentoFinal = formData.forma_pagamento;
      let formasPagamentoFinal = formData.formas_pagamento;
      
      // Se tem múltiplas formas de pagamento, criar resumo
      if (formasPagamentoFinal && formasPagamentoFinal.length > 0) {
        formaPagamentoFinal = formasPagamentoFinal.map(fp => {
          if (fp.tipo === 'Cartão de Crédito' && fp.parcelas > 1) {
            return `${fp.tipo} ${fp.parcelas}x: ${formatCurrency(fp.valor)}`;
          }
          return `${fp.tipo}: ${formatCurrency(fp.valor)}`;
        }).join(' + ');
      } else if (formData.forma_pagamento === 'Cartão de Crédito' && formData.parcelas > 1) {
        formaPagamentoFinal = `Cartão de Crédito (${formData.parcelas}x)`;
      }
      
      if (tipoVenda === 'pedido') {
        await vendasAPI.criar({
          pedido_id: formData.pedido_id,
          forma_pagamento: formaPagamentoFinal,
          formas_pagamento: formasPagamentoFinal?.length > 0 ? formasPagamentoFinal : null,
          parcelas: formData.parcelas || 1,
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
        
        // Validar formas de pagamento
        const totalVenda = formData.items.reduce((acc, item) => acc + item.subtotal, 0);
        const totalPago = formData.formas_pagamento.reduce((acc, fp) => acc + fp.valor, 0);
        
        if (formData.formas_pagamento.length === 0) {
          toast.error('Adicione pelo menos uma forma de pagamento');
          return;
        }
        
        if (Math.abs(totalPago - totalVenda) > 0.01 && !formData.entrega_posterior) {
          toast.error(`O total dos pagamentos (${formatCurrency(totalPago)}) deve ser igual ao total da venda (${formatCurrency(totalVenda)})`);
          return;
        }
        
        // Separar itens por tipo de entrega
        const itensImediatos = formData.items.filter(item => item.tipo_entrega === 'imediata' || !item.tipo_entrega);
        const itensAProduzir = formData.items.filter(item => item.tipo_entrega === 'a_produzir');
        
        // Criar a venda com todos os itens (marcando o tipo de cada um)
        const vendaData = {
          cliente_id: formData.cliente_id,
          items: formData.items.map(item => ({
            ...item,
            tipo_entrega: item.tipo_entrega || 'imediata'
          })),
          forma_pagamento: formaPagamentoFinal,
          formas_pagamento: formasPagamentoFinal?.length > 0 ? formasPagamentoFinal : null,
          parcelas: formData.parcelas || 1,
          tipo_venda: 'direta',
          entrega_posterior: formData.entrega_posterior,
          status_pagamento: formData.entrega_posterior ? 'pendente' : 'pago',
          data_previsao_pagamento: formData.entrega_posterior ? formData.data_previsao_pagamento : null,
          observacoes_pagamento: formData.observacoes_pagamento || null,
          tem_itens_a_produzir: itensAProduzir.length > 0,
        };
        
        const vendaResponse = await vendasAPI.criar(vendaData);
        
        // Se houver itens a produzir, criar um pedido automaticamente
        if (itensAProduzir.length > 0) {
          try {
            const pedidoData = {
              cliente_id: formData.cliente_id,
              items: itensAProduzir.map(item => ({
                produto_id: item.produto_id,
                produto_nome: item.produto_nome,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                subtotal: item.subtotal,
                sabores: item.sabores || null
              })),
              observacoes: `Pedido gerado automaticamente pela venda. Itens para produção e entrega posterior.`,
              venda_vinculada_id: vendaResponse.data?.id,
              origem: 'venda_mista'
            };
            
            await pedidosAPI.criar(pedidoData);
            toast.success(`Venda registrada! Pedido de produção criado para ${itensAProduzir.length} item(ns).`, {
              duration: 5000
            });
          } catch (pedidoError) {
            console.error('Erro ao criar pedido:', pedidoError);
            toast.warning('Venda registrada, mas houve erro ao criar o pedido de produção. Crie manualmente.');
          }
        } else {
          toast.success('Venda registrada com sucesso');
        }
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar venda');
    }
  };

  const handleEmitirNFCe = async (venda) => {
    // Abrir modal de pré-visualização
    setSelectedVendaForNFCe(venda);
    setPreviewNFCeOpen(true);
  };

  const handleConfirmarEmissaoNFCe = async () => {
    if (!selectedVendaForNFCe) return;
    
    setEmitindoNFCe(true);
    try {
      const venda = selectedVendaForNFCe;
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
        forma_pagamento: venda.forma_pagamento?.toLowerCase().includes('dinheiro') ? '01' : 
                         venda.forma_pagamento?.toLowerCase().includes('crédito') ? '03' :
                         venda.forma_pagamento?.toLowerCase().includes('débito') ? '04' : 
                         venda.forma_pagamento?.toLowerCase().includes('pix') ? '17' : '01',
        valor_pago: venda.valor_total,
        valor_troco: 0
      };
      
      const response = await nfceAPI.emitir(dadosNFCe);
      
      if (response.data.success) {
        toast.success(`NFC-e ${response.data.numero_nfce} emitida com sucesso!`);
        setPreviewNFCeOpen(false);
        setSelectedVendaForNFCe(null);
        fetchData();
      } else {
        toast.error(response.data.message || 'Erro ao emitir NFC-e');
      }
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

  const handleCancelarNFCe = async (venda) => {
    const justificativa = window.prompt(
      `Cancelar NFC-e da venda de ${venda.cliente_nome}?\n\nDigite a justificativa do cancelamento (mínimo 15 caracteres):`
    );
    
    if (justificativa === null) return;
    
    if (justificativa.length < 15) {
      toast.error('A justificativa deve ter no mínimo 15 caracteres');
      return;
    }
    
    try {
      const response = await nfceAPI.cancelar(venda.nfce_chave, justificativa);
      if (response.data.success) {
        toast.success('NFC-e cancelada com sucesso!');
        fetchData();
      } else {
        toast.error(response.data.message || 'Erro ao cancelar NFC-e');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar NFC-e');
    }
  };

  const imprimirCupom = (venda) => {
    const printWindow = window.open('', '_blank');
    const cupomHTML = gerarCupomHTML(venda);
    printWindow.document.write(cupomHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const gerarCupomHTML = (venda) => {
    const dataVenda = new Date(venda.data_venda).toLocaleString('pt-BR');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cupom Fiscal - Sussu Chocolates</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 16px; margin: 0; }
          .header p { margin: 2px 0; font-size: 10px; }
          .items { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .item { margin: 5px 0; }
          .item-name { font-weight: bold; }
          .item-details { display: flex; justify-content: space-between; }
          .totals { margin-top: 10px; }
          .total-line { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-final { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          .nfce-info { background: #f5f5f5; padding: 8px; margin-top: 10px; font-size: 10px; }
          @media print { body { width: 100%; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SUSSU CHOCOLATES</h1>
          <p>CNPJ: 09.328.682/0001-30</p>
          <p>Jacarezinho - PR</p>
          <p>CUPOM FISCAL${venda.nfce_emitida ? ' - NFC-e' : ' (NÃO É DOCUMENTO FISCAL)'}</p>
        </div>
        
        <div class="items">
          <p><strong>Cliente:</strong> ${venda.cliente_nome}</p>
          <p><strong>Data:</strong> ${dataVenda}</p>
          <hr style="border: none; border-top: 1px dashed #000;">
          ${venda.items.map(item => `
            <div class="item">
              <div class="item-name">${item.produto_nome}</div>
              <div class="item-details">
                <span>${item.quantidade} x ${formatCurrency(item.preco_unitario)}</span>
                <span>${formatCurrency(item.subtotal)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(venda.valor_total)}</span>
          </div>
          <div class="total-line">
            <span>Desconto:</span>
            <span>R$ 0,00</span>
          </div>
          <div class="total-line total-final">
            <span>TOTAL:</span>
            <span>${formatCurrency(venda.valor_total)}</span>
          </div>
          <div class="total-line">
            <span>Pagamento:</span>
            <span>${venda.forma_pagamento}</span>
          </div>
        </div>
        
        ${venda.nfce_emitida ? `
          <div class="nfce-info">
            <p><strong>NFC-e Autorizada</strong></p>
            <p>Número: ${venda.nfce_numero || 'N/A'}</p>
            <p>Chave: ${venda.nfce_chave ? venda.nfce_chave.substring(0, 22) + '...' : 'N/A'}</p>
            <p>Consulte pelo QR Code ou em:</p>
            <p>www.sefaz.pr.gov.br/nfce</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Obrigado pela preferência!</p>
          <p>Sussu Chocolates - Doces momentos</p>
        </div>
      </body>
      </html>
    `;
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

  const handleCancelarVenda = async (venda) => {
    const motivo = window.prompt(
      `Cancelar venda de ${venda.cliente_nome}?\n\nOs itens serão devolvidos ao estoque.\n\nDigite o motivo do cancelamento (opcional):`
    );
    
    // Se o usuário clicou em "Cancelar" no prompt
    if (motivo === null) return;
    
    try {
      await vendasAPI.cancelar(venda.id, motivo || 'Cancelamento solicitado pelo cliente');
      toast.success('Venda cancelada! Itens devolvidos ao estoque.');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar venda');
    }
  };

  const handleRestaurarVenda = async (venda) => {
    const confirmar = window.confirm(
      `Restaurar venda de ${venda.cliente_nome}?\n\nOs itens serão removidos do estoque novamente.`
    );
    
    if (!confirmar) return;
    
    try {
      await vendasAPI.restaurar(venda.id);
      toast.success('Venda restaurada com sucesso!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao restaurar venda');
    }
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
    });
    setItemTemp({ produto_id: '', quantidade: 1 });
    setNovaFormaPagamento({ tipo: '', valor: '', parcelas: 1 });
    setTipoVenda('pedido');
    setEtapaVendaDireta(1);
    setEditandoItem(null);
  };

  // Funções para editar itens na revisão
  const handleEditarItem = (index) => {
    setEditandoItem(index);
  };

  const handleSalvarEdicaoItem = (index, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      handleRemoveItem(index);
    } else {
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        quantidade: novaQuantidade,
        subtotal: newItems[index].preco_unitario * novaQuantidade
      };
      setFormData({ ...formData, items: newItems });
    }
    setEditandoItem(null);
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

  const handleVoltarParaEdicao = () => {
    setEtapaVendaDireta(1);
  };

  // Funções para múltiplas formas de pagamento
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
    const totalVenda = formData.items.reduce((acc, item) => acc + item.subtotal, 0);
    
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
      forma_pagamento: novaFormaPagamento.tipo, // Atualiza a forma principal
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

  const calcularTotalFormasPagamento = () => {
    return formData.formas_pagamento.reduce((acc, fp) => acc + fp.valor, 0);
  };

  const calcularRestantePagamento = () => {
    const totalVenda = formData.items.reduce((acc, item) => acc + item.subtotal, 0);
    const totalPago = calcularTotalFormasPagamento();
    return totalVenda - totalPago;
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
              ) : etapaVendaDireta === 1 ? (
                /* ETAPA 1: Montar a venda */
                <>
                  {/* Indicador de etapa */}
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
                    <div className="flex gap-2">
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
                        className="flex-1"
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
                  </div>

                  <div className="border-t border-[#8B5A3C]/15 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-serif font-semibold text-[#3E2723]">Adicionar Produtos</h3>
                      <QuickCreateProdutoModal
                        onProdutoCreated={(novoProduto) => {
                          setProdutos([...produtos, novoProduto]);
                        }}
                      />
                    </div>
                    
                    {/* Seletor de tipo de entrega */}
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
                    
                    <div className="flex gap-3 mb-3">
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
                              setProdutoPendenteSabores(produtoCompleto);
                              setQuantidadePendenteSabores(1);
                              setSaboresModalOpen(true);
                            } else {
                              // Verificar se já existe item com mesmo produto E mesmo tipo de entrega
                              const existente = formData.items.find(
                                item => item.produto_id === produtoCompleto.id && 
                                        item.tipo_entrega === tipoEntregaPendente &&
                                        !item.sabores
                              );
                              if (existente) {
                                const newItems = formData.items.map(item => 
                                  item.produto_id === produtoCompleto.id && 
                                  item.tipo_entrega === tipoEntregaPendente &&
                                  !item.sabores
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
                                  tipo_entrega: tipoEntregaPendente // 'imediata' ou 'a_produzir'
                                };
                                setFormData({ ...formData, items: [...formData.items, newItem] });
                                toast.success(`${produtoCompleto.nome} adicionado (${tipoEntregaPendente === 'imediata' ? 'entrega imediata' : 'a produzir'})`);
                              }
                            }
                          }
                        }}
                        placeholder="Buscar produto para adicionar..."
                        emptyMessage="Nenhum produto encontrado"
                        className="flex-1"
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
                            sabores: sabores,
                            tipo_entrega: tipoEntregaPendente
                          };
                          setFormData({ ...formData, items: [...formData.items, newItem] });
                          toast.success(`${produtoPendenteSabores.nome} adicionado (${tipoEntregaPendente === 'imediata' ? 'entrega imediata' : 'a produzir'})`);
                          setProdutoPendenteSabores(null);
                        }
                      }}
                    />

                    {formData.items.length > 0 && (
                      <div className="space-y-4">
                        {/* Itens de entrega imediata */}
                        {formData.items.some(item => item.tipo_entrega === 'imediata' || !item.tipo_entrega) && (
                          <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <ShoppingBag size={20} className="text-[#16A34A]" weight="fill" />
                              <h4 className="font-medium text-[#16A34A]">Entrega Imediata (do estoque)</h4>
                            </div>
                            <div className="space-y-2">
                              {formData.items.filter(item => item.tipo_entrega === 'imediata' || !item.tipo_entrega).map((item, index) => {
                                const realIndex = formData.items.findIndex(i => i === item);
                                return (
                                  <div key={realIndex} className="flex items-center justify-between bg-white p-3 rounded-lg">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-[#3E2723]">{item.produto_nome}</p>
                                      {item.sabores && item.sabores.length > 0 && (
                                        <p className="text-xs text-[#6B4423] bg-[#F5E6D3] px-2 py-0.5 rounded inline-block mt-1">
                                          Sabores: {formatarSabores(item.sabores)}
                                        </p>
                                      )}
                                      <p className="text-xs text-[#705A4D] mt-1">
                                        {item.quantidade}x {formatCurrency(item.preco_unitario)} = {formatCurrency(item.subtotal)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        step="0.5"
                                        value={item.quantidade}
                                        onChange={(e) => {
                                          const qty = parseFloat(e.target.value) || 1;
                                          const newItems = formData.items.map((it, i) => 
                                            i === realIndex ? { ...it, quantidade: qty, subtotal: qty * it.preco_unitario } : it
                                          );
                                          setFormData({ ...formData, items: newItems });
                                        }}
                                        className="w-16 px-2 py-1 text-center bg-white border border-[#8B5A3C]/30 rounded-lg text-sm"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItem(realIndex)}
                                        className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg transition-colors"
                                      >
                                        <Trash size={18} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Itens a produzir */}
                        {formData.items.some(item => item.tipo_entrega === 'a_produzir') && (
                          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Factory size={20} className="text-[#D97706]" weight="fill" />
                              <h4 className="font-medium text-[#D97706]">A Produzir (pedido será criado)</h4>
                            </div>
                            <div className="space-y-2">
                              {formData.items.filter(item => item.tipo_entrega === 'a_produzir').map((item, index) => {
                                const realIndex = formData.items.findIndex(i => i === item);
                                return (
                                  <div key={realIndex} className="flex items-center justify-between bg-white p-3 rounded-lg">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-[#3E2723]">{item.produto_nome}</p>
                                      {item.sabores && item.sabores.length > 0 && (
                                        <p className="text-xs text-[#6B4423] bg-[#F5E6D3] px-2 py-0.5 rounded inline-block mt-1">
                                          Sabores: {formatarSabores(item.sabores)}
                                        </p>
                                      )}
                                      <p className="text-xs text-[#705A4D] mt-1">
                                        {item.quantidade}x {formatCurrency(item.preco_unitario)} = {formatCurrency(item.subtotal)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        step="0.5"
                                        value={item.quantidade}
                                        onChange={(e) => {
                                          const qty = parseFloat(e.target.value) || 1;
                                          const newItems = formData.items.map((it, i) => 
                                            i === realIndex ? { ...it, quantidade: qty, subtotal: qty * it.preco_unitario } : it
                                          );
                                          setFormData({ ...formData, items: newItems });
                                        }}
                                        className="w-16 px-2 py-1 text-center bg-white border border-[#8B5A3C]/30 rounded-lg text-sm"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItem(realIndex)}
                                        className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg transition-colors"
                                      >
                                        <Trash size={18} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-[#8B5A3C]/15 text-right">
                          <p className="text-lg font-serif font-bold text-[#3E2723]">
                            Total: {formatCurrency(totalVendaDireta)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botão para avançar para revisão */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-[#8B5A3C]/15">
                    <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                      Cancelar
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleAvancarParaRevisao}
                      className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                    >
                      Revisar Venda
                    </Button>
                  </div>
                </>
              ) : (
                /* ETAPA 2: Revisar e Finalizar */
                <>
                  {/* Indicador de etapa */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center text-sm font-bold">✓</span>
                      <span className="text-sm text-[#22C55E]">Montar Venda</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#6B4423] rounded"></div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#6B4423] text-white flex items-center justify-center text-sm font-bold">2</span>
                      <span className="text-sm font-medium text-[#6B4423]">Revisar e Finalizar</span>
                    </div>
                  </div>

                  {/* Resumo do Cliente */}
                  <div className="bg-[#E8D5C4]/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#8B5A3C] uppercase tracking-wide">Cliente</p>
                        <p className="text-lg font-semibold text-[#3E2723]">
                          {clientes.find(c => c.id === formData.cliente_id)?.nome || 'Cliente não selecionado'}
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleVoltarParaEdicao}
                        className="text-[#6B4423]"
                      >
                        Alterar
                      </Button>
                    </div>
                  </div>

                  {/* Itens da Venda - Editáveis */}
                  <div className="border border-[#8B5A3C]/20 rounded-lg overflow-hidden">
                    <div className="bg-[#E8D5C4] px-4 py-2 flex items-center justify-between">
                      <h3 className="font-semibold text-[#3E2723]">Itens da Venda</h3>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={handleVoltarParaEdicao}
                        className="text-[#6B4423] text-xs"
                      >
                        + Adicionar mais itens
                      </Button>
                    </div>
                    <div className="p-4 space-y-3">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-[#FFFDF8] p-3 rounded-lg border border-[#8B5A3C]/10">
                          <div className="flex-1">
                            <p className="font-medium text-[#3E2723]">{item.produto_nome}</p>
                            <p className="text-sm text-[#705A4D]">
                              {formatCurrency(item.preco_unitario)} / un
                            </p>
                          </div>
                          
                          {editandoItem === index ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                defaultValue={item.quantidade}
                                className="w-20 px-2 py-1 border border-[#6B4423] rounded text-center"
                                onBlur={(e) => handleSalvarEdicaoItem(index, parseInt(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSalvarEdicaoItem(index, parseInt(e.target.value) || 0);
                                  }
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleEditarItem(index)}
                                className="px-3 py-1 bg-[#F5E6D3] text-[#6B4423] rounded-lg text-sm font-medium hover:bg-[#E8D5C4] transition-colors"
                              >
                                {item.quantidade}x
                              </button>
                              <span className="font-semibold text-[#3E2723] min-w-[80px] text-right">
                                {formatCurrency(item.subtotal)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1.5 text-[#C53030] hover:bg-[#FED7D7] rounded-lg transition-colors"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <div className="pt-3 border-t border-[#8B5A3C]/15 flex justify-between items-center">
                        <span className="text-[#705A4D]">{formData.items.length} item(ns)</span>
                        <p className="text-xl font-serif font-bold text-[#3E2723]">
                          Total: {formatCurrency(totalVendaDireta)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Forma de pagamento - só mostra na etapa 2 para venda direta ou sempre para pedido */}
              {(tipoVenda === 'pedido' || etapaVendaDireta === 2) && (
                <>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-[#6B4423]">Formas de Pagamento *</label>
                  
                  {/* Lista de formas de pagamento adicionadas */}
                  {formData.formas_pagamento.length > 0 && (
                    <div className="bg-[#E8F5E9] rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-[#2F855A] mb-2">Pagamentos adicionados:</p>
                      {formData.formas_pagamento.map((fp, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg">
                          <div>
                            <span className="font-medium text-[#3E2723]">{fp.tipo}</span>
                            {fp.tipo === 'Cartão de Crédito' && fp.parcelas > 1 && (
                              <span className="text-xs text-[#705A4D] ml-1">({fp.parcelas}x)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#2F855A]">{formatCurrency(fp.valor)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoverFormaPagamento(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-[#2F855A]/20">
                        <span className="text-sm text-[#2F855A]">Total pago:</span>
                        <span className="font-bold text-[#2F855A]">{formatCurrency(calcularTotalFormasPagamento())}</span>
                      </div>
                      {calcularRestantePagamento() > 0.01 && (
                        <div className="flex justify-between text-orange-600">
                          <span className="text-sm">Restante:</span>
                          <span className="font-bold">{formatCurrency(calcularRestantePagamento())}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Adicionar nova forma de pagamento */}
                  <div className="bg-[#F5E6D3]/50 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-medium text-[#6B4423]">
                      {formData.formas_pagamento.length > 0 ? 'Adicionar outra forma:' : 'Adicionar forma de pagamento:'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={novaFormaPagamento.tipo}
                        onChange={(e) => setNovaFormaPagamento({ ...novaFormaPagamento, tipo: e.target.value, parcelas: 1 })}
                        className="px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-sm"
                      >
                        <option value="">Tipo...</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="PIX">PIX</option>
                        <option value="Boleto">Boleto</option>
                        <option value="A Prazo">A Prazo (Fiado)</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={`Valor (restante: ${formatCurrency(calcularRestantePagamento())})`}
                        value={novaFormaPagamento.valor}
                        onChange={(e) => setNovaFormaPagamento({ ...novaFormaPagamento, valor: e.target.value })}
                        className="px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-sm"
                      />
                      <Button
                        type="button"
                        onClick={handleAdicionarFormaPagamento}
                        className="bg-[#6B4423] text-white hover:bg-[#8B5A3C]"
                      >
                        <Plus size={16} className="mr-1" /> Adicionar
                      </Button>
                    </div>
                    
                    {/* Parcelas para Cartão de Crédito */}
                    {novaFormaPagamento.tipo === 'Cartão de Crédito' && (
                      <div className="bg-[#FFFDF8] rounded-lg p-3">
                        <label className="block text-xs font-medium text-[#6B4423] mb-2">Parcelas</label>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setNovaFormaPagamento({ ...novaFormaPagamento, parcelas: num })}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                novaFormaPagamento.parcelas === num
                                  ? 'bg-[#6B4423] text-white'
                                  : 'bg-[#F5E6D3] text-[#6B4423] hover:bg-[#E8D5C4]'
                              }`}
                            >
                              {num}x
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Botão para preencher valor restante automaticamente */}
                    {calcularRestantePagamento() > 0.01 && novaFormaPagamento.tipo && (
                      <button
                        type="button"
                        onClick={() => setNovaFormaPagamento({ ...novaFormaPagamento, valor: calcularRestantePagamento().toFixed(2) })}
                        className="text-xs text-[#6B4423] hover:underline"
                      >
                        Usar valor restante ({formatCurrency(calcularRestantePagamento())})
                      </button>
                    )}
                  </div>
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
                {tipoVenda === 'direta' && etapaVendaDireta === 2 && (
                  <Button type="button" onClick={handleVoltarParaEdicao} variant="outline">
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
          <MagnifyingGlass 
            size={20} 
            weight="bold" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C]" 
          />
          <input
            type="text"
            placeholder="Pesquisar por cliente, pedido, produto, forma de pagamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans placeholder:text-[#8B5A3C]/60"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C] hover:text-[#6B4423]"
            >
              ✕
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-[#705A4D] mt-1">
            Encontrados: {filteredVendas.length} de {vendas.length} vendas
          </p>
        )}
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
                <SortableHeader label="Status" sortKey="status_venda" sortConfig={sortConfig} onSort={requestSort} className="text-center" />
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
                  <tr key={venda.id} className={`border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50 ${venda.status_venda === 'cancelada' ? 'bg-red-50/50 opacity-75' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium inline-block w-fit ${
                          venda.tipo_venda === 'direta' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {venda.tipo_venda === 'direta' ? 'Direta' : 'Pedido'}
                        </span>
                        {venda.tem_itens_a_produzir && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#FEF3C7] text-[#D97706] inline-flex items-center gap-1 w-fit">
                            <Factory size={10} weight="fill" /> Produção
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{venda.cliente_nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(venda.data_venda)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{venda.forma_pagamento}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">
                      {formatCurrency(venda.valor_total)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {venda.status_venda === 'cancelada' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Cancelada
                          </span>
                          {venda.motivo_cancelamento && (
                            <span className="text-[10px] text-red-600 max-w-[120px] truncate" title={venda.motivo_cancelamento}>
                              {venda.motivo_cancelamento}
                            </span>
                          )}
                        </div>
                      ) : venda.status_pagamento === 'pendente' ? (
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
                    <td className="px-6 py-4 text-center">
                      {venda.nfce_emitida ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">
                          Emitida
                        </span>
                      ) : venda.status_venda === 'cancelada' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          -
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FEFCBF] text-[#D97706]">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {venda.status_venda !== 'cancelada' && (
                          <>
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
                                title="Pré-visualizar e Emitir NFC-e"
                              >
                                <Receipt size={16} weight="bold" className="mr-1" />
                                NFC-e
                              </Button>
                            )}
                            {venda.nfce_emitida && (
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => handleVisualizarNFCe(venda)}
                                  size="sm"
                                  variant="outline"
                                  className="text-[#6B4423] border-[#8B5A3C]/30 hover:bg-[#F5E6D3] text-xs"
                                  title="Visualizar NFC-e"
                                >
                                  <Eye size={16} weight="bold" />
                                </Button>
                                <Button
                                  onClick={() => imprimirCupom(venda)}
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                                  title="Imprimir Cupom"
                                >
                                  <Printer size={16} weight="bold" />
                                </Button>
                                <Button
                                  onClick={() => handleCancelarNFCe(venda)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                                  title="Cancelar NFC-e"
                                >
                                  <XCircle size={16} weight="bold" />
                                </Button>
                              </div>
                            )}
                            {!venda.nfce_emitida && (
                              <Button
                                onClick={() => handleCancelarVenda(venda)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                                title="Cancelar Venda"
                              >
                                <X size={16} weight="bold" className="mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </>
                        )}
                        {venda.status_venda === 'cancelada' && (
                          <Button
                            onClick={() => handleRestaurarVenda(venda)}
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                            title="Restaurar Venda"
                          >
                            <ArrowCounterClockwise size={16} weight="bold" className="mr-1" />
                            Restaurar
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

      {/* Modal de Pré-visualização NFC-e */}
      <Dialog open={previewNFCeOpen} onOpenChange={setPreviewNFCeOpen}>
        <DialogContent className="max-w-lg bg-[#FFFDF8]">
          <DialogHeader>
            <DialogTitle className="text-[#6B4423] font-serif flex items-center gap-2">
              <Receipt size={24} weight="bold" />
              Pré-visualização da NFC-e
            </DialogTitle>
          </DialogHeader>
          
          {selectedVendaForNFCe && (
            <div className="space-y-4">
              {/* Cabeçalho do Cupom */}
              <div className="bg-[#F5E6D3] rounded-lg p-4 text-center">
                <h3 className="font-serif font-bold text-[#6B4423]">SUSSU CHOCOLATES</h3>
                <p className="text-xs text-[#705A4D]">CNPJ: 09.328.682/0001-30</p>
                <p className="text-xs text-[#705A4D]">Jacarezinho - PR</p>
                <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                  NFC-e - HOMOLOGAÇÃO (Ambiente de Testes)
                </div>
              </div>

              {/* Dados do Cliente */}
              <div className="border-t border-[#8B5A3C]/20 pt-3">
                <p className="text-sm text-[#705A4D]">
                  <strong>Cliente:</strong> {selectedVendaForNFCe.cliente_nome}
                </p>
                <p className="text-sm text-[#705A4D]">
                  <strong>Data:</strong> {formatDateTime(selectedVendaForNFCe.data_venda)}
                </p>
              </div>

              {/* Itens */}
              <div className="border-t border-[#8B5A3C]/20 pt-3">
                <h4 className="text-sm font-semibold text-[#6B4423] mb-2">Itens:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {selectedVendaForNFCe.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-white rounded p-2">
                      <div>
                        <p className="font-medium text-[#3E2723]">{item.produto_nome}</p>
                        <p className="text-xs text-[#705A4D]">
                          {item.quantidade} x {formatCurrency(item.preco_unitario)}
                        </p>
                      </div>
                      <p className="font-medium text-[#3E2723]">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="border-t border-[#8B5A3C]/20 pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[#705A4D]">Subtotal:</span>
                  <span className="text-[#3E2723]">{formatCurrency(selectedVendaForNFCe.valor_total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#705A4D]">Desconto:</span>
                  <span className="text-[#3E2723]">R$ 0,00</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-[#8B5A3C]/30 pt-2 mt-2">
                  <span className="text-[#6B4423]">TOTAL:</span>
                  <span className="text-[#3E2723]">{formatCurrency(selectedVendaForNFCe.valor_total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#705A4D]">Pagamento:</span>
                  <span className="text-[#3E2723]">{selectedVendaForNFCe.forma_pagamento}</span>
                </div>
              </div>

              {/* Aviso */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <strong>Atenção:</strong> Ao confirmar, a NFC-e será enviada para autorização na SEFAZ. 
                Esta operação não pode ser desfeita facilmente.
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => setPreviewNFCeOpen(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={emitindoNFCe}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmarEmissaoNFCe}
                  className="flex-1 bg-[#2F855A] text-white hover:bg-[#276749]"
                  disabled={emitindoNFCe}
                >
                  {emitindoNFCe ? (
                    <>Emitindo...</>
                  ) : (
                    <>
                      <Receipt size={18} weight="bold" className="mr-2" />
                      Confirmar e Emitir
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização NFC-e Emitida */}
      <Dialog open={viewNFCeOpen} onOpenChange={setViewNFCeOpen}>
        <DialogContent className="max-w-lg bg-[#FFFDF8]">
          <DialogHeader>
            <DialogTitle className="text-[#6B4423] font-serif flex items-center gap-2">
              <QrCode size={24} weight="bold" />
              NFC-e Emitida
            </DialogTitle>
          </DialogHeader>
          
          {selectedVendaForNFCe && selectedVendaForNFCe.nfce_emitida && (
            <div className="space-y-4">
              {/* Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                  <Receipt size={20} weight="bold" />
                  NFC-e AUTORIZADA
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Documento fiscal válido
                </p>
              </div>

              {/* Dados da NFC-e */}
              <div className="bg-white rounded-lg p-4 space-y-3 border border-[#8B5A3C]/20">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#705A4D] text-xs">Número:</p>
                    <p className="font-semibold text-[#3E2723]">{selectedVendaForNFCe.nfce_numero || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[#705A4D] text-xs">Série:</p>
                    <p className="font-semibold text-[#3E2723]">001</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-[#705A4D] text-xs">Chave de Acesso:</p>
                  <p className="font-mono text-xs text-[#3E2723] break-all bg-gray-50 p-2 rounded">
                    {selectedVendaForNFCe.nfce_chave || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#705A4D] text-xs">Cliente:</p>
                    <p className="font-medium text-[#3E2723]">{selectedVendaForNFCe.cliente_nome}</p>
                  </div>
                  <div>
                    <p className="text-[#705A4D] text-xs">Valor Total:</p>
                    <p className="font-bold text-[#3E2723] text-lg">{formatCurrency(selectedVendaForNFCe.valor_total)}</p>
                  </div>
                </div>
              </div>

              {/* Itens Resumidos */}
              <div className="bg-[#F5E6D3]/50 rounded-lg p-3">
                <p className="text-xs text-[#705A4D] mb-2 font-medium">Itens ({selectedVendaForNFCe.items.length}):</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedVendaForNFCe.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-[#3E2723]">{item.produto_nome} x{item.quantidade}</span>
                      <span className="text-[#705A4D]">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consulta */}
              <div className="text-center text-xs text-[#705A4D] border-t border-[#8B5A3C]/20 pt-3">
                <p>Consulte a autenticidade em:</p>
                <p className="font-semibold text-[#6B4423]">www.sefaz.pr.gov.br/nfce</p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => imprimirCupom(selectedVendaForNFCe)}
                  variant="outline"
                  className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Printer size={18} weight="bold" className="mr-2" />
                  Imprimir
                </Button>
                <Button
                  onClick={() => handleCancelarNFCe(selectedVendaForNFCe)}
                  variant="outline"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircle size={18} weight="bold" className="mr-2" />
                  Cancelar NFC-e
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
