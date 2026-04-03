import React from 'react';
import { Plus, ShoppingBag, Factory } from '@phosphor-icons/react';
import { SearchableInput } from '../SearchableSelect';
import { QuickCreateProdutoModal } from '../QuickCreateModals';
import { formatarSabores } from '../SelecionarSaboresModal';

/**
 * Componente para adicionar produtos extras em vendas de pedido
 */
export function ProdutosExtrasSection({
  formData,
  setFormData,
  produtos,
  setProdutos,
  tipoEntregaPendente,
  setTipoEntregaPendente,
  quantidadeInicial,
  setQuantidadeInicial,
  onSelectProduto,
  formatCurrency,
  formatarQuantidade,
}) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-serif font-semibold text-purple-800 flex items-center gap-2">
          <Plus size={20} weight="bold" />
          Adicionar Produtos Extras
        </h3>
        <QuickCreateProdutoModal onProdutoCreated={(novoProduto) => setProdutos([...produtos, novoProduto])} />
      </div>
      
      <p className="text-xs text-purple-600 mb-3">
        Adicione produtos que não estavam no pedido original
      </p>
      
      {/* Tipo de entrega para itens extras */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setTipoEntregaPendente('imediata')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${
            tipoEntregaPendente === 'imediata'
              ? 'border-[#22C55E] bg-[#22C55E]/10 text-[#16A34A]'
              : 'border-purple-200 text-purple-600 hover:border-purple-300'
          }`}
        >
          <ShoppingBag size={18} weight={tipoEntregaPendente === 'imediata' ? 'fill' : 'regular'} />
          <span className="font-medium">Imediata</span>
        </button>
        <button
          type="button"
          onClick={() => setTipoEntregaPendente('a_produzir')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${
            tipoEntregaPendente === 'a_produzir'
              ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#D97706]'
              : 'border-purple-200 text-purple-600 hover:border-purple-300'
          }`}
        >
          <Factory size={18} weight={tipoEntregaPendente === 'a_produzir' ? 'fill' : 'regular'} />
          <span className="font-medium">A Produzir</span>
        </button>
      </div>
      
      {/* Busca de produtos */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <SearchableInput
            options={produtos.map(p => ({
              id: p.id, label: p.nome, subtitle: p.categoria, extra: formatCurrency(p.preco), preco: p.preco
            }))}
            onSelect={onSelectProduto}
            placeholder="Buscar produto extra..."
            emptyMessage="Nenhum produto encontrado"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-purple-600 mb-1">Qtd</label>
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-purple-200">
            <button
              type="button"
              onClick={() => setQuantidadeInicial(Math.max(0.1, Math.round((quantidadeInicial - 0.5) * 10) / 10))}
              disabled={quantidadeInicial <= 0.1}
              className="w-6 h-6 flex items-center justify-center rounded bg-purple-100 hover:bg-purple-200 disabled:opacity-50 text-purple-700 font-bold text-sm"
            >
              -
            </button>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={quantidadeInicial}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0.1;
                setQuantidadeInicial(Math.max(0.1, val));
              }}
              className="w-12 text-center bg-white border-0 text-purple-800 font-semibold text-sm rounded focus:ring-1 focus:ring-purple-400"
            />
            <button
              type="button"
              onClick={() => setQuantidadeInicial(Math.round((quantidadeInicial + 0.5) * 10) / 10)}
              className="w-6 h-6 flex items-center justify-center rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Lista de itens extras adicionados */}
      {formData.items.length > 0 && (
        <ItensExtrasList
          items={formData.items}
          formData={formData}
          setFormData={setFormData}
          formatCurrency={formatCurrency}
          formatarQuantidade={formatarQuantidade}
        />
      )}
    </div>
  );
}

/**
 * Lista de itens extras adicionados
 */
function ItensExtrasList({ items, formData, setFormData, formatCurrency, formatarQuantidade }) {
  const handleDecrease = (index) => {
    const item = items[index];
    if (item.quantidade > 0.1) {
      const novaQtd = Math.round((item.quantidade - 0.5) * 10) / 10;
      const newItems = [...items];
      newItems[index] = { ...item, quantidade: Math.max(0.1, novaQtd), subtotal: Math.max(0.1, novaQtd) * item.preco_unitario };
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleIncrease = (index) => {
    const item = items[index];
    const novaQtd = Math.round((item.quantidade + 0.5) * 10) / 10;
    const newItems = [...items];
    newItems[index] = { ...item, quantidade: novaQtd, subtotal: novaQtd * item.preco_unitario };
    setFormData({ ...formData, items: newItems });
  };

  const handleRemove = (index) => {
    setFormData({ ...formData, items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="mt-3 bg-white rounded-lg p-3 border border-purple-200 space-y-2">
      <h4 className="text-sm font-semibold text-purple-700 mb-2">Produtos Extras ({items.length})</h4>
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between bg-purple-50 p-2 rounded-lg">
          <div className="flex-1">
            <p className="font-medium text-[#3E2723] text-sm">{item.produto_nome}</p>
            {item.sabores && (
              <p className="text-xs text-[#705A4D]">Sabores: {formatarSabores(item.sabores)}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                item.tipo_entrega === 'imediata' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {item.tipo_entrega === 'imediata' ? 'Imediata' : 'A Produzir'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleDecrease(index)}
                className="w-5 h-5 rounded bg-purple-200 text-purple-700 flex items-center justify-center hover:bg-purple-300 text-xs"
              >-</button>
              <span className="w-8 text-center text-sm font-medium text-purple-800">{formatarQuantidade(item.quantidade)}</span>
              <button
                type="button"
                onClick={() => handleIncrease(index)}
                className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 text-xs"
              >+</button>
            </div>
            <span className="font-bold text-purple-800 text-sm min-w-[70px] text-right">{formatCurrency(item.subtotal)}</span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-red-500 hover:text-red-700 p-1"
            >×</button>
          </div>
        </div>
      ))}
      <div className="flex justify-between pt-2 border-t border-purple-200">
        <span className="font-medium text-purple-700 text-sm">Total Extras:</span>
        <span className="font-bold text-purple-800">{formatCurrency(items.reduce((acc, item) => acc + (item.subtotal || 0), 0))}</span>
      </div>
    </div>
  );
}
