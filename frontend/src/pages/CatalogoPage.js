import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash, 
  WhatsappLogo, 
  MagnifyingGlass,
  X,
  Package,
  MapPin,
  Phone
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import PortalLayout from '../components/PortalLayout';
import { toast, Toaster } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function CatalogoPage() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [carrinho, setCarrinho] = useState([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [enderecoCliente, setEnderecoCliente] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    try {
      const [produtosRes, categoriasRes, empresaRes] = await Promise.all([
        axios.get(`${API_URL}/catalogo/produtos`),
        axios.get(`${API_URL}/catalogo/categorias`),
        axios.get(`${API_URL}/catalogo/empresa`)
      ]);
      setProdutos(produtosRes.data);
      setCategorias(categoriasRes.data);
      setEmpresa(empresaRes.data);
    } catch (error) {
      console.error('Erro ao carregar catálogo:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchCategoria = !categoriaFiltro || p.categoria === categoriaFiltro;
      const matchBusca = !busca || 
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase()));
      return matchCategoria && matchBusca;
    });
  }, [produtos, categoriaFiltro, busca]);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho(prev => {
      const existente = prev.find(item => item.id === produto.id);
      if (existente) {
        return prev.map(item => 
          item.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { ...produto, quantidade: 1 }];
    });
    toast.success(`${produto.nome} adicionado ao carrinho`);
  };

  const atualizarQuantidade = (produtoId, delta) => {
    setCarrinho(prev => {
      return prev.map(item => {
        if (item.id === produtoId) {
          const novaQtd = item.quantidade + delta;
          return novaQtd > 0 ? { ...item, quantidade: novaQtd } : item;
        }
        return item;
      }).filter(item => item.quantidade > 0);
    });
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(prev => prev.filter(item => item.id !== produtoId));
  };

  const totalCarrinho = useMemo(() => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  }, [carrinho]);

  const totalItens = useMemo(() => {
    return carrinho.reduce((total, item) => total + item.quantidade, 0);
  }, [carrinho]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const enviarPedidoWhatsApp = () => {
    if (carrinho.length === 0) { toast.error('Adicione produtos ao carrinho'); return; }
    if (!nomeCliente.trim()) { toast.error('Informe seu nome'); return; }
    if (!enderecoCliente.trim()) { toast.error('Informe o endereço de entrega'); return; }

    // === MENSAGEM LEGÍVEL ===
    let mensagem = `🍫 *NOVO PEDIDO — SUSSU CHOCOLATES* 🍫\n\n`;
    mensagem += `👤 *Cliente:* ${nomeCliente}\n`;
    if (telefoneCliente) mensagem += `📱 *WhatsApp:* ${telefoneCliente}\n`;
    mensagem += `📍 *Endereço:* ${enderecoCliente}\n`;
    mensagem += `💳 *Pagamento:* ${formaPagamento}\n`;
    mensagem += `\n*ITENS DO PEDIDO:*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    carrinho.forEach((item, i) => {
      mensagem += `${i + 1}. *${item.nome}*\n`;
      mensagem += `   ${item.quantidade} x ${formatCurrency(item.preco)} = *${formatCurrency(item.quantidade * item.preco)}*\n`;
    });
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `*TOTAL: ${formatCurrency(totalCarrinho)}*\n`;
    if (observacoes) mensagem += `\n📝 *Obs:* ${observacoes}\n`;

    // === BLOCO ESTRUTURADO (para importação no sistema) ===
    const itensStr = carrinho.map(i =>
      `${i.quantidade}|${i.nome}|${i.id}|${i.preco.toFixed(2)}`
    ).join(';');

    mensagem += `\n---PEDIDO_SUSSU---\n`;
    mensagem += `NOME:${nomeCliente}\n`;
    mensagem += `TEL:${telefoneCliente || ''}\n`;
    mensagem += `END:${enderecoCliente}\n`;
    mensagem += `PAG:${formaPagamento}\n`;
    mensagem += `ITENS:${itensStr}\n`;
    mensagem += `TOTAL:${totalCarrinho.toFixed(2)}\n`;
    if (observacoes) mensagem += `OBS:${observacoes}\n`;
    mensagem += `---FIM_PEDIDO---`;

    const tel = ('55' + (empresa?.whatsapp || empresa?.telefone || '43999676206').replace(/\D/g, '')).slice(-13);
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`, '_blank');
    toast.success('Redirecionando para o WhatsApp...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5E6D3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#6B4423] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B4423] font-medium">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <PortalLayout carrinhoCount={totalItens} onCarrinhoClick={() => setCarrinhoAberto(true)}>
      <div className="min-h-screen bg-[#F5E6D3]">
      <Toaster position="top-center" />

      {/* Barra de filtros */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-[88px] z-30 border-b border-[#8B5A3C]/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Botão carrinho visível na barra */}
          <button
            onClick={() => setCarrinhoAberto(true)}
            className="relative bg-[#6B4423] hover:bg-[#8B5A3C] px-4 py-2 rounded-full flex items-center gap-2 transition-colors text-white flex-shrink-0"
          >
            <ShoppingCart size={20} weight="fill" />
            <span className="hidden sm:inline text-sm font-semibold">Carrinho</span>
            {totalItens > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItens}
              </span>
            )}
          </button>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Busca */}
            <div className="relative flex-1">
              <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5A3C]" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#8B5A3C]/30 rounded-full focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
              />
            </div>
            
            {/* Filtro Categoria */}
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="px-4 py-2.5 bg-white border border-[#8B5A3C]/30 rounded-full focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
            >
              <option value="">Todas as categorias</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Produtos */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-sm text-[#705A4D] mb-4">
          {produtosFiltrados.length} produto(s) encontrado(s)
        </p>
        
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="text-[#8B5A3C]/50 mx-auto mb-4" />
            <p className="text-[#705A4D]">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {produtosFiltrados.map(produto => (
              <div
                key={produto.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
              >
                {/* Imagem placeholder */}
                <div className="aspect-square bg-gradient-to-br from-[#8B5A3C]/10 to-[#6B4423]/10 flex items-center justify-center">
                  <Package size={48} className="text-[#8B5A3C]/40" />
                </div>
                
                <div className="p-4">
                  <h3 className="font-medium text-[#3E2723] line-clamp-2 min-h-[48px]">
                    {produto.nome}
                  </h3>
                  
                  {produto.categoria && (
                    <span className="inline-block text-xs bg-[#F5E6D3] text-[#6B4423] px-2 py-0.5 rounded-full mt-1">
                      {produto.categoria}
                    </span>
                  )}
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-[#6B4423]">
                      {formatCurrency(produto.preco)}
                    </span>
                    
                    <button
                      onClick={() => adicionarAoCarrinho(produto)}
                      className="bg-[#6B4423] hover:bg-[#8B5A3C] text-white p-2 rounded-full transition-colors"
                    >
                      <Plus size={20} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Drawer do Carrinho */}
      {carrinhoAberto && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setCarrinhoAberto(false)}
          />
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#FFFDF8] shadow-2xl flex flex-col animate-in slide-in-from-right">
            {/* Header do carrinho */}
            <div className="bg-[#3E2723] text-[#F5E6D3] px-4 py-4 flex items-center justify-between">
              <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                <ShoppingCart size={24} weight="fill" />
                Seu Pedido
              </h2>
              <button
                onClick={() => setCarrinhoAberto(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Conteúdo do carrinho */}
            <div className="flex-1 overflow-y-auto">
              {carrinho.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <ShoppingCart size={64} className="text-[#8B5A3C]/30 mx-auto mb-4" />
                  <p className="text-[#705A4D]">Seu carrinho está vazio</p>
                  <p className="text-sm text-[#8B5A3C] mt-1">Adicione produtos para fazer seu pedido</p>
                </div>
              ) : (
                <div>
                  {/* Itens */}
                  <div className="p-4 space-y-3">
                    {carrinho.map(item => (
                      <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm flex gap-3">
                        <div className="w-14 h-14 bg-[#F5E6D3] rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package size={22} className="text-[#8B5A3C]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#3E2723] text-sm line-clamp-1">{item.nome}</h4>
                          <p className="text-[#6B4423] font-semibold text-sm">{formatCurrency(item.preco)}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button onClick={() => atualizarQuantidade(item.id, -1)} className="w-7 h-7 bg-[#F5E6D3] hover:bg-[#E8D5C4] rounded-full flex items-center justify-center">
                                <Minus size={14} weight="bold" className="text-[#6B4423]" />
                              </button>
                              <span className="w-8 text-center font-medium text-[#3E2723]">{item.quantidade}</span>
                              <button onClick={() => atualizarQuantidade(item.id, 1)} className="w-7 h-7 bg-[#6B4423] hover:bg-[#8B5A3C] rounded-full flex items-center justify-center">
                                <Plus size={14} weight="bold" className="text-white" />
                              </button>
                            </div>
                            <button onClick={() => removerDoCarrinho(item.id)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dados do cliente — seção destacada */}
                  <div className="bg-[#F5E6D3]/50 border-t border-b border-[#8B5A3C]/20 px-4 py-4">
                    <h3 className="font-semibold text-[#3E2723] mb-3 flex items-center gap-2">
                      📋 Seus dados para entrega
                    </h3>
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        placeholder="Seu nome *"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-sm"
                      />
                      <input
                        type="tel"
                        placeholder="WhatsApp (ex: 43 99999-9999)"
                        value={telefoneCliente}
                        onChange={(e) => setTelefoneCliente(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Endereço de entrega *"
                        value={enderecoCliente}
                        onChange={(e) => setEnderecoCliente(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-sm"
                      />
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] text-sm"
                      >
                        <option value="PIX">💸 PIX</option>
                        <option value="Dinheiro">💵 Dinheiro</option>
                        <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                        <option value="Cartão de Débito">💳 Cartão de Débito</option>
                      </select>
                      <textarea
                        placeholder="Observações (opcional)"
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        rows="2"
                        className="w-full px-4 py-2.5 bg-white border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] resize-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer do carrinho */}
            {carrinho.length > 0 && (
              <div className="border-t border-[#8B5A3C]/15 p-4 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#705A4D]">Total ({totalItens} itens)</span>
                  <span className="text-2xl font-bold text-[#3E2723]">
                    {formatCurrency(totalCarrinho)}
                  </span>
                </div>
                
                <Button
                  onClick={enviarPedidoWhatsApp}
                  className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white py-6 text-lg flex items-center justify-center gap-2"
                >
                  <WhatsappLogo size={28} weight="fill" />
                  Enviar Pedido via WhatsApp
                </Button>
                
                <p className="text-xs text-center text-[#8B5A3C] mt-2">
                  Você será redirecionado para o WhatsApp
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão WhatsApp já está no PortalLayout */}
    </div>
    </PortalLayout>
  );
}
