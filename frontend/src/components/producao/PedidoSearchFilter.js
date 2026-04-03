import React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

/**
 * Componente de filtro de pedidos com busca por texto e data de entrega
 */
export function PedidoSearchFilter({
  pesquisaPedido,
  setPesquisaPedido,
  filtroDataEntrega,
  setFiltroDataEntrega,
}) {
  const hoje = new Date().toISOString().split('T')[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const depoisDeAmanha = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  return (
    <>
      {/* Filtros: Pesquisa + Data */}
      <div className="flex gap-2 mb-3">
        {/* Campo de pesquisa por texto */}
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5A3C]" />
          <input
            type="text"
            value={pesquisaPedido}
            onChange={(e) => setPesquisaPedido(e.target.value)}
            placeholder="Nome do cliente ou nº pedido..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
          />
          {pesquisaPedido && (
            <button
              type="button"
              onClick={() => setPesquisaPedido('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B5A3C] hover:text-[#6B4423]"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Filtro por data de entrega */}
        <div className="relative w-44">
          <input
            type="date"
            value={filtroDataEntrega}
            onChange={(e) => setFiltroDataEntrega(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
            title="Filtrar por data de entrega"
          />
          {filtroDataEntrega && (
            <button
              type="button"
              onClick={() => setFiltroDataEntrega('')}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-[#8B5A3C] hover:text-[#6B4423] text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Filtros rápidos de data */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setFiltroDataEntrega(hoje)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            filtroDataEntrega === hoje
              ? 'bg-[#6B4423] text-white'
              : 'bg-[#F5E6D3] text-[#6B4423] hover:bg-[#E8D5C4]'
          }`}
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => setFiltroDataEntrega(amanha)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            filtroDataEntrega === amanha
              ? 'bg-[#6B4423] text-white'
              : 'bg-[#F5E6D3] text-[#6B4423] hover:bg-[#E8D5C4]'
          }`}
        >
          Amanhã
        </button>
        <button
          type="button"
          onClick={() => setFiltroDataEntrega(depoisDeAmanha)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            filtroDataEntrega === depoisDeAmanha
              ? 'bg-[#6B4423] text-white'
              : 'bg-[#F5E6D3] text-[#6B4423] hover:bg-[#E8D5C4]'
          }`}
        >
          Depois de amanhã
        </button>
        {filtroDataEntrega && (
          <button
            type="button"
            onClick={() => setFiltroDataEntrega('')}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-600 hover:bg-red-200"
          >
            Limpar filtro
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Lista de pedidos clicáveis
 */
export function PedidosList({
  pedidos,
  selectedPedidoId,
  onSelectPedido,
  filtroDataEntrega,
  pesquisaPedido,
}) {
  return (
    <>
      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg max-h-48 overflow-y-auto">
        {pedidos.length === 0 ? (
          <div className="p-4 text-center text-[#705A4D]">
            {(pesquisaPedido || filtroDataEntrega) 
              ? `Nenhum pedido encontrado${filtroDataEntrega ? ` para ${new Date(filtroDataEntrega + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}`
              : 'Nenhum pedido pendente disponível'}
          </div>
        ) : (
          pedidos.map((pedido) => {
            const itensAProduzir = pedido.items?.filter(i => !i.ja_entregue && !i.ja_separado)?.length || 0;
            const isSelected = selectedPedidoId === pedido.id;
            
            return (
              <button
                key={pedido.id}
                type="button"
                onClick={() => onSelectPedido(pedido.id)}
                className={`w-full p-3 text-left border-b border-[#8B5A3C]/10 last:border-0 transition-colors ${
                  isSelected 
                    ? 'bg-[#6B4423]/10 border-l-4 border-l-[#6B4423]' 
                    : 'hover:bg-[#F5E6D3]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#3E2723]">{pedido.numero}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded">
                        {itensAProduzir} itens
                      </span>
                    </div>
                    <p className="text-sm text-[#705A4D]">{pedido.cliente_nome}</p>
                    {pedido.cliente_telefone && (
                      <p className="text-xs text-[#8B5A3C]">Tel: {pedido.cliente_telefone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {pedido.data_entrega && (
                      <p className="text-xs text-[#705A4D]">
                        Entrega: {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      
      <p className="text-xs text-[#705A4D] mt-2">
        {pedidos.length} pedido(s) encontrado(s) • Clique para selecionar
      </p>
    </>
  );
}
