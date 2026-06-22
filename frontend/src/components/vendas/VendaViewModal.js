import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { FilePdf, Printer, Receipt } from '@phosphor-icons/react';

const formatarSabores = (sabores) => {
  if (!sabores || sabores.length === 0) return null;
  return sabores.map(s => `${s.quantidade === 0.5 ? '½' : s.quantidade} ${s.sabor || s.nome}`).join(' + ');
};

export function VendaViewModal({
  open,
  onOpenChange,
  venda,
  onGeneratePDF,
  onImprimirCupom,
}) {
  if (!venda) return null;

  const subtotal = venda.subtotal ?? (venda.items || []).reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const desconto = venda.valor_desconto || 0;
  const cancelada = venda.status_venda === 'cancelada';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#FFFDF8] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-[#3E2723] flex items-center gap-2 flex-wrap">
            Detalhes da Venda
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${venda.tipo_venda === 'direta' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {venda.tipo_venda === 'direta' ? 'Direta' : 'Pedido'}
            </span>
            {cancelada && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Cancelada</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#705A4D]">Cliente</p>
              <p className="font-medium text-[#3E2723]">{venda.cliente_nome || 'Consumidor'}</p>
            </div>
            <div>
              <p className="text-sm text-[#705A4D]">Data da Venda</p>
              <p className="font-medium text-[#3E2723]">{formatDateTime(venda.data_venda)}</p>
            </div>
            <div>
              <p className="text-sm text-[#705A4D]">Status do Pagamento</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                venda.status_pagamento === 'pago' ? 'bg-green-100 text-green-700' : 'bg-[#FED7AA] text-[#C2410C]'
              }`}>
                {venda.status_pagamento === 'pago' ? 'Pago' : 'A Receber'}
              </span>
            </div>
            <div>
              <p className="text-sm text-[#705A4D]">NFC-e</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                venda.nfce_emitida ? 'bg-green-100 text-green-700' : 'bg-[#FEFCBF] text-[#D97706]'
              }`}>
                {venda.nfce_emitida ? `Emitida${venda.nfce_numero ? ` Nº ${venda.nfce_numero}` : ''}` : 'Não emitida'}
              </span>
            </div>
          </div>

          {cancelada && venda.motivo_cancelamento && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Motivo do cancelamento</p>
              <p className="text-sm text-red-700">{venda.motivo_cancelamento}</p>
            </div>
          )}

          {/* Itens da Venda */}
          <div className="border-t border-[#8B5A3C]/15 pt-4">
            <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens da Venda</h3>
            <div className="space-y-2">
              {(venda.items || []).map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-[#F5E6D3]/50">
                  <div className="flex-1">
                    <p className="font-medium text-[#3E2723]">{item.produto_nome}</p>
                    <p className="text-sm text-[#705A4D]">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p>
                    {formatarSabores(item.sabores) && (
                      <p className="text-xs text-[#8B5A3C]">Sabores: {formatarSabores(item.sabores)}</p>
                    )}
                  </div>
                  <p className="font-medium text-[#3E2723]">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>

            {/* Totais */}
            <div className="mt-4 pt-4 border-t border-[#8B5A3C]/15 space-y-1">
              {desconto > 0 && (
                <>
                  <div className="flex justify-between text-sm text-[#705A4D]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto</span>
                    <span>-{formatCurrency(desconto)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-lg font-serif font-bold text-[#3E2723]">Total</span>
                <span className="text-lg font-serif font-bold text-[#6B4423]">{formatCurrency(venda.valor_total)}</span>
              </div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="bg-[#F5E6D3]/30 rounded-lg p-4 border border-[#8B5A3C]/20">
            <h3 className="text-sm font-semibold text-[#6B4423] mb-3">Pagamento</h3>
            <div className="space-y-2">
              {venda.formas_pagamento && venda.formas_pagamento.length > 0 ? (
                venda.formas_pagamento.map((fp, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-[#3E2723]">
                      {fp.tipo}
                      {fp.tipo === 'Cartão de Crédito' && fp.parcelas > 1 && ` (${fp.parcelas}x)`}
                    </span>
                    <span className="font-medium text-[#3E2723]">{formatCurrency(fp.valor)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-[#3E2723]">
                    {venda.forma_pagamento || 'Não informado'}
                    {venda.forma_pagamento === 'Cartão de Crédito' && venda.parcelas > 1 && ` (${venda.parcelas}x)`}
                  </span>
                  <span className="font-medium text-[#3E2723]">{formatCurrency(venda.valor_total)}</span>
                </div>
              )}

              {venda.status_pagamento === 'pendente' && (
                <div className="flex justify-between pt-2 border-t border-[#8B5A3C]/20">
                  <span className="text-sm font-semibold text-[#C2410C]">Saldo pendente</span>
                  <span className="font-bold text-[#C2410C]">
                    {formatCurrency(venda.valor_pendente ?? venda.valor_total)}
                  </span>
                </div>
              )}
              {venda.status_pagamento === 'pendente' && venda.data_previsao_pagamento && (
                <p className="text-xs text-[#705A4D]">
                  Previsão de pagamento: {new Date(venda.data_previsao_pagamento).toLocaleDateString('pt-BR')}
                </p>
              )}
              {venda.valor_pago_parcial != null && venda.valor_pago_parcial < venda.valor_total && venda.status_pagamento !== 'pendente' && (
                <p className="text-xs text-[#705A4D]">
                  Pago até o momento: {formatCurrency(venda.valor_pago_parcial)}
                </p>
              )}
            </div>
          </div>

          {/* Observações */}
          {venda.observacoes_pagamento && (
            <div className="border-t border-[#8B5A3C]/15 pt-4">
              <p className="text-sm text-[#705A4D]">Observações</p>
              <p className="text-[#3E2723]">{venda.observacoes_pagamento}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 flex-wrap">
            <Button
              onClick={() => onImprimirCupom(venda)}
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Printer size={18} weight="bold" className="mr-2" />
              Imprimir Cupom
            </Button>
            <Button
              onClick={() => onGeneratePDF(venda)}
              className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
            >
              <FilePdf size={18} weight="bold" className="mr-2" />
              Gerar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
