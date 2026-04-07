import React from 'react';
import { Button } from '../ui/button';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../../utils/formatters';
import { Trash, PencilSimple, Eye, FilePdf, WhatsappLogo, XCircle } from '@phosphor-icons/react';
import { SortableHeader } from '../../hooks/useSortableTable';

// Função para formatar quantidade (mostra decimal se for fracionado)
const formatarQuantidade = (qtd) => {
  if (Number.isInteger(qtd)) {
    return `${qtd}x`;
  }
  return `${qtd.toFixed(1).replace('.', ',')}kg`;
};

export function PedidosTable({
  pedidos,
  sortConfig,
  onSort,
  onView,
  onEdit,
  onDelete,
  onCancel,
  onGeneratePDF,
  onWhatsApp
}) {
  return (
    <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F5E6D3]">
            <tr>
              <SortableHeader
                label="Número"
                sortKey="numero"
                sortConfig={sortConfig}
                onSort={onSort}
                className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]"
              />
              <SortableHeader
                label="Cliente"
                sortKey="cliente_nome"
                sortConfig={sortConfig}
                onSort={onSort}
                className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]"
              />
              <SortableHeader
                label="Data Pedido"
                sortKey="data_pedido"
                sortConfig={sortConfig}
                onSort={onSort}
                className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]"
              />
              <SortableHeader
                label="Entrega"
                sortKey="data_entrega"
                sortConfig={sortConfig}
                onSort={onSort}
                className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]"
              />
              <SortableHeader
                label="Pagamento"
                sortKey="status_pagamento"
                sortConfig={sortConfig}
                onSort={onSort}
                className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]"
              />
              <SortableHeader
                label="Status"
                sortKey="status"
                sortConfig={sortConfig}
                onSort={onSort}
                className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]"
              />
              <SortableHeader
                label="Valor"
                sortKey="valor_total"
                sortConfig={sortConfig}
                onSort={onSort}
                className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]"
              />
              <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[#705A4D]">
                  Nenhum pedido encontrado
                </td>
              </tr>
            ) : (
              pedidos.map((pedido) => (
                <tr key={pedido.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-[#3E2723] font-medium">{pedido.numero}</td>
                  <td className="px-6 py-4 text-sm text-[#4A3B32]">{pedido.cliente_nome}</td>
                  <td className="px-6 py-4 text-sm text-[#705A4D]">{formatDateTime(pedido.data_pedido)}</td>
                  <td className="px-6 py-4 text-sm text-[#705A4D]">
                    {pedido.data_entrega ? formatDateTime(pedido.data_entrega) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pedido.status_pagamento === 'pago' ? 'bg-green-100 text-green-700' :
                      pedido.status_pagamento === 'parcial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {pedido.status_pagamento === 'pago' ? 'Pago' :
                       pedido.status_pagamento === 'parcial' ? 'Adiantamento' : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
                      {getStatusLabel(pedido.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-[#3E2723]">
                    {formatCurrency(pedido.valor_total)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => onWhatsApp(pedido)}
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        title="Enviar WhatsApp"
                      >
                        <WhatsappLogo size={16} weight="bold" />
                      </Button>
                      <Button
                        onClick={() => onGeneratePDF(pedido)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        title="Gerar PDF"
                      >
                        <FilePdf size={16} weight="bold" />
                      </Button>
                      <Button
                        onClick={() => onView(pedido)}
                        size="sm"
                        variant="outline"
                        className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
                        title="Visualizar"
                        data-testid={`view-pedido-${pedido.numero}`}
                      >
                        <Eye size={16} weight="bold" />
                      </Button>
                      <Button
                        onClick={() => onEdit(pedido)}
                        size="sm"
                        className="bg-[#8B5A3C] text-white hover:bg-[#6B4423]"
                        title="Editar"
                        disabled={pedido.status === 'cancelado'}
                      >
                        <PencilSimple size={16} weight="bold" />
                      </Button>
                      {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
                        <Button
                          onClick={() => onCancel(pedido)}
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          title="Cancelar Pedido"
                        >
                          <XCircle size={16} weight="bold" />
                        </Button>
                      )}
                      {pedido.status === 'cancelado' && (
                        <Button
                          onClick={() => onDelete(pedido)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          title="Excluir Pedido"
                        >
                          <Trash size={18} />
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
  );
}
