import React, { useEffect, useState, useCallback } from 'react';
import { pedidosAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { CaretLeft, CaretRight, CalendarBlank, Package, User } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  pendente:      { label: 'Pendente',      bg: 'bg-yellow-100',  text: 'text-yellow-800',  dot: 'bg-yellow-500'  },
  em_producao:   { label: 'Em Produção',   bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500'    },
  em_embalagem:  { label: 'Embalagem',     bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500'  },
  concluido:     { label: 'Concluído',     bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-500'   },
  entregue:      { label: 'Entregue',      bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
  cancelado:     { label: 'Cancelado',     bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-400'     },
};

function getDiasDoMes(ano, mes) {
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const dias = [];
  // Preencher dias anteriores (da semana anterior ao primeiro dia)
  for (let i = 0; i < primeiro.getDay(); i++) {
    dias.push(null);
  }
  for (let d = 1; d <= ultimo.getDate(); d++) {
    dias.push(new Date(ano, mes, d));
  }
  return dias;
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function CalendarioPage() {
  const navigate = useNavigate();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pedidosAPI.listar();
      // Apenas pedidos com data de entrega e não cancelados
      const comEntrega = (res.data || []).filter(
        p => p.data_entrega && p.status !== 'cancelado'
      );
      setPedidos(comEntrega);
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const irParaMesAnterior = () => {
    if (mes === 0) { setMes(11); setAno(a => a - 1); }
    else setMes(m => m - 1);
    setDiaSelecionado(null);
  };

  const irParaProximoMes = () => {
    if (mes === 11) { setMes(0); setAno(a => a + 1); }
    else setMes(m => m + 1);
    setDiaSelecionado(null);
  };

  const pedidosDoDia = (data) => {
    if (!data) return [];
    const chave = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
    return pedidos.filter(p => {
      const d = String(p.data_entrega).slice(0, 10);
      return d === chave && (filtroStatus === 'todos' || p.status === filtroStatus);
    });
  };

  const pedidosDiaSelecionado = diaSelecionado ? pedidosDoDia(diaSelecionado) : [];

  // Contagem do mês atual para os cards de resumo
  const pedidosDoMes = pedidos.filter(p => {
    const d = new Date(String(p.data_entrega).slice(0, 10) + 'T12:00:00');
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  const atrasados = pedidosDoMes.filter(p => {
    const d = new Date(String(p.data_entrega).slice(0, 10) + 'T12:00:00');
    return d < hoje && p.status !== 'entregue' && p.status !== 'cancelado';
  });

  const dias = getDiasDoMes(ano, mes);

  return (
    <div data-testid="calendario-page">
      <div className="mb-6">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">
          Calendário de Entregas
        </h1>
        <p className="text-base font-sans text-[#705A4D]">
          Visualize os pedidos agendados por data de entrega
        </p>
      </div>

      {/* Cards resumo do mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#8B5A3C] mb-1">Total no mês</p>
          <p className="text-3xl font-serif font-bold text-[#3E2723]">{pedidosDoMes.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-red-600 mb-1">Em atraso</p>
          <p className="text-3xl font-serif font-bold text-red-700">{atrasados.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-blue-700 mb-1">Em produção</p>
          <p className="text-3xl font-serif font-bold text-blue-700">
            {pedidosDoMes.filter(p => p.status === 'em_producao').length}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-green-700 mb-1">Entregues</p>
          <p className="text-3xl font-serif font-bold text-green-700">
            {pedidosDoMes.filter(p => p.status === 'entregue').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2 bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
          {/* Cabeçalho do calendário */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#8B5A3C]/15">
            <button onClick={irParaMesAnterior} className="p-2 rounded-lg hover:bg-[#F5E6D3] text-[#6B4423]">
              <CaretLeft size={20} weight="bold" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-serif font-bold text-[#3E2723]">{MESES[mes]} {ano}</h2>
            </div>
            <button onClick={irParaProximoMes} className="p-2 rounded-lg hover:bg-[#F5E6D3] text-[#6B4423]">
              <CaretRight size={20} weight="bold" />
            </button>
          </div>

          {/* Filtro de status */}
          <div className="px-6 py-3 border-b border-[#8B5A3C]/10 flex gap-2 flex-wrap">
            {['todos', 'pendente', 'em_producao', 'em_embalagem', 'concluido'].map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filtroStatus === s
                    ? 'bg-[#6B4423] text-white'
                    : 'bg-[#F5E6D3] text-[#6B4423] hover:bg-[#E8D5C4]'
                }`}
              >
                {s === 'todos' ? 'Todos' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>

          {/* Grade dos dias */}
          <div className="p-4">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 mb-2">
              {SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-[#8B5A3C] py-2">{d}</div>
              ))}
            </div>

            {/* Dias */}
            <div className="grid grid-cols-7 gap-1">
              {dias.map((dia, i) => {
                if (!dia) return <div key={`vazio-${i}`} />;

                const pedidosDia = pedidosDoDia(dia);
                const isHoje = dia.toDateString() === hoje.toDateString();
                const isSelecionado = diaSelecionado?.toDateString() === dia.toDateString();
                const isPassado = dia < hoje && !isHoje;
                const temAtrasado = pedidosDia.some(p =>
                  isPassado && p.status !== 'entregue'
                );

                return (
                  <div
                    key={dia.toISOString()}
                    onClick={() => setDiaSelecionado(isSelecionado ? null : dia)}
                    className={`min-h-[60px] p-1 rounded-lg cursor-pointer border transition-all ${
                      isSelecionado
                        ? 'border-[#6B4423] bg-[#F5E6D3]'
                        : isHoje
                        ? 'border-[#6B4423]/50 bg-[#FFF8F0]'
                        : 'border-transparent hover:border-[#8B5A3C]/30 hover:bg-[#FDFAF5]'
                    }`}
                  >
                    <div className={`text-sm font-semibold mb-1 text-center ${
                      isHoje ? 'text-[#6B4423]' : isPassado ? 'text-[#B0957A]' : 'text-[#3E2723]'
                    }`}>
                      {isHoje
                        ? <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#6B4423] text-white text-xs">{dia.getDate()}</span>
                        : dia.getDate()
                      }
                    </div>
                    <div className="space-y-0.5">
                      {pedidosDia.slice(0, 3).map((p, pi) => {
                        const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pendente;
                        return (
                          <div
                            key={pi}
                            className={`text-xs px-1 py-0.5 rounded truncate ${cfg.bg} ${cfg.text}`}
                            title={p.cliente_nome}
                          >
                            {p.cliente_nome?.split(' ')[0]}
                          </div>
                        );
                      })}
                      {pedidosDia.length > 3 && (
                        <div className="text-xs text-[#8B5A3C] text-center font-semibold">
                          +{pedidosDia.length - 3}
                        </div>
                      )}
                      {temAtrasado && pedidosDia.length === 0 && (
                        <div className="w-2 h-2 bg-red-500 rounded-full mx-auto" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="px-6 py-3 border-t border-[#8B5A3C]/10 flex gap-4 flex-wrap">
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'cancelado').map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-[#705A4D]">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Painel lateral */}
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
          {diaSelecionado ? (
            <>
              <div className="px-5 py-4 border-b border-[#8B5A3C]/15 flex items-center gap-2">
                <CalendarBlank size={20} weight="bold" className="text-[#6B4423]" />
                <h3 className="font-serif font-semibold text-[#3E2723]">
                  {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>

              {pedidosDiaSelecionado.length === 0 ? (
                <div className="py-12 text-center text-[#705A4D]">
                  <CalendarBlank size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nenhum pedido para este dia</p>
                </div>
              ) : (
                <div className="divide-y divide-[#8B5A3C]/10 max-h-[600px] overflow-y-auto">
                  {pedidosDiaSelecionado.map((p, i) => {
                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pendente;
                    return (
                      <div
                        key={i}
                        className="p-4 hover:bg-[#FDFAF5] cursor-pointer"
                        onClick={() => navigate('/pedidos')}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-sm text-[#3E2723]">{p.cliente_nome}</p>
                            <p className="text-xs text-[#705A4D]">{p.numero}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {(p.items || []).slice(0, 3).map((item, ii) => (
                            <div key={ii} className="flex items-center gap-1.5 text-xs text-[#705A4D]">
                              <Package size={12} />
                              <span className="truncate">{item.quantidade}x {item.produto_nome}</span>
                            </div>
                          ))}
                          {(p.items || []).length > 3 && (
                            <p className="text-xs text-[#8B5A3C]">+{p.items.length - 3} itens</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#8B5A3C]/10">
                          <span className="text-xs text-[#705A4D]">{p.forma_pagamento || '—'}</span>
                          <span className="text-sm font-bold text-[#6B4423]">{formatCurrency(p.valor_total)}</span>
                        </div>

                        {p.observacoes && (
                          <p className="mt-2 text-xs text-[#8B5A3C] bg-[#F5E6D3]/50 rounded p-2 italic">
                            {p.observacoes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-[#705A4D] px-6">
              <CalendarBlank size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-serif font-semibold text-[#3E2723] mb-2">Selecione um dia</p>
              <p className="text-sm">Clique em qualquer data do calendário para ver os pedidos agendados.</p>

              {atrasados.length > 0 && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-left">
                  <p className="text-sm font-semibold text-red-700 mb-2">⚠️ {atrasados.length} entrega(s) em atraso</p>
                  {atrasados.slice(0, 3).map((p, i) => (
                    <p key={i} className="text-xs text-red-600 truncate">{p.cliente_nome} — {String(p.data_entrega).slice(0,10)}</p>
                  ))}
                  {atrasados.length > 3 && <p className="text-xs text-red-500 mt-1">+{atrasados.length - 3} mais</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
