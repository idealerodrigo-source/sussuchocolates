import React, { useEffect, useState } from 'react';
import { embalagemAPI, producaoAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { Plus, CheckCircle, MapPin, User, Package, CheckSquare } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function EmbalagemPage() {
  const [embalagens, setEmbalagens] = useState([]);
  const [producoes, setProducoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [concluirDialogOpen, setConcluirDialogOpen] = useState(false);
  const [concluirPedidoDialogOpen, setConcluirPedidoDialogOpen] = useState(false);
  const [selectedEmbalagem, setSelectedEmbalagem] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedEmbalagens, setSelectedEmbalagens] = useState([]);
  const [localizacao, setLocalizacao] = useState('');
  const [responsavelConclusao, setResponsavelConclusao] = useState('');
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
    setResponsavelConclusao('');
    setConcluirDialogOpen(true);
  };

  const handleConfirmarConclusao = async () => {
    if (!responsavelConclusao.trim()) {
      toast.error('Informe o nome do responsável pela conclusão');
      return;
    }
    
    try {
      const result = await embalagemAPI.concluir(selectedEmbalagem, { 
        localizacao: localizacao || null,
        responsavel_conclusao: responsavelConclusao 
      });
      toast.success(result.data.message || 'Embalagem concluída! Produto adicionado ao estoque.');
      setConcluirDialogOpen(false);
      setSelectedEmbalagem(null);
      setLocalizacao('');
      setResponsavelConclusao('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao concluir embalagem');
    }
  };

  // Agrupar embalagens por pedido
  const embalagensPorPedido = embalagens.reduce((acc, emb) => {
    const pedidoKey = emb.pedido_id || emb.pedido_numero || 'sem_pedido';
    if (!acc[pedidoKey]) {
      acc[pedidoKey] = {
        pedido_id: emb.pedido_id,
        pedido_numero: emb.pedido_numero,
        cliente_nome: emb.cliente_nome,
        items: []
      };
    }
    acc[pedidoKey].items.push(emb);
    return acc;
  }, {});

  // Contar pendentes por pedido
  const getPendentesPorPedido = (pedidoKey) => {
    return embalagensPorPedido[pedidoKey]?.items.filter(e => !e.data_conclusao) || [];
  };

  // Selecionar/desselecionar embalagem
  const toggleEmbalagem = (embalagemId) => {
    setSelectedEmbalagens(prev => 
      prev.includes(embalagemId) 
        ? prev.filter(id => id !== embalagemId)
        : [...prev, embalagemId]
    );
  };

  // Selecionar todas as pendentes de um pedido
  const selecionarTodasPedido = (pedidoKey) => {
    const pendentes = getPendentesPorPedido(pedidoKey).map(e => e.id);
    const todasSelecionadas = pendentes.every(id => selectedEmbalagens.includes(id));
    
    if (todasSelecionadas) {
      setSelectedEmbalagens(prev => prev.filter(id => !pendentes.includes(id)));
    } else {
      setSelectedEmbalagens(prev => [...new Set([...prev, ...pendentes])]);
    }
  };

  // Concluir pedido completo
  const handleConcluirPedido = (pedidoKey) => {
    const pendentes = getPendentesPorPedido(pedidoKey);
    if (pendentes.length === 0) {
      toast.error('Não há embalagens pendentes para este pedido');
      return;
    }
    setSelectedPedido(pedidoKey);
    setSelectedEmbalagens(pendentes.map(e => e.id));
    setLocalizacao('');
    setResponsavelConclusao('');
    setConcluirPedidoDialogOpen(true);
  };

  // Confirmar conclusão de múltiplas embalagens
  const handleConfirmarConclusaoMultipla = async () => {
    if (!responsavelConclusao.trim()) {
      toast.error('Informe o nome do responsável pela conclusão');
      return;
    }
    
    if (selectedEmbalagens.length === 0) {
      toast.error('Selecione pelo menos uma embalagem');
      return;
    }

    try {
      let sucessos = 0;
      let erros = 0;
      
      for (const embalagemId of selectedEmbalagens) {
        try {
          await embalagemAPI.concluir(embalagemId, { 
            localizacao: localizacao || null,
            responsavel_conclusao: responsavelConclusao 
          });
          sucessos++;
        } catch (e) {
          erros++;
        }
      }
      
      if (sucessos > 0) {
        toast.success(`${sucessos} embalagem(ns) concluída(s) com sucesso!`);
      }
      if (erros > 0) {
        toast.error(`${erros} embalagem(ns) não puderam ser concluídas`);
      }
      
      setConcluirPedidoDialogOpen(false);
      setSelectedPedido(null);
      setSelectedEmbalagens([]);
      setLocalizacao('');
      setResponsavelConclusao('');
      fetchData();
    } catch (error) {
      toast.error('Erro ao concluir embalagens');
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
          ℹ️ <strong>Dica:</strong> Você pode concluir todas as embalagens de um pedido de uma vez clicando em "Concluir Pedido", ou selecionar itens individuais.
        </p>
      </div>

      {/* Cards agrupados por pedido */}
      {Object.keys(embalagensPorPedido).length === 0 ? (
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-12 text-center">
          <p className="text-[#705A4D] font-sans">Nenhuma embalagem registrada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(embalagensPorPedido).map(([pedidoKey, pedidoData]) => {
            const pendentes = pedidoData.items.filter(e => !e.data_conclusao);
            const concluidas = pedidoData.items.filter(e => e.data_conclusao);
            const todasSelecionadas = pendentes.length > 0 && pendentes.every(e => selectedEmbalagens.includes(e.id));
            
            return (
              <div key={pedidoKey} className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                {/* Header do Pedido */}
                <div className="bg-[#E8D5C4] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Package size={24} className="text-[#6B4423]" />
                    <div>
                      <h3 className="font-serif font-bold text-[#3E2723] text-lg">
                        {pedidoData.pedido_numero || 'Produção para Estoque'}
                      </h3>
                      <p className="text-sm text-[#705A4D]">
                        {pedidoData.cliente_nome || 'Estoque interno'} • 
                        {pendentes.length > 0 && <span className="text-[#D97706] font-medium"> {pendentes.length} pendente(s)</span>}
                        {concluidas.length > 0 && <span className="text-[#2F855A]"> • {concluidas.length} concluída(s)</span>}
                      </p>
                    </div>
                  </div>
                  
                  {pendentes.length > 0 && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={todasSelecionadas}
                          onChange={() => selecionarTodasPedido(pedidoKey)}
                          className="w-5 h-5 text-[#6B4423] bg-[#FFFDF8] border-[#8B5A3C]/30 rounded focus:ring-[#6B4423]"
                        />
                        <span className="text-sm text-[#3E2723] font-medium">Selecionar todos</span>
                      </label>
                      <Button
                        onClick={() => handleConcluirPedido(pedidoKey)}
                        className="bg-[#2F855A] text-white hover:bg-[#276749]"
                      >
                        <CheckSquare size={18} weight="bold" className="mr-2" />
                        Concluir Pedido ({pendentes.length})
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tabela de itens */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F5E6D3]">
                      <tr>
                        <th className="w-12 px-4 py-3"></th>
                        <th className="text-left px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                        <th className="text-right px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Qtd</th>
                        <th className="text-left px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Responsável</th>
                        <th className="text-left px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Início</th>
                        <th className="text-left px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Status</th>
                        <th className="text-right px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidoData.items.map((embalagem) => (
                        <tr key={embalagem.id} className={`border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50 ${selectedEmbalagens.includes(embalagem.id) ? 'bg-[#C6F6D5]/30' : ''}`}>
                          <td className="px-4 py-3 text-center">
                            {!embalagem.data_conclusao && (
                              <input
                                type="checkbox"
                                checked={selectedEmbalagens.includes(embalagem.id)}
                                onChange={() => toggleEmbalagem(embalagem.id)}
                                className="w-5 h-5 text-[#6B4423] bg-[#FFFDF8] border-[#8B5A3C]/30 rounded focus:ring-[#6B4423]"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#4A3B32] font-sans font-medium">{embalagem.produto_nome}</td>
                          <td className="px-4 py-3 text-sm text-[#4A3B32] font-sans text-right font-bold">{embalagem.quantidade}</td>
                          <td className="px-4 py-3 text-sm text-[#4A3B32] font-sans">{embalagem.responsavel || '-'}</td>
                          <td className="px-4 py-3 text-sm text-[#4A3B32] font-sans">{formatDateTime(embalagem.data_inicio || embalagem.data_embalagem)}</td>
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3 text-right">
                            {!embalagem.data_conclusao && (
                              <Button
                                onClick={() => handleConcluir(embalagem.id)}
                                size="sm"
                                variant="outline"
                                className="text-[#2F855A] border-[#2F855A] hover:bg-[#2F855A] hover:text-white text-xs"
                              >
                                <CheckCircle size={14} weight="bold" className="mr-1" />
                                Concluir
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botão flutuante para concluir selecionados */}
      {selectedEmbalagens.length > 0 && (
        <div className="fixed bottom-20 right-6 z-[9999]">
          <Button
            onClick={() => {
              setLocalizacao('');
              setResponsavelConclusao('');
              setConcluirPedidoDialogOpen(true);
            }}
            className="bg-[#2F855A] text-white hover:bg-[#276749] shadow-lg px-6 py-3 text-lg"
          >
            <CheckSquare size={24} weight="bold" className="mr-2" />
            Concluir {selectedEmbalagens.length} Selecionado(s)
          </Button>
        </div>
      )}

      {/* Dialog para informar responsável e localização ao concluir */}
      <Dialog open={concluirDialogOpen} onOpenChange={(open) => { setConcluirDialogOpen(open); if (!open) { setSelectedEmbalagem(null); setLocalizacao(''); setResponsavelConclusao(''); } }}>
        <DialogContent className="bg-[#FFFDF8] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-[#3E2723] flex items-center gap-2">
              <CheckCircle size={24} className="text-[#2F855A]" />
              Concluir Embalagem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#705A4D] font-sans">
              Preencha as informações para concluir a embalagem e enviar ao estoque:
            </p>
            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1">
                <User size={16} className="inline mr-1" />
                Responsável pela Conclusão *
              </label>
              <input
                type="text"
                placeholder="Nome do responsável que concluiu a embalagem"
                value={responsavelConclusao}
                onChange={(e) => setResponsavelConclusao(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1">
                <MapPin size={16} className="inline mr-1" />
                Localização no Estoque
              </label>
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
                onClick={() => { setConcluirDialogOpen(false); setSelectedEmbalagem(null); setLocalizacao(''); setResponsavelConclusao(''); }} 
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

      {/* Dialog para concluir múltiplas embalagens */}
      <Dialog open={concluirPedidoDialogOpen} onOpenChange={(open) => { setConcluirPedidoDialogOpen(open); if (!open) { setSelectedPedido(null); setSelectedEmbalagens([]); setLocalizacao(''); setResponsavelConclusao(''); } }}>
        <DialogContent className="bg-[#FFFDF8] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-[#3E2723] flex items-center gap-2">
              <CheckSquare size={24} className="text-[#2F855A]" />
              Concluir {selectedEmbalagens.length} Embalagem(ns)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-[#C6F6D5]/30 rounded-lg p-4">
              <p className="text-sm text-[#2F855A] font-sans font-medium mb-2">
                Itens selecionados para conclusão:
              </p>
              <ul className="text-sm text-[#3E2723] space-y-1 max-h-32 overflow-y-auto">
                {selectedEmbalagens.map(embId => {
                  const emb = embalagens.find(e => e.id === embId);
                  return emb ? (
                    <li key={embId} className="flex justify-between">
                      <span>{emb.produto_nome}</span>
                      <span className="font-bold">{emb.quantidade} un</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1">
                <User size={16} className="inline mr-1" />
                Responsável pela Conclusão *
              </label>
              <input
                type="text"
                placeholder="Nome do responsável"
                value={responsavelConclusao}
                onChange={(e) => setResponsavelConclusao(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1">
                <MapPin size={16} className="inline mr-1" />
                Localização no Estoque (mesma para todos)
              </label>
              <input
                type="text"
                placeholder="Ex: Prateleira A3, Corredor 2..."
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button 
                type="button" 
                onClick={() => { setConcluirPedidoDialogOpen(false); setSelectedPedido(null); setSelectedEmbalagens([]); setLocalizacao(''); setResponsavelConclusao(''); }} 
                variant="outline"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmarConclusaoMultipla}
                className="bg-[#2F855A] text-white hover:bg-[#276749]"
              >
                <CheckSquare size={18} weight="bold" className="mr-2" />
                Concluir Todos ({selectedEmbalagens.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
