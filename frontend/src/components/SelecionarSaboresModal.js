import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash, Cookie } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

// Lista de sabores disponíveis para recheio
const SABORES_DISPONIVEIS = [
  'Brigadeiro',
  'Beijinho',
  'Maracujá',
  'Cereja',
  'Morango',
  'Limão',
  'Ninho',
  'Nutella',
  'Pistache',
  'Amendoim',
  'Coco',
  'Doce de Leite',
  'Café',
  'Churros',
  'Oreo',
  'Paçoca',
  'Chocolate Branco',
  'Chocolate ao Leite',
  'Chocolate Meio Amargo',
];

/**
 * Verifica se um produto permite múltiplos sabores
 */
export function produtoPermiteMultiplosSabores(nomeProduto) {
  if (!nomeProduto) return false;
  const nome = nomeProduto.toLowerCase();
  return (
    nome.includes('2 sabores') ||
    nome.includes('dois sabores') ||
    nome.includes('3 sabores') ||
    nome.includes('três sabores') ||
    nome.includes('tres sabores') ||
    nome.includes('multi sabor') ||
    nome.includes('multisabor')
  );
}

/**
 * Extrai a quantidade de sabores do nome do produto
 */
export function getQuantidadeSabores(nomeProduto) {
  if (!nomeProduto) return 2;
  const nome = nomeProduto.toLowerCase();
  if (nome.includes('3 sabores') || nome.includes('três sabores') || nome.includes('tres sabores')) {
    return 3;
  }
  return 2; // Padrão é 2 sabores
}

/**
 * Modal para seleção de sabores com quantidades fracionadas
 */
export function SelecionarSaboresModal({ 
  open, 
  onOpenChange, 
  produto, 
  quantidade,
  onConfirm 
}) {
  const [saboresSelecionados, setSaboresSelecionados] = useState([]);
  const [saborAtual, setSaborAtual] = useState('');
  const [qtdSaborAtual, setQtdSaborAtual] = useState(0.5);

  const qtdSaboresPermitidos = produto ? getQuantidadeSabores(produto.nome) : 2;
  
  // Total de frações já distribuídas
  const totalDistribuido = saboresSelecionados.reduce((sum, s) => sum + s.quantidade, 0);
  const restante = quantidade - totalDistribuido;

  // Reset ao abrir o modal
  useEffect(() => {
    if (open) {
      setSaboresSelecionados([]);
      setSaborAtual('');
      setQtdSaborAtual(0.5);
    }
  }, [open]);

  const handleAdicionarSabor = () => {
    if (!saborAtual) return;
    if (qtdSaborAtual <= 0) return;
    if (qtdSaborAtual > restante) return;

    const existente = saboresSelecionados.find(s => s.sabor === saborAtual);
    if (existente) {
      // Incrementar quantidade do sabor existente
      setSaboresSelecionados(prev => 
        prev.map(s => s.sabor === saborAtual 
          ? { ...s, quantidade: s.quantidade + qtdSaborAtual }
          : s
        )
      );
    } else {
      // Adicionar novo sabor
      setSaboresSelecionados(prev => [...prev, { sabor: saborAtual, quantidade: qtdSaborAtual }]);
    }
    setSaborAtual('');
    setQtdSaborAtual(0.5);
  };

  const handleRemoverSabor = (sabor) => {
    setSaboresSelecionados(prev => prev.filter(s => s.sabor !== sabor));
  };

  const handleAjustarQuantidade = (sabor, delta) => {
    setSaboresSelecionados(prev => 
      prev.map(s => {
        if (s.sabor === sabor) {
          const novaQtd = Math.max(0.5, Math.min(s.quantidade + delta, s.quantidade + restante));
          return { ...s, quantidade: novaQtd };
        }
        return s;
      })
    );
  };

  const handleConfirmar = () => {
    if (saboresSelecionados.length === 0) {
      // Se não selecionou sabores, não adiciona detalhes
      onConfirm(null);
    } else {
      onConfirm(saboresSelecionados);
    }
    onOpenChange(false);
  };

  const handleDistribuirIgualmente = () => {
    // Pegar os primeiros N sabores e distribuir igualmente
    if (saboresSelecionados.length === 0) return;
    
    const qtdPorSabor = quantidade / saboresSelecionados.length;
    setSaboresSelecionados(prev => 
      prev.map(s => ({ ...s, quantidade: qtdPorSabor }))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#FFFDF8] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif text-[#3E2723] flex items-center gap-2">
            <Cookie size={24} className="text-[#6B4423]" />
            Selecionar Sabores do Recheio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do produto */}
          <div className="bg-[#F5E6D3]/50 rounded-lg p-3">
            <p className="font-medium text-[#3E2723]">{produto?.nome}</p>
            <p className="text-sm text-[#705A4D]">
              Quantidade: {quantidade} unidade(s) · Até {qtdSaboresPermitidos} sabores
            </p>
          </div>

          {/* Adicionar sabor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#6B4423]">Adicionar Sabor</label>
            <div className="flex gap-2">
              <select
                value={saborAtual}
                onChange={(e) => setSaborAtual(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
              >
                <option value="">Selecione um sabor...</option>
                {SABORES_DISPONIVEIS.map(sabor => (
                  <option key={sabor} value={sabor}>{sabor}</option>
                ))}
              </select>
              <input
                type="number"
                min="0.5"
                max={restante}
                step="0.5"
                value={qtdSaborAtual}
                onChange={(e) => setQtdSaborAtual(parseFloat(e.target.value) || 0.5)}
                className="w-20 px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-center"
              />
              <Button
                type="button"
                onClick={handleAdicionarSabor}
                disabled={!saborAtual || qtdSaborAtual <= 0 || qtdSaborAtual > restante}
                className="bg-[#6B4423] text-white hover:bg-[#8B5A3C]"
              >
                <Plus size={18} />
              </Button>
            </div>
            {restante > 0 && restante < quantidade && (
              <p className="text-xs text-[#8B5A3C]">
                Restante para distribuir: {restante.toFixed(1)} unidade(s)
              </p>
            )}
          </div>

          {/* Lista de sabores selecionados */}
          {saboresSelecionados.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#6B4423]">Sabores Selecionados</label>
                {saboresSelecionados.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleDistribuirIgualmente}
                    className="text-xs text-[#6B4423] hover:underline"
                  >
                    Distribuir igualmente
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {saboresSelecionados.map((item, index) => (
                  <div 
                    key={item.sabor} 
                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#8B5A3C]/20"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#6B4423] text-white text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-medium text-[#3E2723]">{item.sabor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAjustarQuantidade(item.sabor, -0.5)}
                        disabled={item.quantidade <= 0.5}
                        className="w-7 h-7 rounded-full bg-[#F5E6D3] hover:bg-[#E8D5C4] flex items-center justify-center disabled:opacity-50"
                      >
                        <Minus size={14} className="text-[#6B4423]" />
                      </button>
                      <span className="w-12 text-center font-semibold text-[#3E2723]">
                        {item.quantidade.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAjustarQuantidade(item.sabor, 0.5)}
                        disabled={restante <= 0}
                        className="w-7 h-7 rounded-full bg-[#6B4423] hover:bg-[#8B5A3C] flex items-center justify-center disabled:opacity-50"
                      >
                        <Plus size={14} className="text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoverSabor(item.sabor)}
                        className="ml-2 p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Resumo */}
              <div className="bg-[#E8D5C4]/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-[#3E2723]">
                  <span>Total distribuído:</span>
                  <span className="font-semibold">{totalDistribuido.toFixed(1)} de {quantidade}</span>
                </div>
                {restante > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Atenção: ainda falta distribuir {restante.toFixed(1)} unidade(s)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Exemplo de uso */}
          {saboresSelecionados.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <p className="font-medium mb-1">Como usar:</p>
              <p>Para 1 ovo com 2 sabores, adicione por exemplo:</p>
              <ul className="list-disc list-inside mt-1 text-xs">
                <li>Maracujá: 0.5</li>
                <li>Cereja: 0.5</li>
              </ul>
              <p className="mt-1 text-xs">Total = 1.0 (1 unidade completa)</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-2 border-t border-[#8B5A3C]/15">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmar}
              className="bg-[#6B4423] text-white hover:bg-[#8B5A3C]"
            >
              {saboresSelecionados.length > 0 ? 'Confirmar Sabores' : 'Adicionar sem especificar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Formata os sabores para exibição
 */
export function formatarSabores(sabores) {
  if (!sabores || sabores.length === 0) return null;
  return sabores.map(s => `${s.quantidade}x ${s.sabor}`).join(' + ');
}
