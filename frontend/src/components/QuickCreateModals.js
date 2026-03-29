import React, { useState } from 'react';
import { clientesAPI, produtosAPI } from '../services/api';
import { Plus, UserPlus, Package } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';

// Modal para criar cliente rapidamente
export function QuickCreateClienteModal({ onClienteCreated, trigger }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
      );
      
      const response = await clientesAPI.criar(cleanData);
      toast.success('Cliente criado com sucesso!');
      setOpen(false);
      setFormData({ nome: '', telefone: '', email: '', endereco: '' });
      
      // Callback para atualizar a lista e selecionar o novo cliente
      if (onClienteCreated) {
        onClienteCreated(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
          >
            <UserPlus size={16} weight="bold" className="mr-1" />
            Novo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#FFFDF8] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif text-[#3E2723] flex items-center gap-2">
            <UserPlus size={24} className="text-[#6B4423]" />
            Cadastro Rápido de Cliente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome *</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              placeholder="Nome completo do cliente"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B4423] mb-1">Telefone</label>
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              placeholder="(11) 98765-4321"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B4423] mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B4423] mb-1">Endereco</label>
            <input
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              placeholder="Endereco completo"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" onClick={() => setOpen(false)} variant="outline" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Modal para criar produto rapidamente
export function QuickCreateProdutoModal({ onProdutoCreated, trigger }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    preco: '',
    descricao: '',
    categoria: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSend = {
        nome: formData.nome,
        preco: parseFloat(formData.preco) || 0,
        descricao: formData.descricao || undefined,
        categoria: formData.categoria || undefined,
      };
      
      const cleanData = Object.fromEntries(
        Object.entries(dataToSend).filter(([_, v]) => v !== undefined && v !== '')
      );
      
      const response = await produtosAPI.criar(cleanData);
      toast.success('Produto criado com sucesso!');
      setOpen(false);
      setFormData({ nome: '', preco: '', descricao: '', categoria: '' });
      
      // Callback para atualizar a lista
      if (onProdutoCreated) {
        onProdutoCreated(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
          >
            <Package size={16} weight="bold" className="mr-1" />
            Novo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#FFFDF8] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif text-[#3E2723] flex items-center gap-2">
            <Package size={24} className="text-[#6B4423]" />
            Cadastro Rápido de Produto
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome do Produto *</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              placeholder="Ex: Trufa de Chocolate 70%"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B4423] mb-1">Preco (R$) *</label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.preco}
              onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B4423] mb-1">Categoria</label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
            >
              <option value="">Selecione...</option>
              <option value="Trufas">Trufas</option>
              <option value="Bombons">Bombons</option>
              <option value="Barras">Barras</option>
              <option value="Caixas">Caixas</option>
              <option value="Cestas">Cestas</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B4423] mb-1">Descricao</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans resize-none"
              rows="2"
              placeholder="Descricao do produto..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" onClick={() => setOpen(false)} variant="outline" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
