import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../../utils/formatters';
import { Trash, PencilSimple, FilePdf, WhatsappLogo, Package } from '@phosphor-icons/react';

export function PedidoViewModal({
  open,
  onOpenChange,
  pedido,
  onEdit,
  onGeneratePDF,
  onWhatsApp,
  onMarcarSeparado,
  onMarcarEntregue,
  onExcluirItem
}) {
  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#FFFDF8] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-[#3E2723]">
            Detalhes do Pedido {pedido.numero}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#705A4D]">Cliente</p>
              <p className="font-medium text-[#3E2723]">{pedido.cliente_nome}</p>
            </div>
            <div>
              <p className="text-sm text-[#705A4D]">Status</p>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
                {getStatusLabel(pedido.status)}
              </span>
            </div>
            <div>
              <p className="text-sm text-[#705A4D]">Data do Pedido</p>
              <p className="font-medium text-[#3E2723]">{formatDateTime(pedido.data_pedido)}</p>
            </div>
            <div>
              <p className="text-sm text-[#705A4D]">Data de Entrega</p>
              <p className="font-medium text-[#3E2723]">
                {pedido.data_entrega ? formatDateTime(pedido.data_entrega) : 'Não definida'}
              </p>
            </div>
          </div>

          {/* Informações de Pagamento */}
          <div className="bg-[#F5E6D3]/30 rounded-lg p-4 border border-[#8B5A3C]/20">
            <h3 className="text-sm font-semibold text-[#6B4423] mb-3">Pagamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[#705A4D]">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  pedido.status_pagamento === 'pago' ? 'bg-green-100 text-green-700' :
                  pedido.status_pagamento === 'parcial' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {pedido.status_pagamento === 'pago' ? 'Pago' :
                   pedido.status_pagamento === 'parcial' ? 'Adiantamento' : 'Pendente'}
                </span>
              </div>
              {pedido.valor_pago > 0 && (
                <>
                  <div>
                    <p className="text-xs text-[#705A4D]">Valor Pago</p>
                    <p className="font-semibold text-green-600">{formatCurrency(pedido.valor_pago)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#705A4D]">Forma</p>
                    <p className="font-medium text-[#3E2723]">
                      {pedido.pagamento_forma}
                      {pedido.pagamento_parcelas > 1 && ` (${pedido.pagamento_parcelas}x)`}
                    </p>
                  </div>
                  {pedido.status_pagamento === 'parcial' && (
                    <div>
                      <p className="text-xs text-[#705A4D]">Saldo na Retirada</p>
                      <p className="font-semibold text-[#D97706]">
                        {formatCurrency((pedido.valor_saldo !== null && pedido.valor_saldo !== undefined) 
                          ? pedido.valor_saldo 
                          : pedido.valor_total - pedido.valor_pago)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="border-t border-[#8B5A3C]/15 pt-4">
            <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-3">Itens do Pedido</h3>
            <div className="space-y-2">
              {pedido.items.map((item, index) => (
                <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${item.ja_entregue ? 'bg-green-50 border border-green-200' : 'bg-[#F5E6D3]/50'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#3E2723]">{item.produto_nome}</p>
                      {item.ja_entregue && (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
                          Já Entregue
                        </span>
                      )}
                      {item.ja_separado && !item.ja_entregue && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium">
                          Separado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#705A4D]">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p>
                    {item.sabores && item.sabores.length > 0 && (
                      <p className="text-xs text-[#8B5A3C]">
                        Sabores: {item.sabores.map(s => `${s.quantidade === 0.5 ? '½' : s.quantidade} ${s.sabor || s.nome}`).join(' + ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#3E2723]">{formatCurrency(item.subtotal)}</p>
                    
                    {/* Botões de ação */}
                    {!item.ja_entregue && !item.ja_separado && pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-500 hover:bg-blue-50 text-xs"
                          onClick={() => onMarcarSeparado(pedido.id, index)}
                          title="Separar do estoque (pronto para entrega)"
                        >
                          <Package size={14} className="mr-1" />
                          Separar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-500 hover:bg-green-50 text-xs"
                          onClick={() => onMarcarEntregue(pedido.id, index)}
                          title="Marcar como já entregue ao cliente"
                        >
                          <Package size={14} className="mr-1" />
                          Entregar
                        </Button>
                      </>
                    )}
                    
                    {item.ja_separado && !item.ja_entregue && pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-500 hover:bg-green-50 text-xs"
                        onClick={() => onMarcarEntregue(pedido.id, index)}
                        title="Marcar como já entregue ao cliente"
                      >
                        <Package size={14} className="mr-1" />
                        Entregar
                      </Button>
                    )}
                    
                    {/* Botão de excluir item */}
                    {!item.ja_entregue && ['pendente', 'em_producao', 'em_embalagem'].includes(pedido.status) && pedido.items.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-400 hover:bg-red-50 text-xs"
                        onClick={() => onExcluirItem(pedido.id, index, item.produto_nome)}
                        title="Remover este item do pedido"
                      >
                        <Trash size={14} className="mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Total */}
            <div className="mt-4 pt-4 border-t border-[#8B5A3C]/15 flex justify-between">
              <span className="text-lg font-serif font-bold text-[#3E2723]">Total</span>
              <span className="text-lg font-serif font-bold text-[#6B4423]">{formatCurrency(pedido.valor_total)}</span>
            </div>
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <div className="border-t border-[#8B5A3C]/15 pt-4">
              <p className="text-sm text-[#705A4D]">Observações</p>
              <p className="text-[#3E2723]">{pedido.observacoes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => onWhatsApp(pedido)}
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <WhatsappLogo size={18} weight="bold" className="mr-2" />
              Enviar WhatsApp
            </Button>
            <Button
              onClick={() => onGeneratePDF(pedido)}
              variant="outline"
              className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
            >
              <FilePdf size={18} weight="bold" className="mr-2" />
              Gerar PDF
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit(pedido);
              }}
              className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
            >
              <PencilSimple size={18} weight="bold" className="mr-2" />
              Editar Pedido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
