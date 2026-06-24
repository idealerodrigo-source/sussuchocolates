import React, { useState } from 'react';
import { Receipt, QrCode, Printer, XCircle, CheckCircle, Warning } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const EMPRESA = {
  nome: '09.328.682 SUZETE CANDIDO XAVIER',
  fantasia: 'Sussu Chocolates',
  cnpj: '09.328.682/0001-30',
  ie: '904.290.17-30',
  endereco: 'Rua Quintino Bocaiuva, 737 - Centro',
  cidade: 'Jacarezinho - PR',
  cep: '86.400-000',
  telefone: '(43) 99967-6206',
  regime: 'Simples Nacional',
};

// ===== MODAL DE PRÉ-EMISSÃO =====
export function NFCePreviewModal({ open, onOpenChange, venda, emitindo, onConfirmarEmissao }) {
  if (!venda) return null;

  const subtotal = (venda.items || []).reduce((a, i) => a + i.subtotal, 0);
  const desconto = venda.valor_desconto || 0;
  const total = venda.valor_total;
  const isHomo = process.env.REACT_APP_NFCE_AMBIENTE !== 'producao';

  const formas = venda.formas_pagamento?.length > 0
    ? venda.formas_pagamento
    : [{ tipo: venda.forma_pagamento || '—', valor: total }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#FFFDF8]">
        <DialogHeader>
          <DialogTitle className="text-[#6B4423] font-serif flex items-center gap-2">
            <Receipt size={22} weight="bold" />
            Confirmar Emissão NFC-e
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Emitente */}
          <div className="bg-[#F5E6D3] rounded-lg p-4 text-center">
            <p className="font-serif font-bold text-[#3E2723] text-base">{EMPRESA.fantasia}</p>
            <p className="text-xs text-[#705A4D]">{EMPRESA.cnpj}</p>
            <p className="text-xs text-[#705A4D]">{EMPRESA.endereco} — {EMPRESA.cidade}</p>
            {isHomo && (
              <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold inline-block">
                ⚠️ HOMOLOGAÇÃO — SEM VALOR FISCAL
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[#705A4D]">Cliente</p>
              <p className="font-medium text-[#3E2723]">{venda.cliente_nome || 'Consumidor'}</p>
            </div>
            <div>
              <p className="text-xs text-[#705A4D]">Data</p>
              <p className="font-medium text-[#3E2723]">{formatDateTime(venda.data_venda)}</p>
            </div>
          </div>

          {/* Itens */}
          <div className="border-t border-[#8B5A3C]/15 pt-3">
            <p className="text-xs font-semibold text-[#6B4423] uppercase mb-2">
              Itens ({(venda.items || []).length})
            </p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {(venda.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start bg-[#FDFAF5] rounded p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#3E2723] truncate">{item.produto_nome}</p>
                    <p className="text-xs text-[#705A4D]">
                      {item.quantidade} × {formatCurrency(item.preco_unitario)}
                      {item.ncm && <span className="ml-2 text-[#9A8476]">NCM: {item.ncm}</span>}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#3E2723] ml-2 flex-shrink-0">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totais */}
          <div className="border-t border-[#8B5A3C]/15 pt-3 space-y-1.5">
            {desconto > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[#705A4D]">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(desconto)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-base font-bold text-[#3E2723] pt-1 border-t border-[#8B5A3C]/15">
              <span>TOTAL</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {formas.map((fp, i) => (
              <div key={i} className="flex justify-between text-sm text-[#705A4D]">
                <span>{fp.tipo}</span>
                <span>{formatCurrency(fp.valor)}</span>
              </div>
            ))}
          </div>

          {/* Aviso */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
            <Warning size={16} weight="bold" className="mt-0.5 flex-shrink-0" />
            <span>
              {isHomo
                ? 'Emissão em ambiente de homologação. Documento sem valor fiscal.'
                : 'Ao confirmar, a NFC-e será enviada para autorização na SEFAZ-PR. Esta ação não pode ser desfeita facilmente.'}
            </span>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1" disabled={emitindo}>
              Cancelar
            </Button>
            <Button
              onClick={onConfirmarEmissao}
              className="flex-1 bg-[#2F855A] text-white hover:bg-[#276749]"
              disabled={emitindo}
            >
              {emitindo ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span> Emitindo...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Receipt size={18} weight="bold" />
                  Emitir NFC-e
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== MODAL PÓS-EMISSÃO =====
export function NFCeViewModal({ open, onOpenChange, venda, onImprimir, onCancelar }) {
  const [cancelando, setCancelando] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  if (!venda || !venda.nfce_emitida) return null;

  const chave = venda.nfce_chave || '';
  const chaveFormatada = chave.replace(/(\d{4})/g, '$1 ').trim();

  const handleCancelar = async () => {
    if (justificativa.trim().length < 15) return;
    setCancelando(true);
    await onCancelar(venda, justificativa);
    setCancelando(false);
    setShowCancelForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#FFFDF8]">
        <DialogHeader>
          <DialogTitle className="text-[#6B4423] font-serif flex items-center gap-2">
            <QrCode size={22} weight="bold" />
            NFC-e Autorizada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle size={28} weight="fill" className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Documento Fiscal Autorizado</p>
              {venda.nfce_protocolo && (
                <p className="text-xs text-green-600">Protocolo: {venda.nfce_protocolo}</p>
              )}
            </div>
          </div>

          {/* Dados NF */}
          <div className="bg-white rounded-lg p-4 space-y-3 border border-[#8B5A3C]/15">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-[#705A4D]">Número</p>
                <p className="font-bold text-[#3E2723]">{venda.nfce_numero || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#705A4D]">Série</p>
                <p className="font-bold text-[#3E2723]">1</p>
              </div>
              <div>
                <p className="text-xs text-[#705A4D]">Valor</p>
                <p className="font-bold text-[#3E2723]">{formatCurrency(venda.valor_total)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#705A4D] mb-1">Chave de Acesso</p>
              <p className="font-mono text-xs text-[#3E2723] break-all bg-[#F5F5F5] p-2 rounded leading-relaxed">
                {chaveFormatada || '—'}
              </p>
            </div>
          </div>

          {/* QR Code */}
          {venda.nfce_qrcode && (
            <div className="text-center">
              <p className="text-xs text-[#705A4D] mb-2">Escaneie para consultar a NFC-e</p>
              <div className="inline-block bg-white p-3 rounded-lg border border-[#8B5A3C]/15">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(venda.nfce_qrcode)}`}
                  alt="QR Code NFC-e"
                  className="w-40 h-40"
                />
              </div>
            </div>
          )}

          <p className="text-center text-xs text-[#705A4D]">
            Consulte em: <span className="font-semibold text-[#6B4423]">www.sefaz.pr.gov.br/nfce</span>
          </p>

          {/* Cancelamento */}
          {showCancelForm ? (
            <div className="border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-red-700">Cancelar NFC-e</p>
              <textarea
                placeholder="Justificativa (mínimo 15 caracteres)"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm resize-none focus:outline-none focus:border-red-400"
              />
              <div className="flex gap-2">
                <Button onClick={() => setShowCancelForm(false)} variant="outline" size="sm" className="flex-1">
                  Voltar
                </Button>
                <Button
                  onClick={handleCancelar}
                  disabled={cancelando || justificativa.trim().length < 15}
                  size="sm"
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                >
                  {cancelando ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={() => onImprimir(venda)}
                variant="outline"
                className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Printer size={18} weight="bold" className="mr-2" />
                Imprimir DANFE
              </Button>
              <Button
                onClick={() => setShowCancelForm(true)}
                variant="outline"
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
              >
                <XCircle size={18} weight="bold" className="mr-2" />
                Cancelar NF-e
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
