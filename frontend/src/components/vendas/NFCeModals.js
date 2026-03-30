import React from 'react';
import { Receipt, QrCode, Printer, XCircle } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export function NFCePreviewModal({
  open,
  onOpenChange,
  venda,
  emitindo,
  onConfirmarEmissao,
}) {
  if (!venda) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#FFFDF8]">
        <DialogHeader>
          <DialogTitle className="text-[#6B4423] font-serif flex items-center gap-2">
            <Receipt size={24} weight="bold" />
            Pré-visualização da NFC-e
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Cabeçalho do Cupom */}
          <div className="bg-[#F5E6D3] rounded-lg p-4 text-center">
            <h3 className="font-serif font-bold text-[#6B4423]">SUSSU CHOCOLATES</h3>
            <p className="text-xs text-[#705A4D]">CNPJ: 09.328.682/0001-30</p>
            <p className="text-xs text-[#705A4D]">Jacarezinho - PR</p>
            <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
              NFC-e - HOMOLOGAÇÃO (Ambiente de Testes)
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="border-t border-[#8B5A3C]/20 pt-3">
            <p className="text-sm text-[#705A4D]">
              <strong>Cliente:</strong> {venda.cliente_nome}
            </p>
            <p className="text-sm text-[#705A4D]">
              <strong>Data:</strong> {formatDateTime(venda.data_venda)}
            </p>
          </div>

          {/* Itens */}
          <div className="border-t border-[#8B5A3C]/20 pt-3">
            <h4 className="text-sm font-semibold text-[#6B4423] mb-2">Itens:</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {venda.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm bg-white rounded p-2">
                  <div>
                    <p className="font-medium text-[#3E2723]">{item.produto_nome}</p>
                    <p className="text-xs text-[#705A4D]">
                      {item.quantidade} x {formatCurrency(item.preco_unitario)}
                    </p>
                  </div>
                  <p className="font-medium text-[#3E2723]">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totais */}
          <div className="border-t border-[#8B5A3C]/20 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-[#705A4D]">Subtotal:</span>
              <span className="text-[#3E2723]">{formatCurrency(venda.valor_total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#705A4D]">Desconto:</span>
              <span className="text-[#3E2723]">R$ 0,00</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-[#8B5A3C]/30 pt-2 mt-2">
              <span className="text-[#6B4423]">TOTAL:</span>
              <span className="text-[#3E2723]">{formatCurrency(venda.valor_total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#705A4D]">Pagamento:</span>
              <span className="text-[#3E2723]">{venda.forma_pagamento}</span>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <strong>Atenção:</strong> Ao confirmar, a NFC-e será enviada para autorização na SEFAZ. 
            Esta operação não pode ser desfeita facilmente.
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
              disabled={emitindo}
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirmarEmissao}
              className="flex-1 bg-[#2F855A] text-white hover:bg-[#276749]"
              disabled={emitindo}
            >
              {emitindo ? (
                <>Emitindo...</>
              ) : (
                <>
                  <Receipt size={18} weight="bold" className="mr-2" />
                  Confirmar e Emitir
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NFCeViewModal({
  open,
  onOpenChange,
  venda,
  onImprimir,
  onCancelar,
}) {
  if (!venda || !venda.nfce_emitida) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#FFFDF8]">
        <DialogHeader>
          <DialogTitle className="text-[#6B4423] font-serif flex items-center gap-2">
            <QrCode size={24} weight="bold" />
            NFC-e Emitida
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
              <Receipt size={20} weight="bold" />
              NFC-e AUTORIZADA
            </div>
            <p className="text-xs text-green-600 mt-1">
              Documento fiscal válido
            </p>
          </div>

          {/* Dados da NFC-e */}
          <div className="bg-white rounded-lg p-4 space-y-3 border border-[#8B5A3C]/20">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#705A4D] text-xs">Número:</p>
                <p className="font-semibold text-[#3E2723]">{venda.nfce_numero || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[#705A4D] text-xs">Série:</p>
                <p className="font-semibold text-[#3E2723]">001</p>
              </div>
            </div>
            
            <div>
              <p className="text-[#705A4D] text-xs">Chave de Acesso:</p>
              <p className="font-mono text-xs text-[#3E2723] break-all bg-gray-50 p-2 rounded">
                {venda.nfce_chave || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#705A4D] text-xs">Cliente:</p>
                <p className="font-medium text-[#3E2723]">{venda.cliente_nome}</p>
              </div>
              <div>
                <p className="text-[#705A4D] text-xs">Valor Total:</p>
                <p className="font-bold text-[#3E2723] text-lg">{formatCurrency(venda.valor_total)}</p>
              </div>
            </div>
          </div>

          {/* Itens Resumidos */}
          <div className="bg-[#F5E6D3]/50 rounded-lg p-3">
            <p className="text-xs text-[#705A4D] mb-2 font-medium">Itens ({venda.items.length}):</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {venda.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-[#3E2723]">{item.produto_nome} x{item.quantidade}</span>
                  <span className="text-[#705A4D]">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Consulta */}
          <div className="text-center text-xs text-[#705A4D] border-t border-[#8B5A3C]/20 pt-3">
            <p>Consulte a autenticidade em:</p>
            <p className="font-semibold text-[#6B4423]">www.sefaz.pr.gov.br/nfce</p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => onImprimir(venda)}
              variant="outline"
              className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Printer size={18} weight="bold" className="mr-2" />
              Imprimir
            </Button>
            <Button
              onClick={() => onCancelar(venda)}
              variant="outline"
              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
            >
              <XCircle size={18} weight="bold" className="mr-2" />
              Cancelar NFC-e
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
