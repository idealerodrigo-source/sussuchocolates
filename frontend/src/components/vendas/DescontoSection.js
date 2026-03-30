import React from 'react';
import { Trash } from '@phosphor-icons/react';
import { formatCurrency } from '../../utils/formatters';

export default function DescontoSection({
  descontoTipo,
  descontoValor,
  onDescontoTipoChange,
  onDescontoValorChange,
  onLimparDesconto,
  calcularSubtotal,
  calcularValorDesconto,
  calcularTotalComDesconto,
}) {
  return (
    <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg p-4 space-y-3">
      <label className="block text-sm font-medium text-[#92400E]">Aplicar Desconto</label>
      <div className="flex gap-3 items-center">
        <select
          value={descontoTipo}
          onChange={(e) => onDescontoTipoChange(e.target.value)}
          className="px-3 py-2 bg-[#FFFDF8] border border-[#F59E0B]/30 rounded-lg focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706] outline-none text-[#3E2723] text-sm"
        >
          <option value="valor">Valor (R$)</option>
          <option value="percentual">Percentual (%)</option>
        </select>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#705A4D] text-sm">
            {descontoTipo === 'percentual' ? '%' : 'R$'}
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            max={descontoTipo === 'percentual' ? 100 : calcularSubtotal()}
            placeholder="0,00"
            value={descontoValor || ''}
            onChange={(e) => onDescontoValorChange(parseFloat(e.target.value) || 0)}
            className="w-full pl-10 pr-4 py-2 bg-[#FFFDF8] border border-[#F59E0B]/30 rounded-lg focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706] outline-none text-[#3E2723]"
          />
        </div>
        {descontoValor > 0 && (
          <button
            type="button"
            onClick={onLimparDesconto}
            className="p-2 text-[#C53030] hover:bg-[#FED7D7] rounded-lg"
          >
            <Trash size={18} />
          </button>
        )}
      </div>
      {calcularValorDesconto() > 0 && (
        <div className="bg-white/50 rounded p-2 text-sm">
          <div className="flex justify-between text-[#705A4D]">
            <span>Subtotal:</span>
            <span>{formatCurrency(calcularSubtotal())}</span>
          </div>
          <div className="flex justify-between text-[#D97706]">
            <span>Desconto {descontoTipo === 'percentual' ? `(${descontoValor}%)` : ''}:</span>
            <span>- {formatCurrency(calcularValorDesconto())}</span>
          </div>
          <div className="flex justify-between font-bold text-[#3E2723] pt-1 border-t border-[#F59E0B]/20 mt-1">
            <span>Total a pagar:</span>
            <span>{formatCurrency(calcularTotalComDesconto())}</span>
          </div>
        </div>
      )}
    </div>
  );
}
