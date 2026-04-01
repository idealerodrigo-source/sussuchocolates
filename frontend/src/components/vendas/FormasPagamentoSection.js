import React from 'react';
import { Plus, Trash } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { formatCurrency } from '../../utils/formatters';

export default function FormasPagamentoSection({
  formasPagamento,
  novaFormaPagamento,
  onNovaFormaPagamentoChange,
  onAdicionarFormaPagamento,
  onRemoverFormaPagamento,
  calcularTotalFormasPagamento,
  calcularRestantePagamento,
  calcularSaldoAPagar,
  entregaPosterior,
  dataPrevisaoPagamento,
  observacoesPagamento,
  onEntregaPosteriorChange,
  onDataPrevisaoChange,
  onObservacoesChange,
}) {
  // Usar saldoAPagar se disponível, senão calcular restante normalmente
  const saldoTotal = calcularSaldoAPagar ? calcularSaldoAPagar() : calcularRestantePagamento() + calcularTotalFormasPagamento();
  const jaFoiPagoIntegralmente = saldoTotal <= 0.01;
  
  return (
    <>
      {/* Se já foi pago integralmente, mostrar mensagem */}
      {jaFoiPagoIntegralmente ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-green-600 text-2xl mb-2">✓</div>
          <p className="text-green-700 font-semibold">Pedido Pago Integralmente</p>
          <p className="text-green-600 text-sm mt-1">Não é necessário adicionar formas de pagamento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[#6B4423]">Formas de Pagamento *</label>
          
          {/* Lista de formas de pagamento adicionadas */}
          {formasPagamento.length > 0 && (
            <div className="bg-[#E8F5E9] rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-[#2F855A] mb-2">Pagamentos adicionados:</p>
              {formasPagamento.map((fp, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg">
                  <div>
                    <span className="font-medium text-[#3E2723]">{fp.tipo}</span>
                    {fp.tipo === 'Cartão de Crédito' && fp.parcelas > 1 && (
                      <span className="text-xs text-[#705A4D] ml-1">({fp.parcelas}x)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2F855A]">{formatCurrency(fp.valor)}</span>
                    <button
                      type="button"
                      onClick={() => onRemoverFormaPagamento(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-[#2F855A]/20">
                <span className="text-sm text-[#2F855A]">Total pago agora:</span>
                <span className="font-bold text-[#2F855A]">{formatCurrency(calcularTotalFormasPagamento())}</span>
              </div>
              {calcularRestantePagamento() > 0.01 && (
                <div className="flex justify-between text-orange-600">
                  <span className="text-sm">Restante:</span>
                  <span className="font-bold">{formatCurrency(calcularRestantePagamento())}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Adicionar nova forma de pagamento */}
          <div className="bg-[#F5E6D3]/50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-[#6B4423]">
              {formasPagamento.length > 0 ? 'Adicionar outra forma:' : 'Adicionar forma de pagamento:'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={novaFormaPagamento.tipo}
                onChange={(e) => onNovaFormaPagamentoChange({ ...novaFormaPagamento, tipo: e.target.value, parcelas: 1 })}
                className="px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-sm"
              >
                <option value="">Tipo...</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto</option>
                <option value="A Prazo">A Prazo (Fiado)</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={`Valor (restante: ${formatCurrency(calcularRestantePagamento())})`}
                value={novaFormaPagamento.valor}
                onChange={(e) => onNovaFormaPagamentoChange({ ...novaFormaPagamento, valor: e.target.value })}
                className="px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-sm"
              />
              <Button
                type="button"
                onClick={onAdicionarFormaPagamento}
                className="bg-[#6B4423] text-white hover:bg-[#8B5A3C]"
              >
                <Plus size={16} className="mr-1" /> Adicionar
              </Button>
            </div>
            
            {/* Parcelas para Cartão de Crédito */}
            {novaFormaPagamento.tipo === 'Cartão de Crédito' && (
              <div className="bg-[#FFFDF8] rounded-lg p-3">
                <label className="block text-xs font-medium text-[#6B4423] mb-2">Parcelas</label>
                <div className="flex flex-wrap gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => onNovaFormaPagamentoChange({ ...novaFormaPagamento, parcelas: num })}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        novaFormaPagamento.parcelas === num
                          ? 'bg-[#6B4423] text-white'
                          : 'bg-[#F5E6D3] text-[#6B4423] hover:bg-[#E8D5C4]'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Botão para preencher valor restante automaticamente */}
            {calcularRestantePagamento() > 0.01 && novaFormaPagamento.tipo && (
              <button
                type="button"
                onClick={() => onNovaFormaPagamentoChange({ ...novaFormaPagamento, valor: calcularRestantePagamento().toFixed(2) })}
                className="text-xs text-[#6B4423] hover:underline"
              >
                Usar valor restante ({formatCurrency(calcularRestantePagamento())})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Opção de entrega com pagamento posterior */}
      <div className="bg-[#F5E6D3]/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="entrega_posterior"
            checked={entregaPosterior}
            onChange={(e) => onEntregaPosteriorChange(e.target.checked)}
            className="w-5 h-5 text-[#6B4423] bg-[#FFFDF8] border-[#8B5A3C]/30 rounded focus:ring-[#6B4423]"
          />
          <label htmlFor="entrega_posterior" className="text-sm font-medium text-[#3E2723]">
            Entrega com pagamento posterior (a receber)
          </label>
        </div>
        
        {entregaPosterior && (
          <div className="ml-8 space-y-3 pt-2 border-t border-[#8B5A3C]/15">
            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1">
                Previsão de Pagamento
              </label>
              <input
                type="date"
                value={dataPrevisaoPagamento}
                onChange={(e) => onDataPrevisaoChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1">
                Observações do Pagamento
              </label>
              <textarea
                value={observacoesPagamento}
                onChange={(e) => onObservacoesChange(e.target.value)}
                placeholder="Ex: Pagamento na próxima entrega, cliente pagará em 2x, etc."
                rows="2"
                className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans resize-none"
              />
            </div>
            <p className="text-xs text-[#D97706] flex items-center gap-1">
              <span>⚠️</span>
              Esta venda ficará com status "Pagamento Pendente" até ser confirmado
            </p>
          </div>
        )}
      </div>
    </>
  );
}
