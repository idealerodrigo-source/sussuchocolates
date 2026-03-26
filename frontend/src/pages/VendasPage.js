import React, { useEffect, useState } from 'react';
import { vendasAPI, pedidosAPI, nfceAPI } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Plus, Receipt } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function VendasPage() {
  const [vendas, setVendas] = useState([]);
  const [pedidosConcluidos, setPedidosConcluidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    pedido_id: '',
    forma_pagamento: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vendasRes, pedidosRes] = await Promise.all([
        vendasAPI.listar(),
        pedidosAPI.listar(),
      ]);
      setVendas(vendasRes.data);
      
      const pedidosFinalizados = pedidosRes.data.filter(
        (p) => p.status === 'concluido' || p.status === 'em_embalagem'
      );
      setPedidosConcluidos(pedidosFinalizados);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await vendasAPI.criar(formData);
      toast.success('Venda registrada com sucesso');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar venda');
    }
  };

  const handleEmitirNFCe = async (vendaId) => {
    try {
      await nfceAPI.emitir(vendaId);
      toast.success('NFC-e emitida com sucesso');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao emitir NFC-e');
    }
  };

  const resetForm = () => {
    setFormData({
      pedido_id: '',
      forma_pagamento: '',
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  return (
    <div data-testid="vendas-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Vendas</h1>
          <p className="text-base font-sans text-[#705A4D]">Registre e acompanhe as vendas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-venda" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <Plus size={20} weight="bold" className="mr-2" />
              Registrar Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">Registrar Venda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  Apenas pedidos conclu\u00eddos ou em embalagem podem ser vendidos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Forma de Pagamento *</label>
                <select
                  required
                  value={formData.forma_pagamento}
                  onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                >
                  <option value="">Selecione...</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cart\u00e3o de Cr\u00e9dito">Cart\u00e3o de Cr\u00e9dito</option>
                  <option value="Cart\u00e3o de D\u00e9bito">Cart\u00e3o de D\u00e9bito</option>
                  <option value="PIX">PIX</option>
                  <option value="Boleto">Boleto</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  Registrar Venda
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
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Data</th>
                <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Pagamento</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor</th>
                <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">NFC-e</th>
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhuma venda registrada
                  </td>
                </tr>
              ) : (
                vendas.map((venda) => (
                  <tr key={venda.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{venda.cliente_nome}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(venda.data_venda)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{venda.forma_pagamento}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">
                      {formatCurrency(venda.valor_total)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {venda.nfce_emitida ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">
                          Emitida
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FEFCBF] text-[#D97706]">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!venda.nfce_emitida && (
                        <Button
                          onClick={() => handleEmitirNFCe(venda.id)}
                          size="sm"
                          className="bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423] text-xs"
                        >
                          <Receipt size={16} weight="bold" className="mr-1" />
                          Emitir NFC-e
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
    </div>
  );
}
