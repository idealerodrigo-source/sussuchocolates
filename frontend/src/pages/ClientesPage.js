import React, { useEffect, useState, useMemo } from 'react';
import { clientesAPI } from '../services/api';
import { formatCPF, formatCNPJ, formatPhone, formatCurrency } from '../utils/formatters';
import { Plus, Pencil, Trash, MagnifyingGlass, Eye, ShoppingCart, Receipt, Phone, MapPin } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useSortableTable, SortableHeader } from '../hooks/useSortableTable';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaCliente, setFichaCliente] = useState(null);
  const [fichaLoading, setFichaLoading] = useState(false);
  const [fichaTab, setFichaTab] = useState('pedidos');  
  // Filtrar clientes pelo termo de pesquisa
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    const term = searchTerm.toLowerCase();
    return clientes.filter(c => 
      c.nome?.toLowerCase().includes(term) ||
      c.cpf?.includes(term) ||
      c.cnpj?.includes(term) ||
      c.telefone?.includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.cidade?.toLowerCase().includes(term)
    );
  }, [clientes, searchTerm]);
  
  const { sortedData, requestSort, sortConfig } = useSortableTable(filteredClientes, { key: 'nome', direction: 'asc' });
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await clientesAPI.listar();
      setClientes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleVerFicha = async (cliente) => {
    setFichaOpen(true);
    setFichaLoading(true);
    setFichaCliente(null);
    setFichaTab('pedidos');
    try {
      const res = await clientesAPI.historico(cliente.id);
      setFichaCliente(res.data);
    } catch {
      toast.error('Erro ao carregar histórico do cliente');
      setFichaOpen(false);
    } finally {
      setFichaLoading(false);
    }
  };

  // Verifica se já existe cliente com mesmo nome, CPF ou CNPJ
  const verificarDuplicata = (dados, listaClientes) => {
    return listaClientes.filter(c => {
      if (editingCliente && c.id === editingCliente.id) return false;
      
      const nomeIgual = dados.nome && c.nome && 
        c.nome.toLowerCase().trim() === dados.nome.toLowerCase().trim();
      const cpfIgual = dados.cpf && c.cpf && 
        c.cpf.replace(/\D/g, '') === dados.cpf.replace(/\D/g, '');
      const cnpjIgual = dados.cnpj && c.cnpj && 
        c.cnpj.replace(/\D/g, '') === dados.cnpj.replace(/\D/g, '');
      
      return nomeIgual || cpfIgual || cnpjIgual;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Remove campos vazios antes de enviar
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
      );
      
      // Verificar duplicatas apenas em novos cadastros
      if (!editingCliente) {
        // Recarregar clientes para garantir lista atualizada
        let clientesAtuais = clientes;
        try {
          const response = await clientesAPI.listar();
          clientesAtuais = response.data;
        } catch (e) {
          console.error('Erro ao buscar clientes para verificação:', e);
        }
        
        const duplicatas = verificarDuplicata(cleanData, clientesAtuais);
        if (duplicatas.length > 0) {
          const campos = [];
          duplicatas.forEach(d => {
            if (d.nome?.toLowerCase() === cleanData.nome?.toLowerCase()) campos.push('Nome');
            if (d.cpf && cleanData.cpf && d.cpf.replace(/\D/g, '') === cleanData.cpf.replace(/\D/g, '')) campos.push('CPF');
            if (d.cnpj && cleanData.cnpj && d.cnpj.replace(/\D/g, '') === cleanData.cnpj.replace(/\D/g, '')) campos.push('CNPJ');
          });
          const camposUnicos = [...new Set(campos)].join(', ');
          
          const confirmar = window.confirm(
            `Já existe um cliente com ${camposUnicos} igual ou similar:\n\n` +
            duplicatas.map(d => `• ${d.nome}${d.cpf ? ` (CPF: ${d.cpf})` : ''}${d.cnpj ? ` (CNPJ: ${d.cnpj})` : ''}`).join('\n') +
            `\n\nDeseja cadastrar mesmo assim?`
          );
          
          if (!confirmar) return;
        }
      }
      
      if (editingCliente) {
        await clientesAPI.atualizar(editingCliente.id, cleanData);
        toast.success('Cliente atualizado com sucesso');
      } else {
        await clientesAPI.criar(cleanData);
        toast.success('Cliente criado com sucesso');
      }
      setDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este cliente?')) {
      try {
        await clientesAPI.deletar(id);
        toast.success('Cliente excluído com sucesso');
        fetchClientes();
      } catch (error) {
        toast.error('Erro ao excluir cliente');
      }
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome || '',
      cpf: cliente.cpf || '',
      cnpj: cliente.cnpj || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: cliente.cep || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
    });
    setEditingCliente(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  return (
    <div data-testid="clientes-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Clientes</h1>
          <p className="text-base font-sans text-[#705A4D]">Gerencie os clientes da Sussu Chocolates</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-cliente" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <Plus size={20} weight="bold" className="mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-cliente">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    placeholder="Nome completo do cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">CPF (opcional)</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">CNPJ (opcional)</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Telefone (opcional)</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    placeholder="(11) 98765-4321"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Email (opcional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Estado</label>
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  {editingCliente ? 'Atualizar' : 'Criar'}
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
            placeholder="Pesquisar por nome, CPF, CNPJ, telefone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans placeholder:text-[#8B5A3C]/60"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C] hover:text-[#6B4423]">✕</button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-[#705A4D] mt-1">Encontrados: {filteredClientes.length} de {clientes.length} clientes</p>
        )}
      </div>

      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#E8D5C4]">
              <tr>
                <SortableHeader label="Nome" sortKey="nome" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="CPF/CNPJ" sortKey="cpf" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Telefone" sortKey="telefone" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <SortableHeader label="Cidade" sortKey="cidade" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhum cliente cadastrado
                  </td>
                </tr>
              ) : (
                sortedData.map((cliente) => (
                  <tr key={cliente.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{cliente.nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                      {cliente.cpf ? formatCPF(cliente.cpf) : cliente.cnpj ? formatCNPJ(cliente.cnpj) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                      {cliente.telefone ? formatPhone(cliente.telefone) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{cliente.email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{cliente.cidade || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleVerFicha(cliente)}
                          className="p-2 text-[#6B4423] hover:bg-[#E8D5C4] rounded-lg transition-colors"
                          title="Ver ficha"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="p-2 text-[#6B4423] hover:bg-[#E8D5C4] rounded-lg transition-colors"
                          data-testid={`btn-edit-${cliente.id}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id)}
                          className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg transition-colors"
                          data-testid={`btn-delete-${cliente.id}`}
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal Ficha do Cliente */}
      <Dialog open={fichaOpen} onOpenChange={setFichaOpen}>
        <DialogContent className="bg-[#FFFDF8] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-[#3E2723]">
              Ficha do Cliente
            </DialogTitle>
          </DialogHeader>

          {fichaLoading && (
            <div className="py-12 text-center text-[#705A4D]">Carregando...</div>
          )}

          {!fichaLoading && fichaCliente && (
            <div className="space-y-5">
              {/* Dados do cliente */}
              <div className="bg-[#F5E6D3]/40 rounded-xl p-4 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <p className="text-xl font-serif font-bold text-[#3E2723]">{fichaCliente.cliente.nome}</p>
                  {(fichaCliente.cliente.cpf || fichaCliente.cliente.cnpj) && (
                    <p className="text-sm text-[#705A4D]">
                      {fichaCliente.cliente.cpf ? formatCPF(fichaCliente.cliente.cpf) : formatCNPJ(fichaCliente.cliente.cnpj)}
                    </p>
                  )}
                </div>
                {fichaCliente.cliente.telefone && (
                  <div className="flex items-center gap-2 text-sm text-[#3E2723]">
                    <Phone size={16} className="text-[#6B4423]" />
                    {formatPhone(fichaCliente.cliente.telefone)}
                  </div>
                )}
                {fichaCliente.cliente.email && (
                  <div className="text-sm text-[#3E2723]">📧 {fichaCliente.cliente.email}</div>
                )}
                {fichaCliente.cliente.cidade && (
                  <div className="flex items-center gap-2 text-sm text-[#3E2723]">
                    <MapPin size={16} className="text-[#6B4423]" />
                    {fichaCliente.cliente.cidade}{fichaCliente.cliente.estado ? ` / ${fichaCliente.cliente.estado}` : ''}
                  </div>
                )}
              </div>

              {/* Cards resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-3 text-center">
                  <p className="text-xs uppercase font-semibold text-[#8B5A3C] mb-1">Pedidos</p>
                  <p className="text-2xl font-serif font-bold text-[#3E2723]">{fichaCliente.resumo.total_pedidos}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-3 text-center">
                  <p className="text-xs uppercase font-semibold text-[#8B5A3C] mb-1">Vendas</p>
                  <p className="text-2xl font-serif font-bold text-[#3E2723]">{fichaCliente.resumo.total_vendas}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-xs uppercase font-semibold text-green-700 mb-1">Total Gasto</p>
                  <p className="text-lg font-serif font-bold text-green-700">{formatCurrency(fichaCliente.resumo.total_gasto)}</p>
                </div>
                {fichaCliente.resumo.valor_pendente > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                    <p className="text-xs uppercase font-semibold text-orange-600 mb-1">Pendente</p>
                    <p className="text-lg font-serif font-bold text-orange-700">{formatCurrency(fichaCliente.resumo.valor_pendente)}</p>
                  </div>
                )}
              </div>

              {/* Abas pedidos / vendas */}
              <div className="flex gap-1 border-b border-[#8B5A3C]/15">
                <button
                  onClick={() => setFichaTab('pedidos')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${fichaTab === 'pedidos' ? 'text-[#6B4423] border-b-2 border-[#6B4423]' : 'text-[#705A4D] hover:text-[#6B4423]'}`}
                >
                  <ShoppingCart size={16} />
                  Pedidos ({fichaCliente.pedidos.length})
                </button>
                <button
                  onClick={() => setFichaTab('vendas')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${fichaTab === 'vendas' ? 'text-[#6B4423] border-b-2 border-[#6B4423]' : 'text-[#705A4D] hover:text-[#6B4423]'}`}
                >
                  <Receipt size={16} />
                  Vendas ({fichaCliente.vendas.length})
                </button>
              </div>

              {/* Lista de pedidos */}
              {fichaTab === 'pedidos' && (
                fichaCliente.pedidos.length === 0 ? (
                  <p className="text-center py-8 text-[#705A4D]">Nenhum pedido encontrado</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {fichaCliente.pedidos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#FDFAF5] border border-[#8B5A3C]/10 rounded-lg px-4 py-3">
                        <div>
                          <p className="font-medium text-sm text-[#3E2723]">{p.numero}</p>
                          <p className="text-xs text-[#705A4D]">{String(p.data_pedido).slice(0,10)}{p.data_entrega ? ` · Entrega: ${String(p.data_entrega).slice(0,10)}` : ''}</p>
                          <p className="text-xs text-[#705A4D]">{(p.items||[]).length} item(ns)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-[#6B4423]">{formatCurrency(p.valor_total)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.status === 'entregue' ? 'bg-green-100 text-green-700' :
                            p.status === 'cancelado' ? 'bg-red-100 text-red-600' :
                            p.status === 'concluido' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{p.status?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Lista de vendas */}
              {fichaTab === 'vendas' && (
                fichaCliente.vendas.length === 0 ? (
                  <p className="text-center py-8 text-[#705A4D]">Nenhuma venda encontrada</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {fichaCliente.vendas.map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#FDFAF5] border border-[#8B5A3C]/10 rounded-lg px-4 py-3">
                        <div>
                          <p className="font-medium text-sm text-[#3E2723]">{String(v.data_venda).slice(0,10)}</p>
                          <p className="text-xs text-[#705A4D]">{v.forma_pagamento || '—'} · {(v.items||[]).length} item(ns)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-[#6B4423]">{formatCurrency(v.valor_total)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            v.status_pagamento === 'pago' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>{v.status_pagamento === 'pago' ? 'Pago' : 'A receber'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
