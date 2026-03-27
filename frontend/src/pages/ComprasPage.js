import React, { useEffect, useState } from 'react';
import { fornecedoresAPI, insumosAPI, comprasAPI, nfEntradaAPI } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { 
  Plus, Truck, Package, ShoppingCart, Trash, PencilSimple, 
  CheckCircle, XCircle, Buildings, Eye, FileText, Barcode, Code, Upload
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function ComprasPage() {
  const [activeTab, setActiveTab] = useState('fornecedores');
  const [fornecedores, setFornecedores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [nfEntradas, setNfEntradas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);
  const [insumoDialogOpen, setInsumoDialogOpen] = useState(false);
  const [compraDialogOpen, setCompraDialogOpen] = useState(false);
  const [viewCompraDialogOpen, setViewCompraDialogOpen] = useState(false);
  const [viewingCompra, setViewingCompra] = useState(null);
  const [nfDialogOpen, setNfDialogOpen] = useState(false);
  const [viewNfDialogOpen, setViewNfDialogOpen] = useState(false);
  const [viewingNf, setViewingNf] = useState(null);
  
  // NF Import mode
  const [nfImportMode, setNfImportMode] = useState('chave'); // 'chave', 'html', 'manual'
  const [nfHtmlContent, setNfHtmlContent] = useState('');
  const [nfChaveAcesso, setNfChaveAcesso] = useState('');
  const [parsingNf, setParsingNf] = useState(false);
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Forms
  const [fornecedorForm, setFornecedorForm] = useState({
    nome: '', cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', contato_nome: '', observacoes: ''
  });
  
  const [insumoForm, setInsumoForm] = useState({
    nome: '', descricao: '', categoria: '', unidade_medida: 'un', fornecedor_id: '', preco_unitario: '', estoque_minimo: '', estoque_atual: ''
  });
  
  const [compraForm, setCompraForm] = useState({
    fornecedor_id: '', items: [], data_entrega_prevista: '', observacoes: ''
  });
  
  const [nfForm, setNfForm] = useState({
    chave_acesso: '',
    numero_nf: '',
    serie: '',
    data_emissao: '',
    fornecedor_cnpj: '',
    fornecedor_nome: '',
    fornecedor_endereco: '',
    items: [],
    valor_produtos: 0,
    valor_frete: 0,
    valor_desconto: 0,
    valor_total: 0,
    observacoes: ''
  });
  
  const [nfItemTemp, setNfItemTemp] = useState({
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    unidade: 'UN'
  });
  
  const [itemTemp, setItemTemp] = useState({
    insumo_id: '', quantidade: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [fornecedoresRes, insumosRes, comprasRes, nfRes] = await Promise.all([
        fornecedoresAPI.listar(),
        insumosAPI.listar(),
        comprasAPI.listar(),
        nfEntradaAPI.listar()
      ]);
      setFornecedores(fornecedoresRes.data);
      setInsumos(insumosRes.data);
      setCompras(comprasRes.data);
      setNfEntradas(nfRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // ============ NF DE ENTRADA ============
  const handleParseChave = async () => {
    if (!nfChaveAcesso || nfChaveAcesso.replace(/\D/g, '').length !== 44) {
      toast.error('Chave de acesso deve conter 44 dígitos');
      return;
    }
    
    setParsingNf(true);
    try {
      const res = await nfEntradaAPI.parseChave(nfChaveAcesso.replace(/\D/g, ''));
      if (res.data.success) {
        setNfForm({
          ...nfForm,
          chave_acesso: res.data.data.chave_acesso,
          numero_nf: res.data.data.numero_nf,
          serie: res.data.data.serie,
          data_emissao: res.data.data.data_emissao,
          fornecedor_cnpj: res.data.data.cnpj,
        });
        toast.success('Dados da chave extraídos. Complete as informações manualmente.');
        setNfImportMode('manual');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao processar chave de acesso');
    } finally {
      setParsingNf(false);
    }
  };

  const handleParseHtml = async () => {
    if (!nfHtmlContent.trim()) {
      toast.error('Cole o HTML da página de consulta da NF-e');
      return;
    }
    
    setParsingNf(true);
    try {
      const res = await nfEntradaAPI.parseHtml(nfHtmlContent);
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setNfForm({
          chave_acesso: data.chave_acesso || '',
          numero_nf: data.numero_nf || '',
          serie: data.serie || '',
          data_emissao: data.data_emissao ? data.data_emissao.split('T')[0] : '',
          fornecedor_cnpj: data.fornecedor_cnpj || '',
          fornecedor_nome: data.fornecedor_nome || '',
          fornecedor_endereco: data.fornecedor_endereco || '',
          items: data.items || [],
          valor_produtos: data.valor_produtos || 0,
          valor_frete: data.valor_frete || 0,
          valor_desconto: data.valor_desconto || 0,
          valor_total: data.valor_total || 0,
          observacoes: ''
        });
        toast.success('Dados extraídos do HTML. Confira e complete as informações.');
        setNfImportMode('manual');
      } else {
        toast.error('Não foi possível extrair dados do HTML. Tente inserir manualmente.');
      }
    } catch (error) {
      toast.error('Erro ao processar HTML');
    } finally {
      setParsingNf(false);
    }
  };

  const handleAddNfItem = () => {
    if (!nfItemTemp.descricao || nfItemTemp.quantidade <= 0) {
      toast.error('Preencha descrição e quantidade');
      return;
    }
    
    const valorTotal = nfItemTemp.quantidade * nfItemTemp.valor_unitario;
    const newItem = {
      ...nfItemTemp,
      valor_total: valorTotal
    };
    
    const newItems = [...nfForm.items, newItem];
    const novoValorProdutos = newItems.reduce((sum, i) => sum + i.valor_total, 0);
    
    setNfForm({
      ...nfForm,
      items: newItems,
      valor_produtos: novoValorProdutos,
      valor_total: novoValorProdutos + nfForm.valor_frete - nfForm.valor_desconto
    });
    
    setNfItemTemp({ descricao: '', quantidade: 1, valor_unitario: 0, unidade: 'UN' });
  };

  const handleRemoveNfItem = (index) => {
    const newItems = nfForm.items.filter((_, i) => i !== index);
    const novoValorProdutos = newItems.reduce((sum, i) => sum + i.valor_total, 0);
    
    setNfForm({
      ...nfForm,
      items: newItems,
      valor_produtos: novoValorProdutos,
      valor_total: novoValorProdutos + nfForm.valor_frete - nfForm.valor_desconto
    });
  };

  const handleNfSubmit = async (e) => {
    e.preventDefault();
    
    if (!nfForm.chave_acesso || nfForm.chave_acesso.length !== 44) {
      toast.error('Chave de acesso inválida');
      return;
    }
    
    if (nfForm.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }
    
    try {
      await nfEntradaAPI.criar(nfForm);
      toast.success('NF-e registrada com sucesso');
      setNfDialogOpen(false);
      resetNfForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar NF-e');
    }
  };

  const handleDeleteNf = async (id) => {
    if (window.confirm('Deseja realmente excluir esta NF-e?')) {
      try {
        await nfEntradaAPI.deletar(id);
        toast.success('NF-e removida');
        fetchData();
      } catch (error) {
        toast.error('Erro ao remover NF-e');
      }
    }
  };

  const handleViewNf = (nf) => {
    setViewingNf(nf);
    setViewNfDialogOpen(true);
  };

  const resetNfForm = () => {
    setNfForm({
      chave_acesso: '',
      numero_nf: '',
      serie: '',
      data_emissao: '',
      fornecedor_cnpj: '',
      fornecedor_nome: '',
      fornecedor_endereco: '',
      items: [],
      valor_produtos: 0,
      valor_frete: 0,
      valor_desconto: 0,
      valor_total: 0,
      observacoes: ''
    });
    setNfChaveAcesso('');
    setNfHtmlContent('');
    setNfImportMode('chave');
    setNfItemTemp({ descricao: '', quantidade: 1, valor_unitario: 0, unidade: 'UN' });
  };

  // ============ FORNECEDORES ============
  const handleFornecedorSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await fornecedoresAPI.atualizar(editingId, fornecedorForm);
        toast.success('Fornecedor atualizado com sucesso');
      } else {
        await fornecedoresAPI.criar(fornecedorForm);
        toast.success('Fornecedor cadastrado com sucesso');
      }
      setFornecedorDialogOpen(false);
      resetFornecedorForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar fornecedor');
    }
  };

  const handleEditFornecedor = (fornecedor) => {
    setEditMode(true);
    setEditingId(fornecedor.id);
    setFornecedorForm({
      nome: fornecedor.nome || '',
      cnpj: fornecedor.cnpj || '',
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      endereco: fornecedor.endereco || '',
      cidade: fornecedor.cidade || '',
      estado: fornecedor.estado || '',
      contato_nome: fornecedor.contato_nome || '',
      observacoes: fornecedor.observacoes || ''
    });
    setFornecedorDialogOpen(true);
  };

  const handleDeleteFornecedor = async (id) => {
    if (window.confirm('Deseja realmente excluir este fornecedor?')) {
      try {
        await fornecedoresAPI.deletar(id);
        toast.success('Fornecedor removido');
        fetchData();
      } catch (error) {
        toast.error('Erro ao remover fornecedor');
      }
    }
  };

  const resetFornecedorForm = () => {
    setFornecedorForm({
      nome: '', cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', contato_nome: '', observacoes: ''
    });
    setEditMode(false);
    setEditingId(null);
  };

  // ============ INSUMOS ============
  const handleInsumoSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...insumoForm,
        preco_unitario: parseFloat(insumoForm.preco_unitario) || 0,
        estoque_minimo: parseFloat(insumoForm.estoque_minimo) || 0,
        estoque_atual: parseFloat(insumoForm.estoque_atual) || 0
      };
      
      if (editMode) {
        await insumosAPI.atualizar(editingId, data);
        toast.success('Insumo atualizado com sucesso');
      } else {
        await insumosAPI.criar(data);
        toast.success('Insumo cadastrado com sucesso');
      }
      setInsumoDialogOpen(false);
      resetInsumoForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar insumo');
    }
  };

  const handleEditInsumo = (insumo) => {
    setEditMode(true);
    setEditingId(insumo.id);
    setInsumoForm({
      nome: insumo.nome || '',
      descricao: insumo.descricao || '',
      categoria: insumo.categoria || '',
      unidade_medida: insumo.unidade_medida || 'un',
      fornecedor_id: insumo.fornecedor_id || '',
      preco_unitario: insumo.preco_unitario?.toString() || '',
      estoque_minimo: insumo.estoque_minimo?.toString() || '',
      estoque_atual: insumo.estoque_atual?.toString() || ''
    });
    setInsumoDialogOpen(true);
  };

  const handleDeleteInsumo = async (id) => {
    if (window.confirm('Deseja realmente excluir este insumo?')) {
      try {
        await insumosAPI.deletar(id);
        toast.success('Insumo removido');
        fetchData();
      } catch (error) {
        toast.error('Erro ao remover insumo');
      }
    }
  };

  const resetInsumoForm = () => {
    setInsumoForm({
      nome: '', descricao: '', categoria: '', unidade_medida: 'un', fornecedor_id: '', preco_unitario: '', estoque_minimo: '', estoque_atual: ''
    });
    setEditMode(false);
    setEditingId(null);
  };

  // ============ COMPRAS ============
  const handleAddItemCompra = () => {
    if (!itemTemp.insumo_id || itemTemp.quantidade <= 0) {
      toast.error('Selecione um insumo e quantidade válida');
      return;
    }
    
    const insumo = insumos.find(i => i.id === itemTemp.insumo_id);
    const subtotal = insumo.preco_unitario * itemTemp.quantidade;
    
    const newItem = {
      insumo_id: insumo.id,
      insumo_nome: insumo.nome,
      quantidade: itemTemp.quantidade,
      preco_unitario: insumo.preco_unitario,
      subtotal: subtotal
    };
    
    setCompraForm({
      ...compraForm,
      items: [...compraForm.items, newItem]
    });
    setItemTemp({ insumo_id: '', quantidade: 1 });
  };

  const handleRemoveItemCompra = (index) => {
    const newItems = compraForm.items.filter((_, i) => i !== index);
    setCompraForm({ ...compraForm, items: newItems });
  };

  const handleCompraSubmit = async (e) => {
    e.preventDefault();
    if (compraForm.items.length === 0) {
      toast.error('Adicione pelo menos um item à compra');
      return;
    }
    
    try {
      await comprasAPI.criar(compraForm);
      toast.success('Pedido de compra criado com sucesso');
      setCompraDialogOpen(false);
      resetCompraForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar pedido de compra');
    }
  };

  const handleStatusCompra = async (compraId, status) => {
    try {
      await comprasAPI.atualizarStatus(compraId, status);
      toast.success(`Compra ${status === 'recebida' ? 'recebida e estoque atualizado' : 'atualizada'}`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleViewCompra = (compra) => {
    setViewingCompra(compra);
    setViewCompraDialogOpen(true);
  };

  const resetCompraForm = () => {
    setCompraForm({
      fornecedor_id: '', items: [], data_entrega_prevista: '', observacoes: ''
    });
    setItemTemp({ insumo_id: '', quantidade: 1 });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente': return 'bg-[#FEFCBF] text-[#D97706]';
      case 'aprovada': return 'bg-[#DBEAFE] text-[#1E40AF]';
      case 'recebida': return 'bg-[#C6F6D5] text-[#2F855A]';
      case 'cancelada': return 'bg-[#FED7D7] text-[#C53030]';
      case 'registrada': return 'bg-[#C6F6D5] text-[#2F855A]';
      case 'conferida': return 'bg-[#DBEAFE] text-[#1E40AF]';
      case 'estornada': return 'bg-[#FED7D7] text-[#C53030]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'aprovada': return 'Aprovada';
      case 'recebida': return 'Recebida';
      case 'cancelada': return 'Cancelada';
      case 'registrada': return 'Registrada';
      case 'conferida': return 'Conferida';
      case 'estornada': return 'Estornada';
      default: return status;
    }
  };

  const totalCompra = compraForm.items.reduce((sum, item) => sum + item.subtotal, 0);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  return (
    <div data-testid="compras-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Compras</h1>
          <p className="text-base font-sans text-[#705A4D]">Gerencie fornecedores, insumos, pedidos de compra e NF de entrada</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 border-b border-[#8B5A3C]/15 overflow-x-auto">
          <button
            onClick={() => setActiveTab('fornecedores')}
            className={`px-4 py-3 font-sans font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'fornecedores'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <Buildings size={18} weight="bold" />
            Fornecedores
          </button>
          <button
            onClick={() => setActiveTab('insumos')}
            className={`px-4 py-3 font-sans font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'insumos'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <Package size={18} weight="bold" />
            Insumos
          </button>
          <button
            onClick={() => setActiveTab('compras')}
            className={`px-4 py-3 font-sans font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'compras'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <ShoppingCart size={18} weight="bold" />
            Pedidos de Compra
          </button>
          <button
            onClick={() => setActiveTab('nf-entrada')}
            className={`px-4 py-3 font-sans font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'nf-entrada'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <FileText size={18} weight="bold" />
            NF de Entrada
          </button>
        </div>
      </div>

      {/* TAB: NF DE ENTRADA */}
      {activeTab === 'nf-entrada' && (
        <>
          <div className="flex justify-end mb-4">
            <Dialog open={nfDialogOpen} onOpenChange={(open) => { setNfDialogOpen(open); if (!open) resetNfForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <Plus size={20} weight="bold" className="mr-2" />
                  Nova NF de Entrada
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FFFDF8] max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif text-[#3E2723]">Registrar NF de Entrada</DialogTitle>
                </DialogHeader>
                
                {/* Seletor de modo de importação */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setNfImportMode('chave')}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      nfImportMode === 'chave'
                        ? 'border-[#6B4423] bg-[#F5E6D3]'
                        : 'border-[#8B5A3C]/30 hover:border-[#8B5A3C]/50'
                    }`}
                  >
                    <Barcode size={24} className={nfImportMode === 'chave' ? 'text-[#6B4423]' : 'text-[#705A4D]'} weight="bold" />
                    <span className={`text-sm font-medium ${nfImportMode === 'chave' ? 'text-[#6B4423]' : 'text-[#705A4D]'}`}>
                      Chave de Acesso
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNfImportMode('html')}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      nfImportMode === 'html'
                        ? 'border-[#6B4423] bg-[#F5E6D3]'
                        : 'border-[#8B5A3C]/30 hover:border-[#8B5A3C]/50'
                    }`}
                  >
                    <Code size={24} className={nfImportMode === 'html' ? 'text-[#6B4423]' : 'text-[#705A4D]'} weight="bold" />
                    <span className={`text-sm font-medium ${nfImportMode === 'html' ? 'text-[#6B4423]' : 'text-[#705A4D]'}`}>
                      Importar HTML
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNfImportMode('manual')}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      nfImportMode === 'manual'
                        ? 'border-[#6B4423] bg-[#F5E6D3]'
                        : 'border-[#8B5A3C]/30 hover:border-[#8B5A3C]/50'
                    }`}
                  >
                    <PencilSimple size={24} className={nfImportMode === 'manual' ? 'text-[#6B4423]' : 'text-[#705A4D]'} weight="bold" />
                    <span className={`text-sm font-medium ${nfImportMode === 'manual' ? 'text-[#6B4423]' : 'text-[#705A4D]'}`}>
                      Manual
                    </span>
                  </button>
                </div>

                {/* Importação por Chave de Acesso */}
                {nfImportMode === 'chave' && (
                  <div className="space-y-4">
                    <div className="bg-[#FEF3C7] border border-[#D97706]/30 rounded-lg p-4">
                      <p className="text-sm text-[#92400E] font-sans">
                        Digite a chave de acesso de 44 dígitos da NF-e (encontrada na DANFE ou no portal da Fazenda).
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Chave de Acesso (44 dígitos)</label>
                      <input
                        type="text"
                        placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                        value={nfChaveAcesso}
                        onChange={(e) => setNfChaveAcesso(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-mono"
                      />
                      <p className="text-xs text-[#705A4D] mt-1">{nfChaveAcesso.replace(/\D/g, '').length}/44 dígitos</p>
                    </div>
                    <Button 
                      onClick={handleParseChave} 
                      disabled={parsingNf}
                      className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                    >
                      {parsingNf ? 'Processando...' : 'Processar Chave'}
                    </Button>
                  </div>
                )}

                {/* Importação por HTML */}
                {nfImportMode === 'html' && (
                  <div className="space-y-4">
                    <div className="bg-[#DBEAFE] border border-[#1E40AF]/30 rounded-lg p-4">
                      <p className="text-sm text-[#1E40AF] font-sans mb-2">
                        <strong>Como obter o HTML:</strong>
                      </p>
                      <ol className="text-sm text-[#1E40AF] font-sans list-decimal list-inside space-y-1">
                        <li>Acesse <a href="https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx" target="_blank" rel="noopener noreferrer" className="underline">www.nfe.fazenda.gov.br</a></li>
                        <li>Consulte a NF-e pela chave de acesso</li>
                        <li>Na página de resultado, pressione Ctrl+A (selecionar tudo) e depois Ctrl+C (copiar)</li>
                        <li>Cole o conteúdo no campo abaixo</li>
                      </ol>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Cole o HTML da consulta</label>
                      <textarea
                        placeholder="Cole aqui o conteúdo da página de consulta da NF-e..."
                        value={nfHtmlContent}
                        onChange={(e) => setNfHtmlContent(e.target.value)}
                        rows="8"
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-mono text-xs"
                      />
                    </div>
                    <Button 
                      onClick={handleParseHtml} 
                      disabled={parsingNf}
                      className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                    >
                      <Upload size={18} weight="bold" className="mr-2" />
                      {parsingNf ? 'Processando...' : 'Importar Dados'}
                    </Button>
                  </div>
                )}

                {/* Formulário Manual */}
                {nfImportMode === 'manual' && (
                  <form onSubmit={handleNfSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Chave de Acesso (44 dígitos) *</label>
                        <input
                          type="text"
                          required
                          value={nfForm.chave_acesso}
                          onChange={(e) => setNfForm({ ...nfForm, chave_acesso: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Número da NF *</label>
                        <input
                          type="text"
                          required
                          value={nfForm.numero_nf}
                          onChange={(e) => setNfForm({ ...nfForm, numero_nf: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Série</label>
                        <input
                          type="text"
                          value={nfForm.serie}
                          onChange={(e) => setNfForm({ ...nfForm, serie: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Data de Emissão *</label>
                        <input
                          type="date"
                          required
                          value={nfForm.data_emissao}
                          onChange={(e) => setNfForm({ ...nfForm, data_emissao: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">CNPJ do Fornecedor *</label>
                        <input
                          type="text"
                          required
                          value={nfForm.fornecedor_cnpj}
                          onChange={(e) => setNfForm({ ...nfForm, fornecedor_cnpj: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome/Razão Social do Fornecedor *</label>
                        <input
                          type="text"
                          required
                          value={nfForm.fornecedor_nome}
                          onChange={(e) => setNfForm({ ...nfForm, fornecedor_nome: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                        />
                      </div>
                    </div>

                    {/* Itens da NF */}
                    <div className="border-t border-[#8B5A3C]/15 pt-4">
                      <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens da NF-e</h3>
                      <div className="grid grid-cols-12 gap-2 mb-3">
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Descrição do produto"
                            value={nfItemTemp.descricao}
                            onChange={(e) => setNfItemTemp({ ...nfItemTemp, descricao: e.target.value })}
                            className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Qtd"
                            value={nfItemTemp.quantidade}
                            onChange={(e) => setNfItemTemp({ ...nfItemTemp, quantidade: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="R$ Unit."
                            value={nfItemTemp.valor_unitario}
                            onChange={(e) => setNfItemTemp({ ...nfItemTemp, valor_unitario: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={nfItemTemp.unidade}
                            onChange={(e) => setNfItemTemp({ ...nfItemTemp, unidade: e.target.value })}
                            className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                          >
                            <option value="UN">UN</option>
                            <option value="KG">KG</option>
                            <option value="CX">CX</option>
                            <option value="PCT">PCT</option>
                            <option value="L">L</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <Button type="button" onClick={handleAddNfItem} className="w-full bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423] h-full">
                            <Plus size={16} weight="bold" />
                          </Button>
                        </div>
                      </div>

                      {nfForm.items.length > 0 && (
                        <div className="bg-[#F5E6D3]/30 rounded-lg p-4 space-y-2 max-h-[200px] overflow-y-auto">
                          {nfForm.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between bg-[#FFFDF8] p-3 rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[#3E2723]">{item.descricao}</p>
                                <p className="text-xs text-[#705A4D]">
                                  {item.quantidade} {item.unidade} x {formatCurrency(item.valor_unitario)} = {formatCurrency(item.valor_total)}
                                </p>
                              </div>
                              <button type="button" onClick={() => handleRemoveNfItem(index)} className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg">
                                <Trash size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Valores */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Valor Produtos</label>
                        <input
                          type="number"
                          step="0.01"
                          value={nfForm.valor_produtos}
                          onChange={(e) => {
                            const valor = parseFloat(e.target.value) || 0;
                            setNfForm({ ...nfForm, valor_produtos: valor, valor_total: valor + nfForm.valor_frete - nfForm.valor_desconto });
                          }}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Frete</label>
                        <input
                          type="number"
                          step="0.01"
                          value={nfForm.valor_frete}
                          onChange={(e) => {
                            const valor = parseFloat(e.target.value) || 0;
                            setNfForm({ ...nfForm, valor_frete: valor, valor_total: nfForm.valor_produtos + valor - nfForm.valor_desconto });
                          }}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Desconto</label>
                        <input
                          type="number"
                          step="0.01"
                          value={nfForm.valor_desconto}
                          onChange={(e) => {
                            const valor = parseFloat(e.target.value) || 0;
                            setNfForm({ ...nfForm, valor_desconto: valor, valor_total: nfForm.valor_produtos + nfForm.valor_frete - valor });
                          }}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6B4423] mb-1">Valor Total</label>
                        <input
                          type="number"
                          step="0.01"
                          value={nfForm.valor_total}
                          onChange={(e) => setNfForm({ ...nfForm, valor_total: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-sans text-sm font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label>
                      <textarea
                        value={nfForm.observacoes}
                        onChange={(e) => setNfForm({ ...nfForm, observacoes: e.target.value })}
                        rows="2"
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <Button type="button" onClick={() => { setNfDialogOpen(false); resetNfForm(); }} variant="outline">Cancelar</Button>
                      <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">Registrar NF-e</Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#E8D5C4]">
                  <tr>
                    <th className="text-left px-4 py-4 text-sm font-sans font-semibold text-[#3E2723]">Número/Série</th>
                    <th className="text-left px-4 py-4 text-sm font-sans font-semibold text-[#3E2723]">Fornecedor</th>
                    <th className="text-left px-4 py-4 text-sm font-sans font-semibold text-[#3E2723]">CNPJ</th>
                    <th className="text-left px-4 py-4 text-sm font-sans font-semibold text-[#3E2723]">Emissão</th>
                    <th className="text-left px-4 py-4 text-sm font-sans font-semibold text-[#3E2723]">Entrada</th>
                    <th className="text-right px-4 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor Total</th>
                    <th className="text-left px-4 py-4 text-sm font-sans font-semibold text-[#3E2723]">Status</th>
                    <th className="text-right px-4 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {nfEntradas.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-12 text-[#705A4D] font-sans">Nenhuma NF de entrada registrada</td></tr>
                  ) : (
                    nfEntradas.map((nf) => (
                      <tr key={nf.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                        <td className="px-4 py-4 text-sm text-[#4A3B32] font-sans font-medium">{nf.numero_nf}{nf.serie ? `/${nf.serie}` : ''}</td>
                        <td className="px-4 py-4 text-sm text-[#4A3B32] font-sans">{nf.fornecedor_nome}</td>
                        <td className="px-4 py-4 text-sm text-[#4A3B32] font-sans font-mono text-xs">{nf.fornecedor_cnpj}</td>
                        <td className="px-4 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(nf.data_emissao)}</td>
                        <td className="px-4 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(nf.data_entrada)}</td>
                        <td className="px-4 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">{formatCurrency(nf.valor_total)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(nf.status)}`}>
                            {getStatusLabel(nf.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button onClick={() => handleViewNf(nf)} size="sm" variant="outline" className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]">
                              <Eye size={16} weight="bold" />
                            </Button>
                            <Button onClick={() => handleDeleteNf(nf.id)} size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50">
                              <Trash size={16} weight="bold" />
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
        </>
      )}

      {/* Dialog para visualizar NF */}
      <Dialog open={viewNfDialogOpen} onOpenChange={setViewNfDialogOpen}>
        <DialogContent className="bg-[#FFFDF8] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-[#3E2723]">
              NF-e {viewingNf?.numero_nf}{viewingNf?.serie ? `/${viewingNf.serie}` : ''}
            </DialogTitle>
          </DialogHeader>
          {viewingNf && (
            <div className="space-y-4">
              <div className="bg-[#F5E6D3]/50 rounded-lg p-4">
                <p className="text-xs font-mono text-[#705A4D] break-all">
                  <strong>Chave de Acesso:</strong> {viewingNf.chave_acesso}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#705A4D]">Fornecedor</p>
                  <p className="font-medium text-[#3E2723]">{viewingNf.fornecedor_nome}</p>
                  <p className="text-sm text-[#705A4D]">{viewingNf.fornecedor_cnpj}</p>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingNf.status)}`}>
                    {getStatusLabel(viewingNf.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Data de Emissão</p>
                  <p className="font-medium text-[#3E2723]">{formatDateTime(viewingNf.data_emissao)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Data de Entrada</p>
                  <p className="font-medium text-[#3E2723]">{formatDateTime(viewingNf.data_entrada)}</p>
                </div>
              </div>

              <div className="border-t border-[#8B5A3C]/15 pt-4">
                <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens ({viewingNf.items?.length || 0})</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {viewingNf.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-[#F5E6D3]/50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-[#3E2723]">{item.descricao}</p>
                        <p className="text-sm text-[#705A4D]">{item.quantidade} {item.unidade} x {formatCurrency(item.valor_unitario)}</p>
                      </div>
                      <p className="font-medium text-[#3E2723]">{formatCurrency(item.valor_total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#8B5A3C]/15 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#705A4D]">Valor dos Produtos</span>
                  <span className="text-[#3E2723]">{formatCurrency(viewingNf.valor_produtos)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#705A4D]">Frete</span>
                  <span className="text-[#3E2723]">{formatCurrency(viewingNf.valor_frete)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#705A4D]">Desconto</span>
                  <span className="text-[#3E2723]">-{formatCurrency(viewingNf.valor_desconto)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#8B5A3C]/15">
                  <span className="text-lg font-serif font-bold text-[#3E2723]">Total</span>
                  <span className="text-lg font-serif font-bold text-[#6B4423]">{formatCurrency(viewingNf.valor_total)}</span>
                </div>
              </div>

              {viewingNf.observacoes && (
                <div className="border-t border-[#8B5A3C]/15 pt-4">
                  <p className="text-sm text-[#705A4D]">Observações</p>
                  <p className="text-[#3E2723]">{viewingNf.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* TAB: FORNECEDORES */}
      {activeTab === 'fornecedores' && (
        <>
          <div className="flex justify-end mb-4">
            <Dialog open={fornecedorDialogOpen} onOpenChange={(open) => { setFornecedorDialogOpen(open); if (!open) resetFornecedorForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <Plus size={20} weight="bold" className="mr-2" />
                  Novo Fornecedor
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FFFDF8] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif text-[#3E2723]">
                    {editMode ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFornecedorSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome *</label>
                      <input type="text" required value={fornecedorForm.nome} onChange={(e) => setFornecedorForm({ ...fornecedorForm, nome: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" />
                    </div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">CNPJ</label><input type="text" value={fornecedorForm.cnpj} onChange={(e) => setFornecedorForm({ ...fornecedorForm, cnpj: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Nome do Contato</label><input type="text" value={fornecedorForm.contato_nome} onChange={(e) => setFornecedorForm({ ...fornecedorForm, contato_nome: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Email</label><input type="email" value={fornecedorForm.email} onChange={(e) => setFornecedorForm({ ...fornecedorForm, email: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Telefone</label><input type="text" value={fornecedorForm.telefone} onChange={(e) => setFornecedorForm({ ...fornecedorForm, telefone: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-[#6B4423] mb-1">Endereço</label><input type="text" value={fornecedorForm.endereco} onChange={(e) => setFornecedorForm({ ...fornecedorForm, endereco: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Cidade</label><input type="text" value={fornecedorForm.cidade} onChange={(e) => setFornecedorForm({ ...fornecedorForm, cidade: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Estado</label><input type="text" value={fornecedorForm.estado} onChange={(e) => setFornecedorForm({ ...fornecedorForm, estado: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label><textarea value={fornecedorForm.observacoes} onChange={(e) => setFornecedorForm({ ...fornecedorForm, observacoes: e.target.value })} rows="2" className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                  </div>
                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" onClick={() => { setFornecedorDialogOpen(false); resetFornecedorForm(); }} variant="outline">Cancelar</Button>
                    <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">{editMode ? 'Salvar Alterações' : 'Cadastrar'}</Button>
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
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">CNPJ</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Contato</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Telefone</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Cidade/UF</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fornecedores.length === 0 ? (<tr><td colSpan="6" className="text-center py-12 text-[#705A4D] font-sans">Nenhum fornecedor cadastrado</td></tr>) : (
                    fornecedores.map((f) => (
                      <tr key={f.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{f.nome}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{f.cnpj || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{f.contato_nome || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{f.telefone || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{f.cidade && f.estado ? `${f.cidade}/${f.estado}` : '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button onClick={() => handleEditFornecedor(f)} size="sm" className="bg-[#8B5A3C] text-white hover:bg-[#6B4423]"><PencilSimple size={16} weight="bold" /></Button>
                            <Button onClick={() => handleDeleteFornecedor(f.id)} size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50"><Trash size={16} weight="bold" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB: INSUMOS */}
      {activeTab === 'insumos' && (
        <>
          <div className="flex justify-end mb-4">
            <Dialog open={insumoDialogOpen} onOpenChange={(open) => { setInsumoDialogOpen(open); if (!open) resetInsumoForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <Plus size={20} weight="bold" className="mr-2" />
                  Novo Insumo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FFFDF8] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif text-[#3E2723]">{editMode ? 'Editar Insumo' : 'Novo Insumo'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInsumoSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-[#6B4423] mb-1">Nome *</label><input type="text" required value={insumoForm.nome} onChange={(e) => setInsumoForm({ ...insumoForm, nome: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Categoria</label><input type="text" placeholder="Ex: Chocolate, Embalagem..." value={insumoForm.categoria} onChange={(e) => setInsumoForm({ ...insumoForm, categoria: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Unidade de Medida</label><select value={insumoForm.unidade_medida} onChange={(e) => setInsumoForm({ ...insumoForm, unidade_medida: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"><option value="un">Unidade (un)</option><option value="kg">Quilograma (kg)</option><option value="g">Grama (g)</option><option value="l">Litro (l)</option><option value="ml">Mililitro (ml)</option><option value="cx">Caixa (cx)</option><option value="pct">Pacote (pct)</option></select></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Fornecedor</label><select value={insumoForm.fornecedor_id} onChange={(e) => setInsumoForm({ ...insumoForm, fornecedor_id: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"><option value="">Selecione...</option>{fornecedores.map(f => (<option key={f.id} value={f.id}>{f.nome}</option>))}</select></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Preço Unitário (R$)</label><input type="number" step="0.01" min="0" value={insumoForm.preco_unitario} onChange={(e) => setInsumoForm({ ...insumoForm, preco_unitario: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Estoque Mínimo</label><input type="number" step="0.01" min="0" value={insumoForm.estoque_minimo} onChange={(e) => setInsumoForm({ ...insumoForm, estoque_minimo: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Estoque Atual</label><input type="number" step="0.01" min="0" value={insumoForm.estoque_atual} onChange={(e) => setInsumoForm({ ...insumoForm, estoque_atual: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-[#6B4423] mb-1">Descrição</label><textarea value={insumoForm.descricao} onChange={(e) => setInsumoForm({ ...insumoForm, descricao: e.target.value })} rows="2" className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                  </div>
                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" onClick={() => { setInsumoDialogOpen(false); resetInsumoForm(); }} variant="outline">Cancelar</Button>
                    <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">{editMode ? 'Salvar Alterações' : 'Cadastrar'}</Button>
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
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Fornecedor</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Preço</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Estoque</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.length === 0 ? (<tr><td colSpan="6" className="text-center py-12 text-[#705A4D] font-sans">Nenhum insumo cadastrado</td></tr>) : (
                    insumos.map((i) => (
                      <tr key={i.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{i.nome}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{i.categoria || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{i.fornecedor_nome || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">{formatCurrency(i.preco_unitario)}/{i.unidade_medida}</td>
                        <td className="px-6 py-4 text-right"><span className={`text-sm font-medium ${i.estoque_atual <= i.estoque_minimo ? 'text-red-500' : 'text-[#2F855A]'}`}>{i.estoque_atual} {i.unidade_medida}</span>{i.estoque_atual <= i.estoque_minimo && (<span className="ml-2 text-xs text-red-500">(Baixo!)</span>)}</td>
                        <td className="px-6 py-4 text-right"><div className="flex gap-2 justify-end"><Button onClick={() => handleEditInsumo(i)} size="sm" className="bg-[#8B5A3C] text-white hover:bg-[#6B4423]"><PencilSimple size={16} weight="bold" /></Button><Button onClick={() => handleDeleteInsumo(i.id)} size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50"><Trash size={16} weight="bold" /></Button></div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB: COMPRAS */}
      {activeTab === 'compras' && (
        <>
          <div className="flex justify-end mb-4">
            <Dialog open={compraDialogOpen} onOpenChange={(open) => { setCompraDialogOpen(open); if (!open) resetCompraForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <Plus size={20} weight="bold" className="mr-2" />
                  Novo Pedido de Compra
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FFFDF8] max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif text-[#3E2723]">Novo Pedido de Compra</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCompraSubmit} className="space-y-4">
                  <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Fornecedor *</label><select required value={compraForm.fornecedor_id} onChange={(e) => setCompraForm({ ...compraForm, fornecedor_id: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"><option value="">Selecione um fornecedor...</option>{fornecedores.map(f => (<option key={f.id} value={f.id}>{f.nome}</option>))}</select></div>
                  <div className="border-t border-[#8B5A3C]/15 pt-4"><h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens da Compra</h3><div className="grid grid-cols-12 gap-3 mb-3"><div className="col-span-7"><select value={itemTemp.insumo_id} onChange={(e) => setItemTemp({ ...itemTemp, insumo_id: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"><option value="">Selecione um insumo...</option>{insumos.map(i => (<option key={i.id} value={i.id}>{i.nome} - {formatCurrency(i.preco_unitario)}/{i.unidade_medida}</option>))}</select></div><div className="col-span-3"><input type="number" min="1" value={itemTemp.quantidade} onChange={(e) => setItemTemp({ ...itemTemp, quantidade: parseInt(e.target.value) || 1 })} placeholder="Qtd" className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div><div className="col-span-2"><Button type="button" onClick={handleAddItemCompra} className="w-full bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423]"><Plus size={18} weight="bold" /></Button></div></div>{compraForm.items.length > 0 && (<div className="bg-[#F5E6D3]/30 rounded-lg p-4 space-y-2">{compraForm.items.map((item, index) => (<div key={index} className="flex items-center justify-between bg-[#FFFDF8] p-3 rounded-lg"><div className="flex-1"><p className="text-sm font-medium text-[#3E2723]">{item.insumo_nome}</p><p className="text-xs text-[#705A4D]">{item.quantidade}x {formatCurrency(item.preco_unitario)} = {formatCurrency(item.subtotal)}</p></div><button type="button" onClick={() => handleRemoveItemCompra(index)} className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg"><Trash size={18} /></button></div>))}<div className="pt-2 border-t border-[#8B5A3C]/15 text-right"><p className="text-lg font-serif font-bold text-[#3E2723]">Total: {formatCurrency(totalCompra)}</p></div></div>)}</div>
                  <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Data de Entrega Prevista</label><input type="date" value={compraForm.data_entrega_prevista} onChange={(e) => setCompraForm({ ...compraForm, data_entrega_prevista: e.target.value })} className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                  <div><label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label><textarea value={compraForm.observacoes} onChange={(e) => setCompraForm({ ...compraForm, observacoes: e.target.value })} rows="2" className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans" /></div>
                  <div className="flex gap-3 justify-end pt-4"><Button type="button" onClick={() => { setCompraDialogOpen(false); resetCompraForm(); }} variant="outline">Cancelar</Button><Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">Criar Pedido</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#E8D5C4]"><tr><th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Número</th><th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Fornecedor</th><th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Data Pedido</th><th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Entrega Prevista</th><th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor Total</th><th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Status</th><th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th></tr></thead>
                <tbody>
                  {compras.length === 0 ? (<tr><td colSpan="7" className="text-center py-12 text-[#705A4D] font-sans">Nenhum pedido de compra</td></tr>) : (
                    compras.map((c) => (
                      <tr key={c.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{c.numero}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{c.fornecedor_nome}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(c.data_pedido)}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{c.data_entrega_prevista ? formatDateTime(c.data_entrega_prevista) : '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">{formatCurrency(c.valor_total)}</td>
                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</span></td>
                        <td className="px-6 py-4 text-right"><div className="flex gap-2 justify-end"><Button onClick={() => handleViewCompra(c)} size="sm" variant="outline" className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"><Eye size={16} weight="bold" /></Button>{c.status === 'pendente' && (<><Button onClick={() => handleStatusCompra(c.id, 'aprovada')} size="sm" className="bg-blue-500 text-white hover:bg-blue-600"><CheckCircle size={16} weight="bold" /></Button><Button onClick={() => handleStatusCompra(c.id, 'cancelada')} size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50"><XCircle size={16} weight="bold" /></Button></>)}{c.status === 'aprovada' && (<Button onClick={() => handleStatusCompra(c.id, 'recebida')} size="sm" className="bg-[#2F855A] text-white hover:bg-[#276749]"><Truck size={16} weight="bold" className="mr-1" />Receber</Button>)}</div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Dialog para visualizar compra */}
      <Dialog open={viewCompraDialogOpen} onOpenChange={setViewCompraDialogOpen}>
        <DialogContent className="bg-[#FFFDF8] max-w-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-serif text-[#3E2723]">Pedido de Compra {viewingCompra?.numero}</DialogTitle></DialogHeader>
          {viewingCompra && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-[#705A4D]">Fornecedor</p><p className="font-medium text-[#3E2723]">{viewingCompra.fornecedor_nome}</p></div><div><p className="text-sm text-[#705A4D]">Status</p><span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingCompra.status)}`}>{getStatusLabel(viewingCompra.status)}</span></div><div><p className="text-sm text-[#705A4D]">Data do Pedido</p><p className="font-medium text-[#3E2723]">{formatDateTime(viewingCompra.data_pedido)}</p></div><div><p className="text-sm text-[#705A4D]">Entrega Prevista</p><p className="font-medium text-[#3E2723]">{viewingCompra.data_entrega_prevista ? formatDateTime(viewingCompra.data_entrega_prevista) : 'Não definida'}</p></div></div>
              <div className="border-t border-[#8B5A3C]/15 pt-4"><h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens</h3><div className="space-y-2">{viewingCompra.items.map((item, index) => (<div key={index} className="flex justify-between items-center bg-[#F5E6D3]/50 p-3 rounded-lg"><div><p className="font-medium text-[#3E2723]">{item.insumo_nome}</p><p className="text-sm text-[#705A4D]">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p></div><p className="font-medium text-[#3E2723]">{formatCurrency(item.subtotal)}</p></div>))}</div><div className="mt-4 pt-4 border-t border-[#8B5A3C]/15 flex justify-between"><span className="text-lg font-serif font-bold text-[#3E2723]">Total</span><span className="text-lg font-serif font-bold text-[#6B4423]">{formatCurrency(viewingCompra.valor_total)}</span></div></div>
              {viewingCompra.observacoes && (<div className="border-t border-[#8B5A3C]/15 pt-4"><p className="text-sm text-[#705A4D]">Observações</p><p className="text-[#3E2723]">{viewingCompra.observacoes}</p></div>)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
