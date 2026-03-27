import React, { useEffect, useState } from 'react';
import { fornecedoresAPI, insumosAPI, comprasAPI } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { 
  Plus, Truck, Package, ShoppingCart, Trash, PencilSimple, 
  CheckCircle, XCircle, Clock, Buildings, Eye
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function ComprasPage() {
  const [activeTab, setActiveTab] = useState('fornecedores');
  const [fornecedores, setFornecedores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);
  const [insumoDialogOpen, setInsumoDialogOpen] = useState(false);
  const [compraDialogOpen, setCompraDialogOpen] = useState(false);
  const [viewCompraDialogOpen, setViewCompraDialogOpen] = useState(false);
  const [viewingCompra, setViewingCompra] = useState(null);
  
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
  
  const [itemTemp, setItemTemp] = useState({
    insumo_id: '', quantidade: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [fornecedoresRes, insumosRes, comprasRes] = await Promise.all([
        fornecedoresAPI.listar(),
        insumosAPI.listar(),
        comprasAPI.listar()
      ]);
      setFornecedores(fornecedoresRes.data);
      setInsumos(insumosRes.data);
      setCompras(comprasRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
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
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'aprovada': return 'Aprovada';
      case 'recebida': return 'Recebida';
      case 'cancelada': return 'Cancelada';
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
          <p className="text-base font-sans text-[#705A4D]">Gerencie fornecedores, insumos e pedidos de compra</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-[#8B5A3C]/15">
          <button
            onClick={() => setActiveTab('fornecedores')}
            className={`px-6 py-3 font-sans font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'fornecedores'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <Buildings size={18} weight="bold" />
            Fornecedores ({fornecedores.length})
          </button>
          <button
            onClick={() => setActiveTab('insumos')}
            className={`px-6 py-3 font-sans font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'insumos'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <Package size={18} weight="bold" />
            Insumos ({insumos.length})
          </button>
          <button
            onClick={() => setActiveTab('compras')}
            className={`px-6 py-3 font-sans font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'compras'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <ShoppingCart size={18} weight="bold" />
            Pedidos de Compra ({compras.length})
          </button>
        </div>
      </div>

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
                      <input
                        type="text"
                        required
                        value={fornecedorForm.nome}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, nome: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={fornecedorForm.cnpj}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, cnpj: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome do Contato</label>
                      <input
                        type="text"
                        value={fornecedorForm.contato_nome}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, contato_nome: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Email</label>
                      <input
                        type="email"
                        value={fornecedorForm.email}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Telefone</label>
                      <input
                        type="text"
                        value={fornecedorForm.telefone}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, telefone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Endereço</label>
                      <input
                        type="text"
                        value={fornecedorForm.endereco}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, endereco: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Cidade</label>
                      <input
                        type="text"
                        value={fornecedorForm.cidade}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, cidade: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Estado</label>
                      <input
                        type="text"
                        value={fornecedorForm.estado}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, estado: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label>
                      <textarea
                        value={fornecedorForm.observacoes}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, observacoes: e.target.value })}
                        rows="2"
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" onClick={() => { setFornecedorDialogOpen(false); resetFornecedorForm(); }} variant="outline">Cancelar</Button>
                    <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                      {editMode ? 'Salvar Alterações' : 'Cadastrar'}
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
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">CNPJ</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Contato</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Telefone</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Cidade/UF</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fornecedores.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-[#705A4D] font-sans">Nenhum fornecedor cadastrado</td></tr>
                  ) : (
                    fornecedores.map((f) => (
                      <tr key={f.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{f.nome}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{f.cnpj || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{f.contato_nome || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{f.telefone || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{f.cidade && f.estado ? `${f.cidade}/${f.estado}` : '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button onClick={() => handleEditFornecedor(f)} size="sm" className="bg-[#8B5A3C] text-white hover:bg-[#6B4423]">
                              <PencilSimple size={16} weight="bold" />
                            </Button>
                            <Button onClick={() => handleDeleteFornecedor(f.id)} size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50">
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
                  <DialogTitle className="text-2xl font-serif text-[#3E2723]">
                    {editMode ? 'Editar Insumo' : 'Novo Insumo'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInsumoSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome *</label>
                      <input
                        type="text"
                        required
                        value={insumoForm.nome}
                        onChange={(e) => setInsumoForm({ ...insumoForm, nome: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Categoria</label>
                      <input
                        type="text"
                        placeholder="Ex: Chocolate, Embalagem, Açúcar..."
                        value={insumoForm.categoria}
                        onChange={(e) => setInsumoForm({ ...insumoForm, categoria: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Unidade de Medida</label>
                      <select
                        value={insumoForm.unidade_medida}
                        onChange={(e) => setInsumoForm({ ...insumoForm, unidade_medida: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      >
                        <option value="un">Unidade (un)</option>
                        <option value="kg">Quilograma (kg)</option>
                        <option value="g">Grama (g)</option>
                        <option value="l">Litro (l)</option>
                        <option value="ml">Mililitro (ml)</option>
                        <option value="cx">Caixa (cx)</option>
                        <option value="pct">Pacote (pct)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Fornecedor</label>
                      <select
                        value={insumoForm.fornecedor_id}
                        onChange={(e) => setInsumoForm({ ...insumoForm, fornecedor_id: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      >
                        <option value="">Selecione...</option>
                        {fornecedores.map(f => (
                          <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Preço Unitário (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={insumoForm.preco_unitario}
                        onChange={(e) => setInsumoForm({ ...insumoForm, preco_unitario: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Estoque Mínimo</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={insumoForm.estoque_minimo}
                        onChange={(e) => setInsumoForm({ ...insumoForm, estoque_minimo: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Estoque Atual</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={insumoForm.estoque_atual}
                        onChange={(e) => setInsumoForm({ ...insumoForm, estoque_atual: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Descrição</label>
                      <textarea
                        value={insumoForm.descricao}
                        onChange={(e) => setInsumoForm({ ...insumoForm, descricao: e.target.value })}
                        rows="2"
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" onClick={() => { setInsumoDialogOpen(false); resetInsumoForm(); }} variant="outline">Cancelar</Button>
                    <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                      {editMode ? 'Salvar Alterações' : 'Cadastrar'}
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
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Fornecedor</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Preço</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Estoque</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-[#705A4D] font-sans">Nenhum insumo cadastrado</td></tr>
                  ) : (
                    insumos.map((i) => (
                      <tr key={i.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{i.nome}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{i.categoria || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{i.fornecedor_nome || '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">{formatCurrency(i.preco_unitario)}/{i.unidade_medida}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-medium ${i.estoque_atual <= i.estoque_minimo ? 'text-red-500' : 'text-[#2F855A]'}`}>
                            {i.estoque_atual} {i.unidade_medida}
                          </span>
                          {i.estoque_atual <= i.estoque_minimo && (
                            <span className="ml-2 text-xs text-red-500">(Baixo!)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button onClick={() => handleEditInsumo(i)} size="sm" className="bg-[#8B5A3C] text-white hover:bg-[#6B4423]">
                              <PencilSimple size={16} weight="bold" />
                            </Button>
                            <Button onClick={() => handleDeleteInsumo(i.id)} size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50">
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
                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Fornecedor *</label>
                    <select
                      required
                      value={compraForm.fornecedor_id}
                      onChange={(e) => setCompraForm({ ...compraForm, fornecedor_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    >
                      <option value="">Selecione um fornecedor...</option>
                      {fornecedores.map(f => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-[#8B5A3C]/15 pt-4">
                    <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens da Compra</h3>
                    <div className="grid grid-cols-12 gap-3 mb-3">
                      <div className="col-span-7">
                        <select
                          value={itemTemp.insumo_id}
                          onChange={(e) => setItemTemp({ ...itemTemp, insumo_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                        >
                          <option value="">Selecione um insumo...</option>
                          {insumos.map(i => (
                            <option key={i.id} value={i.id}>{i.nome} - {formatCurrency(i.preco_unitario)}/{i.unidade_medida}</option>
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
                        <Button type="button" onClick={handleAddItemCompra} className="w-full bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423]">
                          <Plus size={18} weight="bold" />
                        </Button>
                      </div>
                    </div>

                    {compraForm.items.length > 0 && (
                      <div className="bg-[#F5E6D3]/30 rounded-lg p-4 space-y-2">
                        {compraForm.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between bg-[#FFFDF8] p-3 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[#3E2723]">{item.insumo_nome}</p>
                              <p className="text-xs text-[#705A4D]">{item.quantidade}x {formatCurrency(item.preco_unitario)} = {formatCurrency(item.subtotal)}</p>
                            </div>
                            <button type="button" onClick={() => handleRemoveItemCompra(index)} className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg">
                              <Trash size={18} />
                            </button>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-[#8B5A3C]/15 text-right">
                          <p className="text-lg font-serif font-bold text-[#3E2723]">Total: {formatCurrency(totalCompra)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Data de Entrega Prevista</label>
                    <input
                      type="date"
                      value={compraForm.data_entrega_prevista}
                      onChange={(e) => setCompraForm({ ...compraForm, data_entrega_prevista: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label>
                    <textarea
                      value={compraForm.observacoes}
                      onChange={(e) => setCompraForm({ ...compraForm, observacoes: e.target.value })}
                      rows="2"
                      className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" onClick={() => { setCompraDialogOpen(false); resetCompraForm(); }} variant="outline">Cancelar</Button>
                    <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">Criar Pedido</Button>
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
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Número</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Fornecedor</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Data Pedido</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Entrega Prevista</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor Total</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-12 text-[#705A4D] font-sans">Nenhum pedido de compra</td></tr>
                  ) : (
                    compras.map((c) => (
                      <tr key={c.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{c.numero}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{c.fornecedor_nome}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(c.data_pedido)}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{c.data_entrega_prevista ? formatDateTime(c.data_entrega_prevista) : '-'}</td>
                        <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">{formatCurrency(c.valor_total)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                            {getStatusLabel(c.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button onClick={() => handleViewCompra(c)} size="sm" variant="outline" className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]">
                              <Eye size={16} weight="bold" />
                            </Button>
                            {c.status === 'pendente' && (
                              <>
                                <Button onClick={() => handleStatusCompra(c.id, 'aprovada')} size="sm" className="bg-blue-500 text-white hover:bg-blue-600">
                                  <CheckCircle size={16} weight="bold" />
                                </Button>
                                <Button onClick={() => handleStatusCompra(c.id, 'cancelada')} size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50">
                                  <XCircle size={16} weight="bold" />
                                </Button>
                              </>
                            )}
                            {c.status === 'aprovada' && (
                              <Button onClick={() => handleStatusCompra(c.id, 'recebida')} size="sm" className="bg-[#2F855A] text-white hover:bg-[#276749]">
                                <Truck size={16} weight="bold" className="mr-1" />
                                Receber
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
        </>
      )}

      {/* Dialog para visualizar compra */}
      <Dialog open={viewCompraDialogOpen} onOpenChange={setViewCompraDialogOpen}>
        <DialogContent className="bg-[#FFFDF8] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-[#3E2723]">
              Pedido de Compra {viewingCompra?.numero}
            </DialogTitle>
          </DialogHeader>
          {viewingCompra && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#705A4D]">Fornecedor</p>
                  <p className="font-medium text-[#3E2723]">{viewingCompra.fornecedor_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingCompra.status)}`}>
                    {getStatusLabel(viewingCompra.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Data do Pedido</p>
                  <p className="font-medium text-[#3E2723]">{formatDateTime(viewingCompra.data_pedido)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#705A4D]">Entrega Prevista</p>
                  <p className="font-medium text-[#3E2723]">{viewingCompra.data_entrega_prevista ? formatDateTime(viewingCompra.data_entrega_prevista) : 'Não definida'}</p>
                </div>
              </div>

              <div className="border-t border-[#8B5A3C]/15 pt-4">
                <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens</h3>
                <div className="space-y-2">
                  {viewingCompra.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-[#F5E6D3]/50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-[#3E2723]">{item.insumo_nome}</p>
                        <p className="text-sm text-[#705A4D]">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p>
                      </div>
                      <p className="font-medium text-[#3E2723]">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#8B5A3C]/15 flex justify-between">
                  <span className="text-lg font-serif font-bold text-[#3E2723]">Total</span>
                  <span className="text-lg font-serif font-bold text-[#6B4423]">{formatCurrency(viewingCompra.valor_total)}</span>
                </div>
              </div>

              {viewingCompra.observacoes && (
                <div className="border-t border-[#8B5A3C]/15 pt-4">
                  <p className="text-sm text-[#705A4D]">Observações</p>
                  <p className="text-[#3E2723]">{viewingCompra.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
