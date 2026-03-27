import React, { useEffect, useState } from 'react';
import { embalagemAPI, producaoAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { Plus, CheckCircle, MapPin } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function EmbalagemPage() {
  const [embalagens, setEmbalagens] = useState([]);
  const [producoes, setProducoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [concluirDialogOpen, setConcluirDialogOpen] = useState(false);
  const [selectedEmbalagem, setSelectedEmbalagem] = useState(null);
  const [localizacao, setLocalizacao] = useState('');
  const [formData, setFormData] = useState({
    producao_id: '',
    pedido_id: '',
    quantidade: '',
    responsavel: '',
    tipo_embalagem: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [embalagensRes, producoesRes] = await Promise.all([
        embalagemAPI.listar(),
        producaoAPI.listar(),
      ]);
      setEmbalagens(embalagensRes.data);
      
      const producoesConcluidas = producoesRes.data.filter(
        (p) => p.data_conclusao !== null
      );
      setProducoes(producoesConcluidas);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        quantidade: parseFloat(formData.quantidade),
      };
      await embalagemAPI.criar(data);
      toast.success('Embalagem registrada com sucesso');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao registrar embalagem');
    }
  };

  const handleProducaoChange = (producaoId) => {
    const producao = producoes.find(p => p.id === producaoId);
    if (producao) {
      setFormData({
        ...formData,
        producao_id: producaoId,
        pedido_id: producao.pedido_id,
        quantidade: producao.quantidade.toString(),
      });
    }
  };

  const handleConcluir = async (embalagemId) => {
    setSelectedEmbalagem(embalagemId);
    setLocalizacao('');
    setConcluirDialogOpen(true);
  };

  const handleConfirmarConclusao = async () => {
    try {
      const result = await embalagemAPI.concluir(selectedEmbalagem, { localizacao: localizacao || null });
      toast.success(result.data.message || 'Embalagem concluída! Produto adicionado ao estoque.');
      setConcluirDialogOpen(false);
      setSelectedEmbalagem(null);
      setLocalizacao('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao concluir embalagem');
    }
  };

  const resetForm = () => {
    setFormData({
      producao_id: '',
      pedido_id: '',
      quantidade: '',
      responsavel: '',
      tipo_embalagem: '',
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  return (
    <div data-testid="embalagem-page">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Embalagem</h1>
          <p className="text-base font-sans text-[#705A4D]">Controle o processo de embalagem</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-embalagem" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <Plus size={20} weight="bold" className="mr-2" />
              Registro Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">Registrar Embalagem</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Produção *</label>
                  <select
                    required
                    value={formData.producao_id}
                    onChange={(e) => handleProducaoChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  >
                    <option value="">Selecione uma produção...</option>
                    {producoes.map((producao) => (
                      <option key={producao.id} value={producao.id}>
                        {producao.pedido_numero} - {producao.produto_nome} ({producao.quantidade})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[#705A4D] mt-1">
                    Apenas produções concluídas podem ser embaladas
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Quantidade *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Tipo de Embalagem</label>
                  <select
                    value={formData.tipo_embalagem}
                    onChange={(e) => setFormData({ ...formData, tipo_embalagem: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  >
                    <option value="">Selecione...</option>
                    <option value="Caixa Premium">Caixa Premium</option>
                    <option value="Caixa Padrão">Caixa Padrão</option>
                    <option value="Saco Plástico">Saco Plástico</option>
                    <option value="Papel Craft">Papel Craft</option>
                    <option value="Embalagem Presente">Embalagem Presente</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Responsável</label>
                  <input
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  Registrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-800 font-sans">
          ℹ️ <strong>Novo Fluxo:</strong> Quando uma produção é concluída, a embalagem é criada PENDENTE. O responsável deve concluir a embalagem para que o produto seja adicionado ao estoque.
        </p>
      </div>

      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#E8D5C4]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Início</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Tipo Embalagem</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Quantidade</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Responsável</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Status</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {embalagens.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhuma embalagem registrada
                  </td>
                </tr>
              ) : (
                embalagens.map((embalagem) => (
                  <tr key={embalagem.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(embalagem.data_inicio || embalagem.data_embalagem)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{embalagem.produto_nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{embalagem.tipo_embalagem || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">{embalagem.quantidade}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{embalagem.responsavel || '-'}</td>
                    <td className="px-6 py-4">
                      {embalagem.data_conclusao ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">
                          Concluído
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FEFCBF] text-[#D97706]">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!embalagem.data_conclusao && (
                        <Button
                          onClick={() => handleConcluir(embalagem.id)}
                          size="sm"
                          className="bg-[#2F855A] text-white hover:bg-[#276749] text-xs"
                        >
                          <CheckCircle size={16} weight="bold" className="mr-1" />
                          Concluir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog para informar localização ao concluir */}
      <Dialog open={concluirDialogOpen} onOpenChange={(open) => { setConcluirDialogOpen(open); if (!open) { setSelectedEmbalagem(null); setLocalizacao(''); } }}>
        <DialogContent className="bg-[#FFFDF8] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-[#3E2723] flex items-center gap-2">
              <MapPin size={24} className="text-[#6B4423]" />
              Localização no Estoque
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#705A4D] font-sans">
              Informe a localização onde o produto será armazenado no estoque:
            </p>
            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1">Localização</label>
              <input
                type="text"
                placeholder="Ex: Prateleira A3, Corredor 2, Freezer 1..."
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button 
                type="button" 
                onClick={() => { setConcluirDialogOpen(false); setSelectedEmbalagem(null); setLocalizacao(''); }} 
                variant="outline"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmarConclusao}
                className="bg-[#2F855A] text-white hover:bg-[#276749]"
              >
                <CheckCircle size={18} weight="bold" className="mr-2" />
                Confirmar Conclusão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
