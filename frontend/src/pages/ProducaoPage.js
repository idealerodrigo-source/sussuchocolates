import React, { useEffect, useState, useMemo } from 'react';
import { producaoAPI, pedidosAPI, produtosAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { Plus, CheckCircle, Package, ShoppingCart, Trash, PlusCircle, ClipboardText, Factory, Printer, Lightning, MagnifyingGlass, ArrowCounterClockwise } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useSortableTable, SortableHeader } from '../hooks/useSortableTable';
import { formatarSabores } from '../components/SelecionarSaboresModal';
import { PedidoSearchFilter, PedidosList } from '../components/producao';

export default function ProducaoPage() {
  const [producoes, setProducoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [allPedidos, setAllPedidos] = useState([]); // Todos os pedidos para referência
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [todosDialogOpen, setTodosDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('producao'); // 'producao' ou 'relatorio'
  const [tipoProducao, setTipoProducao] = useState('estoque');
  const [responsavelTodos, setResponsavelTodos] = useState('');
  const [relatorioPendente, setRelatorioPendente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pesquisaPedido, setPesquisaPedido] = useState(''); // Pesquisa de pedidos no modal
  const [filtroDataEntrega, setFiltroDataEntrega] = useState(''); // Filtro por data de entrega
  
  // Filtrar produções pelo termo de pesquisa
  const filteredProducoes = useMemo(() => {
    if (!searchTerm.trim()) return producoes;
    const term = searchTerm.toLowerCase();
    return producoes.filter(p => 
      p.produto_nome?.toLowerCase().includes(term) ||
      p.pedido_numero?.toLowerCase().includes(term) ||
      p.responsavel?.toLowerCase().includes(term) ||
      p.observacoes?.toLowerCase().includes(term)
    );
  }, [producoes, searchTerm]);
  
  // Filtrar pedidos pelo termo de pesquisa e data de entrega no modal
  const pedidosFiltrados = useMemo(() => {
    let resultado = pedidos;
    
    // Filtro por data de entrega
    if (filtroDataEntrega) {
      const dataFiltro = new Date(filtroDataEntrega + 'T00:00:00');
      resultado = resultado.filter(pedido => {
        if (!pedido.data_entrega) return false;
        const dataEntrega = new Date(pedido.data_entrega);
        return dataEntrega.toDateString() === dataFiltro.toDateString();
      });
    }
    
    // Filtro por texto (nome/número)
    if (pesquisaPedido.trim()) {
      const termo = pesquisaPedido.toLowerCase().trim();
      resultado = resultado.filter(pedido => {
        const numero = (pedido.numero || '').toLowerCase();
        const cliente = (pedido.cliente_nome || '').toLowerCase();
        const telefone = (pedido.cliente_telefone || '').replace(/\D/g, '');
        const termoLimpo = termo.replace(/\D/g, '');
        
        return numero.includes(termo) || 
               cliente.includes(termo) ||
               (termoLimpo && telefone.includes(termoLimpo));
      });
    }
    
    return resultado;
  }, [pedidos, pesquisaPedido, filtroDataEntrega]);
  
  const { sortedData, requestSort, sortConfig } = useSortableTable(filteredProducoes, { key: 'data_criacao', direction: 'desc' });
  const [formData, setFormData] = useState({
    pedido_id: '',
    responsavel: '',
    observacoes: '',
  });
  
  const [itensProducao, setItensProducao] = useState([
    { produto_id: '', quantidade: '', sabores: null }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [producoesRes, pedidosRes, produtosRes, relatorioRes] = await Promise.all([
        producaoAPI.listar(),
        pedidosAPI.listar(),
        produtosAPI.listar(),
        producaoAPI.relatorioPendente(),
      ]);
      setProducoes(producoesRes.data);
      setAllPedidos(pedidosRes.data);
      setRelatorioPendente(relatorioRes.data);
      
      // Filtrar pedidos pendentes ou em produção
      // Excluir pedidos onde TODOS os itens já foram entregues ou separados
      const pedidosPendentes = pedidosRes.data.filter((p) => {
        if (p.status !== 'pendente' && p.status !== 'em_producao') {
          return false;
        }
        // Verificar se há pelo menos um item que NÃO foi entregue nem separado
        const temItensParaProduzir = p.items?.some(item => !item.ja_entregue && !item.ja_separado);
        return temItensParaProduzir;
      });
      setPedidos(pedidosPendentes);
      setProdutos(produtosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar itens do pedido selecionado
  // Desmembra itens com múltiplos sabores em itens separados para produção
  // IGNORA itens já entregues ou separados (ja_entregue = true ou ja_separado = true)
  const handlePedidoChange = (pedidoId) => {
    setFormData({ ...formData, pedido_id: pedidoId });
    
    if (pedidoId) {
      const pedido = allPedidos.find(p => p.id === pedidoId);
      if (pedido && pedido.items && pedido.items.length > 0) {
        // Converter itens do pedido para formato de produção
        // Se tem sabores, desmembra em itens separados por sabor
        // Ignora itens já entregues
        const itensFromPedido = [];
        
        pedido.items.forEach(item => {
          // Pular itens já entregues ou separados
          if (item.ja_entregue || item.ja_separado) {
            return;
          }
          
          if (item.sabores && item.sabores.length > 0) {
            // Desmembrar por sabor - cada sabor vira um item de produção separado
            // MAS mantém o produto original (ex: Ovo 07) em vez de trocar por outro (ex: Ovo 03)
            item.sabores.forEach(sabor => {
              // Tentar encontrar um produto do MESMO TIPO/TAMANHO com o sabor específico
              // Extrair o tipo base do produto (ex: "Ovo 07" de "Ovo 07 recheado 2 SABORES 610g")
              const nomeOriginal = item.produto_nome.toLowerCase();
              const tipoBase = nomeOriginal.match(/(ovo \d+|coração \d+|barra [pg])/i)?.[0] || '';
              
              let produtoCorrespondente = null;
              
              if (tipoBase) {
                // Buscar produto do mesmo tipo com o sabor específico
                produtoCorrespondente = produtos.find(p => {
                  const nomeProduto = p.nome.toLowerCase();
                  const saborNormalizado = sabor.sabor.toLowerCase();
                  return nomeProduto.includes(tipoBase.toLowerCase()) && 
                         nomeProduto.includes(saborNormalizado) && 
                         !nomeProduto.includes('sabores');
                });
              }
              
              // Se não encontrar produto correspondente do mesmo tipo, usar o original
              const produtoIdFinal = produtoCorrespondente?.id || item.produto_id;
              const produtoNomeFinal = produtoCorrespondente?.nome || `${item.produto_nome} (${sabor.sabor})`;
              
              itensFromPedido.push({
                produto_id: produtoIdFinal,
                produto_nome_original: item.produto_nome,
                quantidade: sabor.quantidade.toString(),
                sabor_info: sabor.sabor,
                sabores: null, // Já está desmembrado
                produto_nome_completo: produtoNomeFinal
              });
            });
          } else {
            // Item sem sabores múltiplos - manter como está
            itensFromPedido.push({
              produto_id: item.produto_id,
              quantidade: item.quantidade.toString(),
              sabores: null
            });
          }
        });
        
        if (itensFromPedido.length === 0) {
          toast.info('Todos os itens deste pedido já foram entregues');
        }
        
        setItensProducao(itensFromPedido.length > 0 ? itensFromPedido : [{ produto_id: '', quantidade: '' }]);
        toast.success(`${itensFromPedido.length} item(s) carregado(s) do pedido (sabores desmembrados)`);
      }
    } else {
      // Limpar itens se nenhum pedido selecionado
      setItensProducao([{ produto_id: '', quantidade: '', sabores: null }]);
    }
  };

  const addItemProducao = () => {
    setItensProducao([...itensProducao, { produto_id: '', quantidade: '', sabores: null }]);
  };

  const removeItemProducao = (index) => {
    if (itensProducao.length > 1) {
      const newItens = itensProducao.filter((_, i) => i !== index);
      setItensProducao(newItens);
    }
  };

  const updateItemProducao = (index, field, value) => {
    const newItens = [...itensProducao];
    newItens[index][field] = value;
    setItensProducao(newItens);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const itensValidos = itensProducao.filter(item => item.produto_id && item.quantidade);
    if (itensValidos.length === 0) {
      toast.error('Adicione pelo menos um produto com quantidade');
      return;
    }

    setSubmitting(true);
    
    try {
      const promises = itensValidos.map(item => {
        const data = {
          produto_id: item.produto_id,
          quantidade: parseFloat(item.quantidade),
          sabores: item.sabores || null,
          responsavel: formData.responsavel || null,
          observacoes: item.sabor_info 
            ? `Sabor: ${item.sabor_info}${formData.observacoes ? ` | ${formData.observacoes}` : ''}`
            : (formData.observacoes || null),
          tipo_producao: tipoProducao,
        };
        
        if (tipoProducao === 'pedido' && formData.pedido_id) {
          data.pedido_id = formData.pedido_id;
        }
        
        return producaoAPI.criar(data);
      });
      
      await Promise.all(promises);
      
      const produtosNomes = itensValidos.map(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        const saborInfo = item.sabor_info ? ` (${item.sabor_info})` : '';
        return `${item.quantidade}x ${produto?.nome || 'Produto'}${saborInfo}`;
      }).join(', ');
      
      toast.success(`Produção iniciada: ${produtosNomes}`);
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao iniciar produção');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConcluir = async (producaoId) => {
    try {
      const result = await producaoAPI.concluir(producaoId);
      toast.success(result.data.message || 'Produção concluída! Enviada para embalagem.');
      fetchData();
    } catch (error) {
      toast.error('Erro ao concluir produção');
    }
  };

  const handleRetornarProducao = async (producaoId) => {
    if (!window.confirm('Deseja retornar esta produção? O item voltará para o status de produção e a embalagem pendente será removida.')) {
      return;
    }
    try {
      const result = await producaoAPI.retornar(producaoId);
      toast.success(result.data.message || 'Produção retornada com sucesso!');
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao retornar produção';
      toast.error(errorMsg);
    }
  };

  const resetForm = () => {
    setFormData({
      pedido_id: '',
      responsavel: '',
      observacoes: '',
    });
    setItensProducao([{ produto_id: '', quantidade: '' }]);
    setTipoProducao('estoque');
    setPesquisaPedido(''); // Limpar pesquisa de pedidos
    setFiltroDataEntrega(''); // Limpar filtro de data
  };

  // Função para iniciar produção de todos os pedidos pendentes
  const handleIniciarTodosPedidos = async () => {
    // Filtrar apenas pedidos pendentes (não em produção)
    const pedidosPendentes = pedidos.filter(p => p.status === 'pendente');
    
    if (pedidosPendentes.length === 0) {
      toast.error('Não há pedidos pendentes para iniciar produção');
      return;
    }

    setSubmitting(true);
    
    try {
      // Criar uma lista de todas as produções a serem criadas
      const todasProducoes = [];
      
      pedidosPendentes.forEach(pedido => {
        if (pedido.items && pedido.items.length > 0) {
          pedido.items.forEach(item => {
            // Pular itens já entregues ou separados
            if (item.ja_entregue || item.ja_separado) {
              return;
            }
            todasProducoes.push({
              pedido_id: pedido.id,
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              responsavel: responsavelTodos || null,
              observacoes: `Produção em lote - ${pedido.numero}`,
              tipo_producao: 'pedido',
            });
          });
        }
      });
      
      if (todasProducoes.length === 0) {
        toast.error('Nenhum item para produzir (todos já foram entregues ou separados)');
        setSubmitting(false);
        return;
      }
      
      // Criar todas as produções
      const promises = todasProducoes.map(data => producaoAPI.criar(data));
      await Promise.all(promises);
      
      toast.success(`Produção iniciada para ${pedidosPendentes.length} pedido(s) - ${todasProducoes.length} item(s) total`);
      setTodosDialogOpen(false);
      setResponsavelTodos('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao iniciar produções');
    } finally {
      setSubmitting(false);
    }
  };

  // Obter pedidos apenas pendentes (não em produção)
  const pedidosApenasNovos = pedidos.filter(p => p.status === 'pendente');
  // Contar apenas itens não entregues nem separados
  const totalItensPendentes = pedidosApenasNovos.reduce((acc, p) => {
    const itensNaoEntregues = p.items?.filter(i => !i.ja_entregue && !i.ja_separado) || [];
    return acc + itensNaoEntregues.length;
  }, 0);

  const getProdutoNome = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || '';
  };

  // Calcular relatório de produção pendente
  const getRelatorioProdução = () => {
    const producoesPendentes = producoes.filter(p => !p.data_conclusao);
    
    // Agrupar por produto
    const porProduto = {};
    producoesPendentes.forEach(prod => {
      const produtoId = prod.produto_id;
      if (!porProduto[produtoId]) {
        porProduto[produtoId] = {
          produto_id: produtoId,
          produto_nome: prod.produto_nome,
          quantidade_total: 0,
          itens: []
        };
      }
      porProduto[produtoId].quantidade_total += prod.quantidade;
      porProduto[produtoId].itens.push(prod);
    });

    return Object.values(porProduto).sort((a, b) => b.quantidade_total - a.quantidade_total);
  };

  // Calcular estatísticas
  const getEstatisticas = () => {
    const pendentes = producoes.filter(p => !p.data_conclusao);
    const concluidas = producoes.filter(p => p.data_conclusao);
    const hoje = new Date().toISOString().split('T')[0];
    const concluidasHoje = concluidas.filter(p => p.data_conclusao?.startsWith(hoje));
    
    return {
      totalPendentes: pendentes.length,
      totalConcluidas: concluidas.length,
      concluidasHoje: concluidasHoje.length,
      quantidadePendente: pendentes.reduce((acc, p) => acc + p.quantidade, 0),
    };
  };

  const handleImprimir = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-[#6B4423] font-sans">Carregando...</p></div>;
  }

  const relatorio = getRelatorioProdução();
  const stats = getEstatisticas();

  return (
    <div data-testid="producao-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Produção</h1>
          <p className="text-base font-sans text-[#705A4D]">Controle a produção dos chocolates</p>
        </div>
        <div className="flex gap-3">
          {/* Botão para iniciar todos os pedidos */}
          {pedidosApenasNovos.length > 0 && (
            <Dialog open={todosDialogOpen} onOpenChange={setTodosDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="btn-iniciar-todos"
                  variant="outline"
                  className="border-[#D97706] text-[#D97706] hover:bg-[#FEF3C7]"
                >
                  <Lightning size={20} weight="bold" className="mr-2" />
                  Iniciar Todos ({pedidosApenasNovos.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FFFDF8] max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif text-[#3E2723] flex items-center gap-2">
                    <Lightning size={28} className="text-[#D97706]" weight="bold" />
                    Iniciar Todos os Pedidos
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-[#FEF3C7] border border-[#D97706]/30 rounded-lg p-4">
                    <p className="text-sm text-[#92400E] font-sans">
                      Isso irá iniciar a produção de <strong>{pedidosApenasNovos.length} pedido(s)</strong> pendente(s), 
                      totalizando <strong>{totalItensPendentes} item(s)</strong> para produzir.
                    </p>
                  </div>
                  
                  <div className="bg-[#F5E6D3]/50 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                    <p className="text-xs font-medium text-[#6B4423] mb-2">Pedidos que serão iniciados:</p>
                    <div className="space-y-2">
                      {pedidosApenasNovos.map(pedido => {
                        const itensAProduzir = pedido.items?.filter(i => !i.ja_entregue && !i.ja_separado)?.length || 0;
                        return (
                          <div key={pedido.id} className="flex justify-between items-center text-sm">
                            <span className="text-[#3E2723] font-medium">{pedido.numero}</span>
                            <span className="text-[#705A4D]">{pedido.cliente_nome} - {itensAProduzir} itens</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Responsável (opcional)</label>
                    <input
                      type="text"
                      placeholder="Nome do responsável pela produção"
                      value={responsavelTodos}
                      onChange={(e) => setResponsavelTodos(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button 
                      type="button" 
                      onClick={() => { setTodosDialogOpen(false); setResponsavelTodos(''); }} 
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleIniciarTodosPedidos}
                      className="bg-[#D97706] text-white hover:bg-[#B45309]"
                      disabled={submitting}
                    >
                      {submitting ? 'Iniciando...' : (
                        <>
                          <Lightning size={18} weight="bold" className="mr-2" />
                          Iniciar {pedidosApenasNovos.length} Pedido(s)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Botão para nova produção individual */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="btn-add-producao" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                <Plus size={20} weight="bold" className="mr-2" />
                Iniciar Produção
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-[#FFFDF8] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-[#3E2723]">Iniciar Nova Produção</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoProducao('pedido')}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    tipoProducao === 'pedido'
                      ? 'border-[#6B4423] bg-[#F5E6D3]'
                      : 'border-[#8B5A3C]/30 hover:border-[#8B5A3C]/50'
                  }`}
                >
                  <ShoppingCart size={28} className={tipoProducao === 'pedido' ? 'text-[#6B4423]' : 'text-[#705A4D]'} weight="bold" />
                  <span className={`text-sm font-medium ${tipoProducao === 'pedido' ? 'text-[#6B4423]' : 'text-[#705A4D]'}`}>
                    Produção com Pedido
                  </span>
                  <span className="text-xs text-[#705A4D]">Vinculada a um pedido</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoProducao('estoque')}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    tipoProducao === 'estoque'
                      ? 'border-[#6B4423] bg-[#F5E6D3]'
                      : 'border-[#8B5A3C]/30 hover:border-[#8B5A3C]/50'
                  }`}
                >
                  <Package size={28} className={tipoProducao === 'estoque' ? 'text-[#6B4423]' : 'text-[#705A4D]'} weight="bold" />
                  <span className={`text-sm font-medium ${tipoProducao === 'estoque' ? 'text-[#6B4423]' : 'text-[#705A4D]'}`}>
                    Produção para Estoque
                  </span>
                  <span className="text-xs text-[#705A4D]">Sem pedido vinculado</span>
                </button>
              </div>

              {tipoProducao === 'pedido' && (
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-2">Buscar Pedido *</label>
                  
                  <PedidoSearchFilter
                    pesquisaPedido={pesquisaPedido}
                    setPesquisaPedido={setPesquisaPedido}
                    filtroDataEntrega={filtroDataEntrega}
                    setFiltroDataEntrega={setFiltroDataEntrega}
                  />
                  
                  <PedidosList
                    pedidos={pedidosFiltrados}
                    selectedPedidoId={formData.pedido_id}
                    onSelectPedido={handlePedidoChange}
                    filtroDataEntrega={filtroDataEntrega}
                    pesquisaPedido={pesquisaPedido}
                  />
                  
                  {formData.pedido_id && (
                    <p className="text-xs text-[#2F855A] mt-1 font-sans">
                      ✓ Os itens do pedido foram carregados automaticamente abaixo
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[#6B4423]">Produtos a Produzir *</label>
                  <Button
                    type="button"
                    onClick={addItemProducao}
                    size="sm"
                    variant="outline"
                    className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
                  >
                    <PlusCircle size={16} weight="bold" className="mr-1" />
                    Adicionar Produto
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {itensProducao.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-[#F5E6D3]/50 rounded-lg">
                      <div className="flex-1">
                        <select
                          required
                          value={item.produto_id}
                          onChange={(e) => updateItemProducao(index, 'produto_id', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                        >
                          <option value="">Selecione um produto...</option>
                          {produtos.map((produto) => (
                            <option key={produto.id} value={produto.id}>{produto.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          placeholder="Qtd"
                          value={item.quantidade}
                          onChange={(e) => updateItemProducao(index, 'quantidade', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans text-sm"
                        />
                      </div>
                      {itensProducao.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItemProducao(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                        >
                          <Trash size={18} weight="bold" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {itensProducao.some(item => item.produto_id && item.quantidade) && (
                  <div className="bg-[#E8D5C4] rounded-lg p-3 mt-2">
                    <p className="text-xs font-medium text-[#6B4423] mb-2">Resumo da Produção:</p>
                    <div className="space-y-2">
                      {itensProducao.filter(item => item.produto_id && item.quantidade).map((item, index) => (
                        <div key={index} className="bg-[#FFFDF8] rounded p-2">
                          <span className="text-xs text-[#3E2723] font-medium">
                            {item.quantidade}x {getProdutoNome(item.produto_id)}
                          </span>
                          {item.sabor_info && (
                            <span className="text-xs text-[#6B4423] ml-1">
                              (Sabor: {item.sabor_info})
                            </span>
                          )}
                          {item.sabores && item.sabores.length > 0 && (
                            <p className="text-xs text-[#8B5A3C] mt-1 ml-2">
                              → Sabores: {formatarSabores(item.sabores)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Responsável</label>
                  <input
                    type="text"
                    placeholder="Nome do responsável pela produção"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-1">Observações</label>
                  <textarea
                    placeholder="Observações sobre a produção..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                  disabled={submitting}
                >
                  {submitting ? 'Iniciando...' : 'Iniciar Produção'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-[#8B5A3C]/15">
          <button
            onClick={() => setActiveTab('producao')}
            className={`px-6 py-3 font-sans font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'producao'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <Factory size={18} weight="bold" />
            Produções
          </button>
          <button
            onClick={() => setActiveTab('relatorio')}
            className={`px-6 py-3 font-sans font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'relatorio'
                ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                : 'text-[#705A4D] hover:text-[#6B4423]'
            }`}
          >
            <ClipboardText size={18} weight="bold" />
            Relatório de Produção
          </button>
        </div>
      </div>

      {/* Tab: Produções */}
      {activeTab === 'producao' && (
        <>
          {/* Campo de Pesquisa */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <MagnifyingGlass size={20} weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C]" />
              <input
                type="text"
                placeholder="Pesquisar por produto, pedido, responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans placeholder:text-[#8B5A3C]/60"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B5A3C] hover:text-[#6B4423]">✕</button>
              )}
            </div>
            {searchTerm && (
              <p className="text-xs text-[#705A4D] mt-1">Encontrados: {filteredProducoes.length} de {producoes.length} produções</p>
            )}
          </div>

          {/* Card de Resumo - Produção Pendente por Produto/Sabor */}
          {relatorioPendente && relatorioPendente.produtos_agrupados && relatorioPendente.produtos_agrupados.length > 0 && (
            <div className="mb-6 bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border border-[#F59E0B]/30 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardText size={20} className="text-[#D97706]" weight="fill" />
                <h3 className="text-sm font-semibold text-[#92400E]">
                  Resumo: Produção Pendente por Produto ({relatorioPendente.total_itens_pendentes} itens)
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {relatorioPendente.produtos_agrupados.map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-white/80 rounded-lg p-2 border border-[#F59E0B]/20"
                  >
                    <p className="text-lg font-bold text-[#D97706]">
                      {item.quantidade_total.toFixed(1)}
                    </p>
                    <p className="text-xs text-[#92400E] font-medium truncate" title={item.produto_nome}>
                      {item.produto_nome}
                    </p>
                    {item.sabor && (
                      <p className="text-[10px] text-[#B45309] truncate">
                        Sabor: {item.sabor}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#92400E] mt-2 italic">
                * Use este resumo para planejar a produção. Ex: "Faltam 10.5 ovos sabor Prestígio"
              </p>
            </div>
          )}

        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#E8D5C4]">
                <tr>
                  <SortableHeader label="Referência" sortKey="pedido_numero" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                  <SortableHeader label="Tipo" sortKey="tipo_producao" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                  <SortableHeader label="Produto" sortKey="produto_nome" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                  <SortableHeader label="Quantidade" sortKey="quantidade" sortConfig={sortConfig} onSort={requestSort} className="text-right" />
                  <SortableHeader label="Responsável" sortKey="responsavel" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                  <SortableHeader label="Início" sortKey="data_inicio" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                  <SortableHeader label="Conclusão" sortKey="data_conclusao" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                  <SortableHeader label="Status" sortKey="data_conclusao" sortConfig={sortConfig} onSort={requestSort} className="text-left" />
                  <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-[#705A4D] font-sans">
                      Nenhuma produção registrada
                    </td>
                  </tr>
                ) : (
                  sortedData.map((producao) => (
                    <tr key={producao.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{producao.pedido_numero || '-'}</td>
                      <td className="px-6 py-4">
                        {producao.tipo_producao === 'estoque' || (producao.pedido_numero && producao.pedido_numero.startsWith('EST-')) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#E8D5C4] text-[#6B4423]">
                            <Package size={12} weight="bold" />
                            Estoque
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#DBEAFE] text-[#1E40AF]">
                            <ShoppingCart size={12} weight="bold" />
                            Pedido
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[#4A3B32] font-sans">{producao.produto_nome}</div>
                        {producao.sabores && producao.sabores.length > 0 && (
                          <div className="text-xs text-[#8B5A3C] mt-0.5">
                            Sabores: {formatarSabores(producao.sabores)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">{producao.quantidade}</td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{producao.responsavel || '-'}</td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">{formatDateTime(producao.data_inicio)}</td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans">
                        {producao.data_conclusao ? formatDateTime(producao.data_conclusao) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {producao.data_conclusao ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#C6F6D5] text-[#2F855A]">
                            Concluído
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FEFCBF] text-[#D97706]">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!producao.data_conclusao ? (
                          <Button
                            onClick={() => handleConcluir(producao.id)}
                            size="sm"
                            className="bg-[#2F855A] text-white hover:bg-[#276749] text-xs"
                          >
                            <CheckCircle size={16} weight="bold" className="mr-1" />
                            Concluir
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleRetornarProducao(producao.id)}
                            size="sm"
                            variant="outline"
                            className="border-orange-400 text-orange-600 hover:bg-orange-50 text-xs"
                          >
                            <ArrowCounterClockwise size={16} weight="bold" className="mr-1" />
                            Retornar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Tab: Relatório de Produção */}
      {activeTab === 'relatorio' && (
        <div className="space-y-6">
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-5">
              <p className="text-sm font-sans text-[#705A4D] mb-1">Produções Pendentes</p>
              <p className="text-3xl font-serif font-bold text-[#D97706]">{stats.totalPendentes}</p>
            </div>
            <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-5">
              <p className="text-sm font-sans text-[#705A4D] mb-1">Quantidade Total a Produzir</p>
              <p className="text-3xl font-serif font-bold text-[#6B4423]">{stats.quantidadePendente}</p>
            </div>
            <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-5">
              <p className="text-sm font-sans text-[#705A4D] mb-1">Concluídas Hoje</p>
              <p className="text-3xl font-serif font-bold text-[#2F855A]">{stats.concluidasHoje}</p>
            </div>
            <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-5">
              <p className="text-sm font-sans text-[#705A4D] mb-1">Total Concluídas</p>
              <p className="text-3xl font-serif font-bold text-[#3E2723]">{stats.totalConcluidas}</p>
            </div>
          </div>

          {/* Botão de imprimir */}
          <div className="flex justify-end">
            <Button
              onClick={handleImprimir}
              variant="outline"
              className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
            >
              <Printer size={18} weight="bold" className="mr-2" />
              Imprimir Relatório
            </Button>
          </div>

          {/* Relatório agrupado por produto */}
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden print:shadow-none">
            <div className="bg-[#E8D5C4] px-6 py-4 print:bg-[#F5E6D3]">
              <h2 className="text-lg font-serif font-bold text-[#3E2723]">O Que Precisa Ser Produzido</h2>
              <p className="text-sm text-[#705A4D] font-sans">Lista de produtos pendentes agrupados por tipo</p>
            </div>
            
            {relatorio.length === 0 ? (
              <div className="text-center py-12 text-[#705A4D] font-sans">
                <Package size={48} className="mx-auto mb-4 text-[#8B5A3C]/50" />
                <p>Nenhuma produção pendente no momento</p>
              </div>
            ) : (
              <div className="divide-y divide-[#8B5A3C]/10">
                {relatorio.map((item) => (
                  <div key={item.produto_id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#E8D5C4] rounded-lg flex items-center justify-center">
                          <Package size={24} className="text-[#6B4423]" weight="bold" />
                        </div>
                        <div>
                          <h3 className="text-lg font-serif font-bold text-[#3E2723]">{item.produto_nome}</h3>
                          <p className="text-sm text-[#705A4D] font-sans">{item.itens.length} ordem(s) de produção</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-serif font-bold text-[#6B4423]">{item.quantidade_total}</p>
                        <p className="text-sm text-[#705A4D] font-sans">unidades</p>
                      </div>
                    </div>
                    
                    {/* Detalhes das ordens */}
                    <div className="bg-[#F5E6D3]/50 rounded-lg p-4">
                      <p className="text-xs font-medium text-[#6B4423] mb-2">Detalhes das ordens:</p>
                      <div className="space-y-2">
                        {item.itens.map((ordem) => (
                          <div key={ordem.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[#705A4D] font-sans">{ordem.pedido_numero || 'Sem ref.'}</span>
                              {ordem.responsavel && (
                                <span className="text-xs text-[#8B5A3C]">• {ordem.responsavel}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-[#3E2723]">{ordem.quantidade} un</span>
                              <span className="text-xs text-[#705A4D]">{formatDateTime(ordem.data_inicio)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo rápido para impressão */}
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden print:shadow-none">
            <div className="bg-[#E8D5C4] px-6 py-4 print:bg-[#F5E6D3]">
              <h2 className="text-lg font-serif font-bold text-[#3E2723]">Resumo Rápido</h2>
              <p className="text-sm text-[#705A4D] font-sans">Lista simplificada para produção</p>
            </div>
            <div className="p-6">
              {relatorio.length === 0 ? (
                <p className="text-center text-[#705A4D] font-sans">Nenhum item pendente</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatorio.map((item) => (
                    <div 
                      key={item.produto_id} 
                      className="flex items-center justify-between p-4 bg-[#F5E6D3] rounded-lg"
                    >
                      <span className="font-medium text-[#3E2723] font-sans">{item.produto_nome}</span>
                      <span className="text-xl font-bold text-[#6B4423]">{item.quantidade_total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estilos para impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none, .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
