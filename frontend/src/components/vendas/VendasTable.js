import React, { useState } from 'react';
import { Receipt, Printer, Eye, X, XCircle, ArrowCounterClockwise, Factory } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { SortableHeader } from '../../hooks/useSortableTable';

const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'A Prazo',
];

function ModalReceberPagamento({ venda, onConfirmar, onFechar }) {
  const [formaPagamento, setFormaPagamento] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const handleConfirmar = async () => {
    if (!formaPagamento) {
      alert('Selecione a forma de pagamento');
      return;
    }
    setConfirmando(true);
    await onConfirmar(venda.id, formaPagamento);
    setConfirmando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className="relative bg-[#FFFDF8] rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-serif font-bold text-[#3E2723]">Confirmar Recebimento</h2>
          <button onClick={onFechar} className="text-[#8B5A3C] hover:text-[#6B4423] p-1">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Info da venda */}
        <div className="bg-[#F5E6D3] rounded-xl p-4 mb-5">
          <p className="text-sm text-[#705A4D]">Cliente</p>
          <p className="font-semibold text-[#3E2723]">{venda.cliente_nome}</p>
          <div className="flex justify-between mt-2">
            <p className="text-sm text-[#705A4D]">Valor a receber</p>
            <p className="text-lg font-bold text-[#2F855A]">{formatCurrency(venda.valor_total)}</p>
          </div>
        </div>

        {/* Seleção de forma de pagamento */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#6B4423] mb-3">Como foi pago?</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMAS_PAGAMENTO.map((forma) => (
              <button
                key={forma}
                type="button"
                onClick={() => setFormaPagamento(forma)}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  formaPagamento === forma
                    ? 'border-[#6B4423] bg-[#6B4423] text-[#F5E6D3]'
                    : 'border-[#8B5A3C]/30 text-[#3E2723] hover:border-[#6B4423] hover:bg-[#F5E6D3]'
                }`}
              >
                {forma === 'Dinheiro' && '💵 '}
                {forma === 'PIX' && '📱 '}
                {forma === 'Cartão de Crédito' && '💳 '}
                {forma === 'Cartão de Débito' && '💳 '}
                {forma === 'A Prazo' && '📋 '}
                {forma}
              </button>
            ))}
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onFechar}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={!formaPagamento || confirmando}
            className="flex-1 bg-[#2F855A] text-white hover:bg-[#276749]"
          >
            {confirmando ? 'Confirmando...' : 'Confirmar Recebimento'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VendasTable({
  vendas,
  sortConfig,
  onSort,
  onConfirmarPagamento,
  onEmitirNFCe,
  onVisualizarNFCe,
  onImprimirCupom,
  onCancelarNFCe,
  onCancelarVenda,
  onRestaurarVenda,
}) {
  const [vendaParaReceber, setVendaParaReceber] = useState(null);

  const handleConfirmarComForma = async (vendaId, formaPagamento) => {
    await onConfirmarPagamento(vendaId, formaPagamento);
    setVendaParaReceber(null);
  };

  return (
    <>
      {vendaParaReceber && (
        <ModalReceberPagamento
          venda={vendaParaReceber}
          onConfirmar={handleConfirmarComForma}
          onFechar={() => setVendaParaReceber(null)}
        />
      )}

      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#E8D5C4]">
              <tr>
                <SortableHeader label="Tipo" sortKey="tipo_venda" sortConfig={sortConfig} onSort={onSort} className="text-left" />
                <SortableHeader label="Cliente" sortKey="cliente_nome" sortConfig={sortConfig} onSort={onSort} className="text-left" />
                <SortableHeader label="Data" sortKey="data_venda" sortConfig={sortConfig} onSort={onSort} className="text-left" />
                <SortableHeader label="Pagamento" sortKey="forma_pagamento" sortConfig={sortConfig} onSort={onSort} className="text-left" />
                <SortableHeader label="Valor" sortKey="valor_total" sortConfig={sortConfig} onSort={onSort} className="text-right" />
                <SortableHeader label="Status" sortKey="status_venda" sortConfig={sortConfig} onSort={onSort} className="text-center" />
                <SortableHeader label="NFC-e" sortKey="nfce_emitida" sortConfig={sortConfig} onSort={onSort} className="text-center" />
                <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-[#705A4D] font-sans">
                    Nenhuma venda registrada
                  </td>
                </tr>
              ) : (
                vendas.map((venda) => (
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
                                onClick={() => setVendaParaReceber(venda)}
                                size="sm"
                                className="bg-[#2F855A] text-white hover:bg-[#276749] text-xs"
                                title="Confirmar Pagamento"
                              >
                                Receber
                              </Button>
                            )}
                            {!venda.nfce_emitida && (
                              <Button
                                onClick={() => onEmitirNFCe(venda)}
                                size="sm"
                                className="bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423] text-xs"
                                title="Pré-visualizar e Emitir NFC-e"
                              >
                                <Receipt size={16} weight="bold" className="mr-1" />
                                NFC-e
                              </Button>
                            )}
                            {!venda.nfce_emitida && (
                              <Button
                                onClick={() => onImprimirCupom(venda)}
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                                title="Imprimir Cupom de Venda"
                              >
                                <Printer size={16} weight="bold" />
                              </Button>
                            )}
                            {venda.nfce_emitida && (
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => onVisualizarNFCe(venda)}
                                  size="sm"
                                  variant="outline"
                                  className="text-[#6B4423] border-[#8B5A3C]/30 hover:bg-[#F5E6D3] text-xs"
                                  title="Visualizar NFC-e"
                                >
                                  <Eye size={16} weight="bold" />
                                </Button>
                                <Button
                                  onClick={() => onImprimirCupom(venda)}
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                                  title="Imprimir Cupom"
                                >
                                  <Printer size={16} weight="bold" />
                                </Button>
                                <Button
                                  onClick={() => onCancelarNFCe(venda)}
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
                                onClick={() => onCancelarVenda(venda)}
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
                            onClick={() => onRestaurarVenda(venda)}
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
    </>
  );
}
