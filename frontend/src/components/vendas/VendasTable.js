import React, { useState } from 'react';
import { Receipt, Printer, Eye, X, XCircle, ArrowCounterClockwise, Factory, PencilSimple } from '@phosphor-icons/react';
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
  const valorPendente = venda.valor_pendente || venda.valor_total;
  const [formaPagamento, setFormaPagamento] = useState('');
  const [valorRecebido, setValorRecebido] = useState(valorPendente.toFixed(2));
  const [confirmando, setConfirmando] = useState(false);

  const valor = parseFloat(valorRecebido) || 0;
  const saldoRestante = Math.max(0, valorPendente - valor);
  const quitaTotal = valor >= valorPendente - 0.01;

  const handleConfirmar = async () => {
    if (!formaPagamento) { alert('Selecione a forma de pagamento'); return; }
    if (valor <= 0) { alert('Informe um valor válido'); return; }
    if (valor > valorPendente + 0.01) { alert(`O valor não pode ser maior que ${formatCurrency(valorPendente)}`); return; }
    setConfirmando(true);
    await onConfirmar(venda.id, formaPagamento, valor, quitaTotal);
    setConfirmando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className="relative bg-[#FFFDF8] rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-serif font-bold text-[#3E2723]">Confirmar Recebimento</h2>
          <button onClick={onFechar} className="text-[#8B5A3C] hover:text-[#6B4423] p-1"><X size={20} weight="bold" /></button>
        </div>
        <div className="bg-[#F5E6D3] rounded-xl p-4 mb-5">
          <p className="text-sm text-[#705A4D]">Cliente</p>
          <p className="font-semibold text-[#3E2723]">{venda.cliente_nome}</p>
          <div className="flex justify-between mt-2">
            <p className="text-sm text-[#705A4D]">Total da venda</p>
            <p className="text-sm font-medium text-[#3E2723]">{formatCurrency(venda.valor_total)}</p>
          </div>
          {venda.valor_pendente && venda.valor_pendente < venda.valor_total && (
            <div className="flex justify-between mt-1">
              <p className="text-sm text-[#705A4D]">Saldo pendente</p>
              <p className="text-lg font-bold text-[#C2410C]">{formatCurrency(venda.valor_pendente)}</p>
            </div>
          )}
          {(!venda.valor_pendente || venda.valor_pendente >= venda.valor_total) && (
            <div className="flex justify-between mt-1">
              <p className="text-sm text-[#705A4D]">A receber</p>
              <p className="text-lg font-bold text-[#2F855A]">{formatCurrency(valorPendente)}</p>
            </div>
          )}
        </div>
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#6B4423] mb-2">Valor recebido agora</p>
          <div className="flex items-center gap-2">
            <span className="text-[#6B4423] font-bold">R$</span>
            <input type="number" min="0.01" step="0.01" max={valorPendente} value={valorRecebido}
              onChange={(e) => setValorRecebido(e.target.value)}
              className="flex-1 px-3 py-2 border-2 border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-semibold text-lg" />
            <button type="button" onClick={() => setValorRecebido(valorPendente.toFixed(2))}
              className="px-3 py-2 text-xs bg-[#6B4423] text-white rounded-lg hover:bg-[#8B5A3C]">Total</button>
          </div>
          {valor > 0 && valor < valorPendente - 0.01 && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-700">⚠️ Saldo restante: <strong>{formatCurrency(saldoRestante)}</strong> — ficará como "A Receber"</p>
            </div>
          )}
          {quitaTotal && valor > 0 && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700">✓ Quita o valor total pendente</p>
            </div>
          )}
        </div>
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#6B4423] mb-3">Como foi pago?</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMAS_PAGAMENTO.map((forma) => (
              <button key={forma} type="button" onClick={() => setFormaPagamento(forma)}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${formaPagamento === forma ? 'border-[#6B4423] bg-[#6B4423] text-[#F5E6D3]' : 'border-[#8B5A3C]/30 text-[#3E2723] hover:border-[#6B4423] hover:bg-[#F5E6D3]'}`}>
                {forma === 'Dinheiro' && '💵 '}{forma === 'PIX' && '📱 '}{forma === 'Cartão de Crédito' && '💳 '}{forma === 'Cartão de Débito' && '💳 '}{forma === 'A Prazo' && '📋 '}{forma}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onFechar} className="flex-1">Cancelar</Button>
          <Button type="button" onClick={handleConfirmar} disabled={!formaPagamento || confirmando || valor <= 0}
            className={`flex-1 text-white ${quitaTotal ? 'bg-[#2F855A] hover:bg-[#276749]' : 'bg-[#D97706] hover:bg-[#B45309]'}`}>
            {confirmando ? 'Confirmando...' : quitaTotal ? 'Confirmar Recebimento' : 'Registrar Pagamento Parcial'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalEditarPagamento({ venda, onConfirmar, onFechar }) {
  const [formaPagamento, setFormaPagamento] = useState(venda.forma_pagamento || '');
  const [statusPagamento, setStatusPagamento] = useState(venda.status_pagamento || 'pago');
  const [valorPagoParcial, setValorPagoParcial] = useState(
    venda.valor_pago_parcial != null ? venda.valor_pago_parcial.toFixed(2) : venda.status_pagamento === 'pago' ? venda.valor_total.toFixed(2) : '0.00'
  );
  const [salvando, setSalvando] = useState(false);

  const valorTotal = venda.valor_total || 0;
  const valorPago = parseFloat(valorPagoParcial) || 0;
  const saldoCalculado = Math.max(0, valorTotal - valorPago);

  const handleSalvar = async () => {
    setSalvando(true);
    await onConfirmar(venda.id, {
      status_pagamento: statusPagamento,
      forma_pagamento: formaPagamento,
      valor_pago_parcial: valorPago,
      valor_pendente: statusPagamento === 'pago' ? 0 : saldoCalculado,
    });
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className="relative bg-[#FFFDF8] rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-serif font-bold text-[#3E2723]">Editar Pagamento</h2>
          <button onClick={onFechar} className="text-[#8B5A3C] hover:text-[#6B4423] p-1"><X size={20} weight="bold" /></button>
        </div>
        <div className="bg-[#F5E6D3] rounded-xl p-4 mb-5">
          <p className="text-sm text-[#705A4D]">Cliente</p>
          <p className="font-semibold text-[#3E2723]">{venda.cliente_nome}</p>
          <div className="flex justify-between mt-2">
            <p className="text-sm text-[#705A4D]">Valor total da venda</p>
            <p className="text-lg font-bold text-[#3E2723]">{formatCurrency(valorTotal)}</p>
          </div>
        </div>

        {/* Status */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#6B4423] mb-2">Status do pagamento</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStatusPagamento('pago')}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${statusPagamento === 'pago' ? 'border-[#2F855A] bg-[#2F855A] text-white' : 'border-[#8B5A3C]/30 text-[#3E2723] hover:border-[#2F855A]'}`}>
              ✓ Pago
            </button>
            <button type="button" onClick={() => setStatusPagamento('pendente')}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${statusPagamento === 'pendente' ? 'border-[#C2410C] bg-[#C2410C] text-white' : 'border-[#8B5A3C]/30 text-[#3E2723] hover:border-[#C2410C]'}`}>
              ⏳ A Receber
            </button>
          </div>
        </div>

        {/* Valor pago */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#6B4423] mb-2">Valor já pago</p>
          <div className="flex items-center gap-2">
            <span className="text-[#6B4423] font-bold">R$</span>
            <input type="number" min="0" step="0.01" max={valorTotal} value={valorPagoParcial}
              onChange={(e) => setValorPagoParcial(e.target.value)}
              className="flex-1 px-3 py-2 border-2 border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] outline-none text-[#3E2723] font-semibold" />
            <button type="button" onClick={() => setValorPagoParcial(valorTotal.toFixed(2))}
              className="px-3 py-2 text-xs bg-[#6B4423] text-white rounded-lg hover:bg-[#8B5A3C]">Total</button>
          </div>
          {statusPagamento === 'pendente' && saldoCalculado > 0 && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-700">Saldo pendente: <strong>{formatCurrency(saldoCalculado)}</strong></p>
            </div>
          )}
        </div>

        {/* Forma de pagamento */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#6B4423] mb-3">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMAS_PAGAMENTO.map((forma) => (
              <button key={forma} type="button" onClick={() => setFormaPagamento(forma)}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${formaPagamento === forma ? 'border-[#6B4423] bg-[#6B4423] text-[#F5E6D3]' : 'border-[#8B5A3C]/30 text-[#3E2723] hover:border-[#6B4423] hover:bg-[#F5E6D3]'}`}>
                {forma === 'Dinheiro' && '💵 '}{forma === 'PIX' && '📱 '}{forma === 'Cartão de Crédito' && '💳 '}{forma === 'Cartão de Débito' && '💳 '}{forma === 'A Prazo' && '📋 '}{forma}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onFechar} className="flex-1">Cancelar</Button>
          <Button type="button" onClick={handleSalvar} disabled={salvando}
            className="flex-1 bg-[#6B4423] text-white hover:bg-[#8B5A3C]">
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VendasTable({
  vendas, sortConfig, onSort, devedores = {}, onConfirmarPagamento, onEditarPagamento,
  onEmitirNFCe, onVisualizarNFCe, onImprimirCupom, onCancelarNFCe, onCancelarVenda, onRestaurarVenda,
}) {
  const [vendaParaReceber, setVendaParaReceber] = useState(null);
  const [vendaParaEditar, setVendaParaEditar] = useState(null);

  const handleConfirmarComForma = async (vendaId, formaPagamento, valorRecebido, quitaTotal) => {
    await onConfirmarPagamento(vendaId, formaPagamento, valorRecebido, quitaTotal);
    setVendaParaReceber(null);
  };

  const handleEditarPagamento = async (vendaId, dados) => {
    await onEditarPagamento(vendaId, dados);
    setVendaParaEditar(null);
  };

  return (
    <>
      {vendaParaReceber && (
        <ModalReceberPagamento venda={vendaParaReceber} onConfirmar={handleConfirmarComForma} onFechar={() => setVendaParaReceber(null)} />
      )}
      {vendaParaEditar && (
        <ModalEditarPagamento venda={vendaParaEditar} onConfirmar={handleEditarPagamento} onFechar={() => setVendaParaEditar(null)} />
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
                <tr><td colSpan="8" className="text-center py-12 text-[#705A4D] font-sans">Nenhuma venda registrada</td></tr>
              ) : (
                vendas.map((venda) => (
                  <tr key={venda.id} className={`border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50 ${venda.status_venda === 'cancelada' ? 'bg-red-50/50 opacity-75' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium inline-block w-fit ${venda.tipo_venda === 'direta' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {venda.tipo_venda === 'direta' ? 'Direta' : 'Pedido'}
                        </span>
                        {venda.tem_itens_a_produzir && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#FEF3C7] text-[#D97706] inline-flex items-center gap-1 w-fit">
                            <Factory size={10} weight="fill" /> Produção
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">
                      {venda.cliente_nome}
                      {devedores[venda.cliente_id] && (
                        <span className="ml-1 text-[10px] text-red-600 font-bold" title={`Devedor: R$ ${devedores[venda.cliente_id].total_pendente.toFixed(2).replace('.', ',')}`}>⚠️ Devedor</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(venda.data_venda)}</td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                      <div className="flex flex-col gap-0.5">
                        <span>{venda.forma_pagamento}</span>
                        {venda.valor_pago_parcial != null && venda.valor_pago_parcial < venda.valor_total && (
                          <span className="text-[10px] text-orange-600 font-medium">Pago: {formatCurrency(venda.valor_pago_parcial)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">
                      <div className="flex flex-col items-end gap-0.5">
                        <span>{formatCurrency(venda.valor_total)}</span>
                        {venda.valor_pendente != null && venda.valor_pendente > 0 && venda.status_pagamento === 'pendente' && (
                          <span className="text-[10px] text-orange-600 font-medium">Saldo: {formatCurrency(venda.valor_pendente)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {venda.status_venda === 'cancelada' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Cancelada</span>
                          {venda.motivo_cancelamento && (
                            <span className="text-[10px] text-red-600 max-w-[120px] truncate" title={venda.motivo_cancelamento}>{venda.motivo_cancelamento}</span>
                          )}
                        </div>
                      ) : venda.status_pagamento === 'pendente' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FED7AA] text-[#C2410C]">A Receber</span>
                          {venda.valor_pendente != null && venda.valor_pendente < venda.valor_total && (
                            <span className="text-[10px] text-orange-600 font-medium">Parcial</span>
                          )}
                          {venda.data_previsao_pagamento && (
                            <span className="text-[10px] text-[#705A4D]">Prev: {new Date(venda.data_previsao_pagamento).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">Pago</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {venda.nfce_emitida ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">Emitida</span>
                      ) : venda.status_venda === 'cancelada' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">-</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FEFCBF] text-[#D97706]">Pendente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {venda.status_venda !== 'cancelada' && (
                          <>
                            {venda.status_pagamento === 'pendente' && (
                              <Button onClick={() => setVendaParaReceber(venda)} size="sm"
                                className="bg-[#2F855A] text-white hover:bg-[#276749] text-xs" title="Confirmar Pagamento">
                                Receber
                              </Button>
                            )}
                            {!venda.nfce_emitida && (
                              <Button onClick={() => setVendaParaEditar(venda)} size="sm" variant="outline"
                                className="text-[#6B4423] border-[#8B5A3C]/30 hover:bg-[#F5E6D3] text-xs" title="Editar Pagamento">
                                <PencilSimple size={16} weight="bold" className="mr-1" />Pgto
                              </Button>
                            )}
                            {!venda.nfce_emitida && (
                              <Button onClick={() => onEmitirNFCe(venda)} size="sm"
                                className="bg-[#8B5A3C] text-[#F5E6D3] hover:bg-[#6B4423] text-xs" title="Emitir NFC-e">
                                <Receipt size={16} weight="bold" className="mr-1" />NFC-e
                              </Button>
                            )}
                            {!venda.nfce_emitida && (
                              <Button onClick={() => onImprimirCupom(venda)} size="sm" variant="outline"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs" title="Imprimir Cupom">
                                <Printer size={16} weight="bold" />
                              </Button>
                            )}
                            {venda.nfce_emitida && (
                              <div className="flex gap-1">
                                <Button onClick={() => onVisualizarNFCe(venda)} size="sm" variant="outline"
                                  className="text-[#6B4423] border-[#8B5A3C]/30 hover:bg-[#F5E6D3] text-xs">
                                  <Eye size={16} weight="bold" />
                                </Button>
                                <Button onClick={() => onImprimirCupom(venda)} size="sm" variant="outline"
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs">
                                  <Printer size={16} weight="bold" />
                                </Button>
                                <Button onClick={() => onCancelarNFCe(venda)} size="sm" variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 text-xs">
                                  <XCircle size={16} weight="bold" />
                                </Button>
                              </div>
                            )}
                            {!venda.nfce_emitida && (
                              <Button onClick={() => onCancelarVenda(venda)} size="sm" variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs" title="Cancelar Venda">
                                <X size={16} weight="bold" className="mr-1" />Cancelar
                              </Button>
                            )}
                          </>
                        )}
                        {venda.status_venda === 'cancelada' && (
                          <Button onClick={() => onRestaurarVenda(venda)} size="sm" variant="outline"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs">
                            <ArrowCounterClockwise size={16} weight="bold" className="mr-1" />Restaurar
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
