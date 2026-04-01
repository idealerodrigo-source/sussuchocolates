import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Trash, Cookie, MagnifyingGlass } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

// Lista de sabores disponíveis para recheio (fallback)
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
  'Prestígio',
  'Tradicional',
  'Amarula',
  'Ovomaltine',
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
 * Extrai o padrão base do produto para buscar correspondentes
 * Ex: "Ovo 03 recheado 2 SABORES 325g" -> { prefixo: "Ovo 03 recheado", sufixo: "325g" }
 */
function extrairPadraoProduto(nomeProduto) {
  if (!nomeProduto) return null;
  
  // Remove "2 SABORES", "3 SABORES", etc. e divide o nome
  const regexSabores = /\s*(2|3|dois|três|tres)\s*sabores?\s*/gi;
  const partes = nomeProduto.split(regexSabores);
  
  if (partes.length >= 2) {
    // Pega a parte antes e depois do "X SABORES"
    const prefixo = partes[0].trim();
    const sufixo = partes[partes.length - 1].trim();
    return { prefixo, sufixo };
  }
  
  return null;
}

/**
 * Busca produtos correspondentes que podem ser usados como sabores
 */
function buscarProdutosCorrespondentes(produtoBase, todosProdutos) {
  if (!produtoBase || !todosProdutos || todosProdutos.length === 0) return [];
  
  const padrao = extrairPadraoProduto(produtoBase.nome);
  if (!padrao) return [];
  
  const { prefixo, sufixo } = padrao;
  
  // Busca produtos que:
  // 1. Começam com o mesmo prefixo (ex: "Ovo 03 recheado")
  // 2. Terminam com o mesmo sufixo (ex: "325g")
  // 3. NÃO contêm "SABORES" no nome
  // 4. NÃO são o próprio produto base
  
  const correspondentes = todosProdutos.filter(p => {
    if (p.id === produtoBase.id) return false;
    if (!p.nome) return false;
    
    const nomeNormalizado = p.nome.toLowerCase();
    const prefixoNormalizado = prefixo.toLowerCase();
    const sufixoNormalizado = sufixo.toLowerCase();
    
    // Não pode conter "sabores"
    if (nomeNormalizado.includes('sabores')) return false;
    
    // Deve começar com o prefixo
    if (!nomeNormalizado.startsWith(prefixoNormalizado)) return false;
    
    // Deve terminar com o sufixo (gramatura)
    if (!nomeNormalizado.endsWith(sufixoNormalizado)) return false;
    
    return true;
  });
  
  return correspondentes;
}

/**
 * Extrai o nome do sabor do nome completo do produto
 * Ex: "Ovo 03 recheado BRIGADEIRO 325g" com prefixo "Ovo 03 recheado" e sufixo "325g" -> "BRIGADEIRO"
 */
function extrairSaborDoNome(nomeProduto, prefixo, sufixo) {
  if (!nomeProduto) return nomeProduto;
  
  let sabor = nomeProduto;
  
  // Remove o prefixo
  if (prefixo && sabor.toLowerCase().startsWith(prefixo.toLowerCase())) {
    sabor = sabor.substring(prefixo.length).trim();
  }
  
  // Remove o sufixo
  if (sufixo && sabor.toLowerCase().endsWith(sufixo.toLowerCase())) {
    sabor = sabor.substring(0, sabor.length - sufixo.length).trim();
  }
  
  return sabor || nomeProduto;
}

/**
 * Modal para seleção de sabores com quantidades fracionadas
 * Agora usando produtos correspondentes em vez de lista genérica de sabores
 */
export function SelecionarSaboresModal({ 
  open, 
  onOpenChange, 
  produto, 
  quantidade,
  onConfirm,
  todosProdutos = [] // Lista de todos os produtos para buscar correspondentes
}) {
  const [saboresSelecionados, setSaboresSelecionados] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [qtdSaborAtual, setQtdSaborAtual] = useState(0.5);
  const [buscaSabor, setBuscaSabor] = useState('');

  const qtdSaboresPermitidos = produto ? getQuantidadeSabores(produto.nome) : 2;
  
  // Total de frações já distribuídas
  const totalDistribuido = saboresSelecionados.reduce((sum, s) => sum + s.quantidade, 0);
  const restante = quantidade - totalDistribuido;

  // Busca produtos correspondentes
  const produtosCorrespondentes = useMemo(() => {
    return buscarProdutosCorrespondentes(produto, todosProdutos);
  }, [produto, todosProdutos]);

  // Padrão do produto para extrair sabor
  const padraoProduto = useMemo(() => {
    return extrairPadraoProduto(produto?.nome);
  }, [produto]);

  // Usa produtos correspondentes se encontrar, senão usa lista genérica
  const usandoProdutosReais = produtosCorrespondentes.length > 0;

  // Filtra opções baseado na busca
  const opcoesFiltradas = useMemo(() => {
    const busca = buscaSabor.toLowerCase();
    
    if (usandoProdutosReais) {
      return produtosCorrespondentes.filter(p => 
        p.nome.toLowerCase().includes(busca)
      );
    } else {
      return SABORES_DISPONIVEIS.filter(s => 
        s.toLowerCase().includes(busca)
      );
    }
  }, [buscaSabor, usandoProdutosReais, produtosCorrespondentes]);

  // Reset ao abrir o modal
  useEffect(() => {
    if (open) {
      setSaboresSelecionados([]);
      setProdutoSelecionado(null);
      setQtdSaborAtual(0.5);
      setBuscaSabor('');
    }
  }, [open]);

  const handleAdicionarSabor = () => {
    if (!produtoSelecionado && !buscaSabor) return;
    if (qtdSaborAtual <= 0) return;
    if (qtdSaborAtual > restante) return;

    let saborParaAdicionar;
    let nomeCompleto;

    if (usandoProdutosReais && produtoSelecionado) {
      // Usar o nome do produto real
      nomeCompleto = produtoSelecionado.nome;
      saborParaAdicionar = extrairSaborDoNome(
        produtoSelecionado.nome, 
        padraoProduto?.prefixo, 
        padraoProduto?.sufixo
      );
    } else {
      // Usar sabor genérico
      saborParaAdicionar = buscaSabor || produtoSelecionado;
      nomeCompleto = saborParaAdicionar;
    }

    if (!saborParaAdicionar) return;

    const existente = saboresSelecionados.find(s => s.sabor === saborParaAdicionar);
    if (existente) {
      // Incrementar quantidade do sabor existente
      setSaboresSelecionados(prev => 
        prev.map(s => s.sabor === saborParaAdicionar 
          ? { ...s, quantidade: s.quantidade + qtdSaborAtual }
          : s
        )
      );
    } else {
      // Adicionar novo sabor
      setSaboresSelecionados(prev => [...prev, { 
        sabor: saborParaAdicionar, 
        quantidade: qtdSaborAtual,
        produto_nome_completo: nomeCompleto,
        produto_id: produtoSelecionado?.id || null
      }]);
    }
    setProdutoSelecionado(null);
    setBuscaSabor('');
    setQtdSaborAtual(0.5);
  };

  const handleSelecionarProduto = (produtoOuSabor) => {
    if (usandoProdutosReais) {
      setProdutoSelecionado(produtoOuSabor);
      setBuscaSabor(produtoOuSabor.nome);
    } else {
      setProdutoSelecionado(produtoOuSabor);
      setBuscaSabor(produtoOuSabor);
    }
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
      <DialogContent className="bg-[#FFFDF8] max-w-lg max-h-[90vh] overflow-y-auto">
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
            {usandoProdutosReais && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {produtosCorrespondentes.length} produtos correspondentes encontrados
              </p>
            )}
          </div>

          {/* Adicionar sabor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#6B4423]">
              {usandoProdutosReais ? 'Selecionar Produto/Sabor' : 'Adicionar Sabor'}
            </label>
            
            {/* Campo de busca */}
            <div className="relative">
              <MagnifyingGlass 
                size={18} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C]" 
              />
              <input
                type="text"
                value={buscaSabor}
                onChange={(e) => {
                  setBuscaSabor(e.target.value);
                  setProdutoSelecionado(null);
                }}
                placeholder={usandoProdutosReais ? "Buscar produto..." : "Buscar sabor..."}
                className="w-full pl-10 pr-4 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
              />
            </div>

            {/* Lista de opções */}
            {buscaSabor && opcoesFiltradas.length > 0 && !produtoSelecionado && (
              <div className="max-h-40 overflow-y-auto border border-[#8B5A3C]/20 rounded-lg bg-white">
                {opcoesFiltradas.map((opcao, index) => {
                  const nome = usandoProdutosReais ? opcao.nome : opcao;
                  const sabor = usandoProdutosReais 
                    ? extrairSaborDoNome(opcao.nome, padraoProduto?.prefixo, padraoProduto?.sufixo)
                    : opcao;
                  
                  return (
                    <button
                      key={usandoProdutosReais ? opcao.id : index}
                      type="button"
                      onClick={() => handleSelecionarProduto(opcao)}
                      className="w-full px-3 py-2 text-left hover:bg-[#F5E6D3] text-sm border-b border-[#8B5A3C]/10 last:border-b-0"
                    >
                      <span className="font-medium text-[#3E2723]">{sabor}</span>
                      {usandoProdutosReais && (
                        <span className="block text-xs text-[#705A4D]">{nome}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Controle de quantidade e adicionar */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 text-sm text-[#705A4D]">
                {produtoSelecionado && (
                  <span className="text-[#3E2723] font-medium">
                    {usandoProdutosReais 
                      ? extrairSaborDoNome(produtoSelecionado.nome, padraoProduto?.prefixo, padraoProduto?.sufixo)
                      : produtoSelecionado
                    }
                  </span>
                )}
              </div>
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
                disabled={!produtoSelecionado || qtdSaborAtual <= 0 || qtdSaborAtual > restante}
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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#6B4423] text-white text-xs flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium text-[#3E2723] block truncate">{item.sabor}</span>
                        {item.produto_nome_completo && item.produto_nome_completo !== item.sabor && (
                          <span className="text-xs text-[#705A4D] block truncate">{item.produto_nome_completo}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                {usandoProdutosReais ? (
                  <>
                    <li>Ovo 03 recheado BRIGADEIRO 325g: 0.5</li>
                    <li>Ovo 03 recheado MARACUJÁ 325g: 0.5</li>
                  </>
                ) : (
                  <>
                    <li>Maracujá: 0.5</li>
                    <li>Cereja: 0.5</li>
                  </>
                )}
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
  return sabores.map(s => {
    const qtd = s.quantidade === 0.5 ? '½' : s.quantidade;
    const nome = s.sabor || s.nome || 'Sem nome';
    return `${qtd} ${nome}`;
  }).join(' + ');
}
