import React, { useEffect, useState } from 'react';
import { pedidosAPI, clientesAPI, produtosAPI } from '../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../utils/formatters';
import { Plus, ShoppingCart, Trash, PencilSimple, Eye, FilePdf, WhatsappLogo, UserPlus, Package } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { QuickCreateClienteModal, QuickCreateProdutoModal } from '../components/QuickCreateModals';
import { SearchableSelect, SearchableInput } from '../components/SearchableSelect';
import { SelecionarSaboresModal, produtoPermiteMultiplosSabores, formatarSabores } from '../components/SelecionarSaboresModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSortableTable, SortableHeader } from '../hooks/useSortableTable';

// Dados da empresa Sussu Chocolates
const EMPRESA = {
  nome: 'SUSSU CHOCOLATES',
  telefone: '(43) 99967-6206',
  endereco: 'Rua Quintino Bocaiuva, 737',
  cidade: 'Jacarezinho - PR',
  cep: '86400-000',
  email: 'sussuchocolates@hotmail.com'
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
  const { sortedData, requestSort, sortConfig } = useSortableTable(pedidos, { key: 'data_pedido', direction: 'desc' });
  
  // Estado para modal de seleção de sabores
  const [saboresModalOpen, setSaboresModalOpen] = useState(false);
  const [produtoPendenteSabores, setProdutoPendenteSabores] = useState(null);
  const [quantidadePendenteSabores, setQuantidadePendenteSabores] = useState(1);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    items: [],
    observacoes: '',
    data_entrega: '',
    forma_pagamento: '',
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
      if (editMode && editingPedidoId) {
        await pedidosAPI.atualizar(editingPedidoId, formData);
        toast.success('Pedido atualizado com sucesso');
      } else {
        await pedidosAPI.criar(formData);
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
    });
    setDialogOpen(true);
  };

  const handleView = (pedido) => {
    setViewingPedido(pedido);
    setViewDialogOpen(true);
  };

  const enviarWhatsApp = (pedido) => {
    // Buscar telefone do cliente
    const cliente = clientes.find(c => c.id === pedido.cliente_id);
    let telefone = cliente?.telefone || pedido.cliente_telefone;
    
    if (!telefone) {
      telefone = window.prompt('Informe o número de WhatsApp do cliente (com DDD):');
      if (!telefone) return;
    }
    
    // Formatar telefone (remover caracteres especiais)
    telefone = telefone.replace(/\D/g, '');
    if (!telefone.startsWith('55')) {
      telefone = '55' + telefone;
    }
    
    // Formatar data de entrega
    const dataEntrega = pedido.data_entrega 
      ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR')
      : 'A combinar';
    
    // Montar mensagem
    const itensTexto = pedido.items.map(item => 
      `  • ${item.produto_nome} - ${item.quantidade}x ${formatCurrency(item.preco_unitario)} = ${formatCurrency(item.subtotal)}`
    ).join('\n');
    
    const mensagem = `🍫 *SUSSU CHOCOLATES*
━━━━━━━━━━━━━━━━━

📋 *CONFIRMAÇÃO DE PEDIDO*
Nº: *${pedido.numero}*

👤 *Cliente:* ${pedido.cliente_nome}
📅 *Data:* ${new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
🚚 *Entrega:* ${dataEntrega}
${pedido.forma_pagamento ? `💳 *Pagamento:* ${pedido.forma_pagamento}` : ''}

━━━━━━━━━━━━━━━━━
📦 *ITENS DO PEDIDO:*
${itensTexto}
━━━━━━━━━━━━━━━━━

💰 *TOTAL: ${formatCurrency(pedido.valor_total)}*

${pedido.observacoes ? `📝 *Obs:* ${pedido.observacoes}` : ''}

✅ Pedido confirmado!
Obrigado pela preferência! 🙏

📍 Sussu Chocolates
📞 ${EMPRESA.telefone}`;

    // Abrir WhatsApp
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const generatePDF = async (pedido) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Cores da marca
    const marromEscuro = [62, 39, 35]; // #3E2723
    const marromMedio = [107, 68, 35]; // #6B4423
    const bege = [245, 230, 211]; // #F5E6D3
    
    // Carregar o logo
    let logoLoaded = false;
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = '/logo-sussu.png';
      });
      
      // Adicionar logo ao PDF
      const canvas = document.createElement('canvas');
      canvas.width = logoImg.width;
      canvas.height = logoImg.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(logoImg, 0, 0);
      const logoBase64 = canvas.toDataURL('image/png');
      
      // Fundo do cabeçalho
      doc.setFillColor(...bege);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Adicionar logo (proporção mantida)
      const logoWidth = 35;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      doc.addImage(logoBase64, 'PNG', 15, 5, logoWidth, logoHeight);
      logoLoaded = true;
    } catch (e) {
      console.log('Não foi possível carregar o logo, usando texto');
      // Fundo do cabeçalho sem logo
      doc.setFillColor(...bege);
      doc.rect(0, 0, pageWidth, 45, 'F');
    }
    
    // Dados da empresa (ao lado do logo ou no topo)
    const textStartX = logoLoaded ? 55 : 15;
    const headerHeight = logoLoaded ? 50 : 45;
    
    doc.setFontSize(logoLoaded ? 18 : 24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...marromEscuro);
    doc.text(EMPRESA.nome, textStartX, logoLoaded ? 15 : 18);
    
    // Linha decorativa
    doc.setDrawColor(...marromMedio);
    doc.setLineWidth(0.5);
    doc.line(textStartX, logoLoaded ? 19 : 22, pageWidth - 15, logoLoaded ? 19 : 22);
    
    // Dados da empresa
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...marromMedio);
    doc.text(`Tel: ${EMPRESA.telefone}`, textStartX, logoLoaded ? 25 : 28);
    doc.text(`${EMPRESA.endereco}, ${EMPRESA.cidade}`, textStartX, logoLoaded ? 30 : 33);
    doc.text(`CEP: ${EMPRESA.cep}`, textStartX, logoLoaded ? 35 : 38);
    doc.text(`Email: ${EMPRESA.email}`, textStartX, logoLoaded ? 40 : 43);
    
    // ===== DADOS DO PEDIDO =====
    doc.setFillColor(...marromMedio);
    doc.rect(0, headerHeight + 3, pageWidth, 10, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`PEDIDO Nº ${pedido.numero}`, 15, headerHeight + 10);
    
    const dataPedido = new Date(pedido.data_pedido).toLocaleDateString('pt-BR');
    doc.text(`Data: ${dataPedido}`, pageWidth - 50, headerHeight + 10);
    
    // ===== DADOS DO CLIENTE =====
    let yPos = headerHeight + 23;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...marromEscuro);
    doc.text('DADOS DO CLIENTE', 15, yPos);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Buscar dados completos do cliente
    const cliente = clientes.find(c => c.id === pedido.cliente_id);
    
    doc.text(`Nome: ${pedido.cliente_nome}`, 15, yPos);
    yPos += 5;
    
    if (cliente) {
      if (cliente.telefone) {
        doc.text(`Telefone: ${cliente.telefone}`, 15, yPos);
        yPos += 5;
      }
      if (cliente.email) {
        doc.text(`Email: ${cliente.email}`, 15, yPos);
        yPos += 5;
      }
      if (cliente.endereco) {
        doc.text(`Endereço: ${cliente.endereco}`, 15, yPos);
        yPos += 5;
      }
    }
    
    if (pedido.data_entrega) {
      const dataEntrega = new Date(pedido.data_entrega).toLocaleDateString('pt-BR');
      doc.setFont('helvetica', 'bold');
      doc.text(`Data de Entrega Prevista: ${dataEntrega}`, 15, yPos);
      yPos += 5;
    }
    
    yPos += 5;
    
    // ===== ITENS DO PEDIDO =====
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...marromEscuro);
    doc.text('ITENS DO PEDIDO', 15, yPos);
    yPos += 3;
    
    // Tabela de itens
    const tableData = pedido.items.map((item, index) => [
      index + 1,
      item.produto_nome,
      item.quantidade,
      formatCurrency(item.preco_unitario),
      formatCurrency(item.subtotal)
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Produto', 'Qtd', 'Preço Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: marromMedio,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        textColor: marromEscuro,
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [250, 245, 235]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 15, right: 15 }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // ===== TOTAL =====
    doc.setFillColor(...bege);
    doc.rect(pageWidth - 80, yPos - 5, 65, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...marromEscuro);
    doc.text('TOTAL:', pageWidth - 75, yPos + 3);
    doc.text(formatCurrency(pedido.valor_total), pageWidth - 20, yPos + 3, { align: 'right' });
    
    yPos += 15;
    
    // ===== OBSERVAÇÕES =====
    if (pedido.observacoes) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...marromEscuro);
      doc.text('OBSERVAÇÕES', 15, yPos);
      yPos += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const splitObs = doc.splitTextToSize(pedido.observacoes, pageWidth - 30);
      doc.text(splitObs, 15, yPos);
      yPos += splitObs.length * 5 + 5;
    }
    
    // ===== RODAPÉ =====
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...marromMedio);
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...marromMedio);
    doc.text('Obrigado pela preferência!', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(`${EMPRESA.nome} - Chocolates Artesanais`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Salvar o PDF
    doc.save(`Pedido_${pedido.numero}_${pedido.cliente_nome.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      items: [],
      observacoes: '',
      data_entrega: '',
      forma_pagamento: '',
    });
    setItemTemp({ produto_id: '', produto_busca: '', quantidade: 1, desconto: 0, tipo_desconto: 'percentual' });
    setEditMode(false);
    setEditingPedidoId(null);
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
                
                <div className="mb-3">
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
                          setQuantidadePendenteSabores(1);
                          setSaboresModalOpen(true);
                        } else {
                          // Adicionar normalmente
                          const existente = formData.items.find(item => item.produto_id === produtoCompleto.id && !item.sabores);
                          if (existente) {
                            const newItems = formData.items.map(item => 
                              item.produto_id === produtoCompleto.id && !item.sabores
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
                              subtotal: produtoCompleto.preco
                            };
                            setFormData({ ...formData, items: [...formData.items, newItem] });
                            toast.success(`${produtoCompleto.nome} adicionado`);
                          }
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
                
                {/* Modal de seleção de sabores */}
                <SelecionarSaboresModal
                  open={saboresModalOpen}
                  onOpenChange={setSaboresModalOpen}
                  produto={produtoPendenteSabores}
                  quantidade={quantidadePendenteSabores}
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
                            {item.quantidade}x {formatCurrency(item.preco_unitario)}
                            {item.valor_desconto > 0 && (
                              <span className="text-[#D97706] ml-1">
                                (-{item.tipo_desconto === 'percentual' ? `${item.desconto}%` : formatCurrency(item.desconto)})
                              </span>
                            )}
                            <span className="ml-1">= {formatCurrency(item.subtotal)}</span>
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
                        {getStatusLabel(pedido.status)}
                      </span>
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
                        >
                          <Eye size={16} weight="bold" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(pedido)}
                          size="sm"
                          className="bg-[#8B5A3C] text-white hover:bg-[#6B4423]"
                          title="Editar"
                        >
                          <PencilSimple size={16} weight="bold" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog para visualizar pedido */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-[#FFFDF8] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-[#3E2723]">
              Detalhes do Pedido {viewingPedido?.numero}
            </DialogTitle>
          </DialogHeader>
          {viewingPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#705A4D]">Cliente</p>
                  <p className="font-medium text-[#3E2723]">{viewingPedido.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingPedido.status)}`}>
                    {getStatusLabel(viewingPedido.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Data do Pedido</p>
                  <p className="font-medium text-[#3E2723]">{formatDateTime(viewingPedido.data_pedido)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Data de Entrega</p>
                  <p className="font-medium text-[#3E2723]">
                    {viewingPedido.data_entrega ? formatDateTime(viewingPedido.data_entrega) : 'Não definida'}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#8B5A3C]/15 pt-4">
                <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens do Pedido</h3>
                <div className="space-y-2">
                  {viewingPedido.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-[#F5E6D3]/50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-[#3E2723]">{item.produto_nome}</p>
                        <p className="text-sm text-[#705A4D]">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p>
                      </div>
                      <p className="font-medium text-[#3E2723]">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#8B5A3C]/15 flex justify-between">
                  <span className="text-lg font-serif font-bold text-[#3E2723]">Total</span>
                  <span className="text-lg font-serif font-bold text-[#6B4423]">{formatCurrency(viewingPedido.valor_total)}</span>
                </div>
              </div>

              {viewingPedido.observacoes && (
                <div className="border-t border-[#8B5A3C]/15 pt-4">
                  <p className="text-sm text-[#705A4D]">Observações</p>
                  <p className="text-[#3E2723]">{viewingPedido.observacoes}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onClick={() => enviarWhatsApp(viewingPedido)}
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <WhatsappLogo size={18} weight="bold" className="mr-2" />
                  Enviar WhatsApp
                </Button>
                <Button
                  onClick={() => generatePDF(viewingPedido)}
                  variant="outline"
                  className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
                >
                  <FilePdf size={18} weight="bold" className="mr-2" />
                  Gerar PDF
                </Button>
                <Button
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEdit(viewingPedido);
                  }}
                  className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                >
                  <PencilSimple size={18} weight="bold" className="mr-2" />
                  Editar Pedido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
