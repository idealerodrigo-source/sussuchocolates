import React, { useEffect, useState, useCallback } from 'react';
import { nfceAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { Receipt, QrCode, Printer, XCircle, MagnifyingGlass, CheckCircle, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { imprimirDANFE } from '../components/vendas/DANFEGenerator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const STATUS_CONFIG = {
  autorizada:  { label: 'Autorizada',  bg: 'bg-green-100',  text: 'text-green-700'  },
  cancelada:   { label: 'Cancelada',   bg: 'bg-red-100',    text: 'text-red-700'    },
  rejeitada:   { label: 'Rejeitada',   bg: 'bg-orange-100', text: 'text-orange-700' },
};

export default function NFCeHistoricoPage() {
  const [nfces, setNfces] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState('');
  const [cancelModal, setCancelModal] = useState({ open: false, nfce: null });
  const [justificativa, setJustificativa] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [detalheModal, setDetalheModal] = useState({ open: false, nfce: null });

  const LIMITE = 20;

  const fetchHistorico = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nfceAPI.historico(LIMITE, pagina * LIMITE);
      setNfces(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Erro ao carregar histórico NFC-e');
    } finally {
      setLoading(false);
    }
  }, [pagina]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  const handleCancelar = async () => {
    if (justificativa.trim().length < 15) {
      toast.error('Justificativa deve ter no mínimo 15 caracteres');
      return;
    }
    setCancelando(true);
    try {
      const res = await nfceAPI.cancelar(cancelModal.nfce.chave_acesso, justificativa);
      if (res.data.sucesso) {
        toast.success('NFC-e cancelada com sucesso');
        setCancelModal({ open: false, nfce: null });
        setJustificativa('');
        fetchHistorico();
      } else {
        toast.error(res.data.mensagem || 'Erro ao cancelar');
      }
    } catch {
      toast.error('Erro ao cancelar NFC-e');
    } finally {
      setCancelando(false);
    }
  };

  const formatarChave = (chave) =>
    (chave || '').replace(/(\d{4})/g, '$1 ').trim();

  const nfcesFiltradas = nfces.filter(n => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return (
      (n.chave_acesso || '').includes(b) ||
      (n.numero_nfce || '').includes(b) ||
      (n.protocolo || '').includes(b) ||
      String(n.valor_total || '').includes(b)
    );
  });

  const totalPaginas = Math.ceil(total / LIMITE);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-4xl font-serif font-bold text-[#3E2723] mb-2">
          Histórico NFC-e
        </h1>
        <p className="text-[#705A4D]">Notas Fiscais de Consumidor Eletrônica emitidas</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-[#8B5A3C] mb-1">Total emitidas</p>
          <p className="text-3xl font-serif font-bold text-[#3E2723]">{total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-green-700 mb-1">Autorizadas</p>
          <p className="text-3xl font-serif font-bold text-green-700">
            {nfces.filter(n => n.status === 'autorizada').length}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-red-600 mb-1">Canceladas</p>
          <p className="text-3xl font-serif font-bold text-red-700">
            {nfces.filter(n => n.status === 'cancelada').length}
          </p>
        </div>
        <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-[#8B5A3C] mb-1">Ambiente</p>
          <p className="text-sm font-semibold text-[#3E2723]">
            {nfces[0]?.ambiente === 'producao' ? '🟢 Produção' : '🟡 Homologação'}
          </p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-4 max-w-md">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5A3C]" />
        <input
          type="text"
          placeholder="Buscar por chave, número ou protocolo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg text-sm outline-none focus:border-[#6B4423]"
        />
      </div>

      {/* Tabela */}
      <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#705A4D]">Carregando...</div>
        ) : nfcesFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt size={48} className="mx-auto mb-3 text-[#8B5A3C] opacity-40" />
            <p className="text-[#705A4D] font-serif font-semibold">Nenhuma NFC-e encontrada</p>
            <p className="text-sm text-[#8B5A3C] mt-1">
              As NFC-e emitidas aparecerão aqui após autorização.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#E8D5C4]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#3E2723]">Número</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#3E2723]">Chave (parcial)</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#3E2723]">Emissão</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-[#3E2723]">Valor</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-[#3E2723]">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-[#3E2723]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {nfcesFiltradas.map((nfce, i) => {
                  const cfg = STATUS_CONFIG[nfce.status] || STATUS_CONFIG.autorizada;
                  const chave = nfce.chave_acesso || '';
                  const chaveResumo = chave ? `...${chave.slice(-12)}` : '—';
                  return (
                    <tr key={nfce.id || i} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/30">
                      <td className="px-4 py-3 text-sm font-bold text-[#3E2723]">
                        Nº {nfce.numero_nfce || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#705A4D]">{chaveResumo}</td>
                      <td className="px-4 py-3 text-sm text-[#705A4D]">
                        {nfce.data_emissao
                          ? new Date(nfce.data_emissao).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#3E2723] text-right">
                        {formatCurrency(nfce.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setDetalheModal({ open: true, nfce })}
                            className="p-1.5 text-[#6B4423] hover:bg-[#F5E6D3] rounded-lg"
                            title="Ver detalhes"
                          >
                            <QrCode size={17} />
                          </button>
                          <button
                            onClick={() => imprimirDANFE({
                              ...nfce,
                              nfce_emitida: true,
                              nfce_chave: nfce.chave_acesso,
                              nfce_numero: nfce.numero_nfce,
                              nfce_protocolo: nfce.protocolo,
                              nfce_qrcode: nfce.qrcode_url,
                              items: [],
                            })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Imprimir DANFE"
                          >
                            <Printer size={17} />
                          </button>
                          {nfce.status === 'autorizada' && (
                            <button
                              onClick={() => { setCancelModal({ open: true, nfce }); setJustificativa(''); }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Cancelar NFC-e"
                            >
                              <XCircle size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#8B5A3C]/10">
            <p className="text-sm text-[#705A4D]">
              Mostrando {pagina * LIMITE + 1}–{Math.min((pagina + 1) * LIMITE, total)} de {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={pagina === 0}
              >← Anterior</Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
                disabled={pagina >= totalPaginas - 1}
              >Próximo →</Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalhe */}
      <Dialog open={detalheModal.open} onOpenChange={(o) => setDetalheModal({ open: o, nfce: detalheModal.nfce })}>
        <DialogContent className="bg-[#FFFDF8] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#3E2723] flex items-center gap-2">
              <QrCode size={22} />
              Detalhes NFC-e Nº {detalheModal.nfce?.numero_nfce}
            </DialogTitle>
          </DialogHeader>
          {detalheModal.nfce && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#705A4D]">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[detalheModal.nfce.status]?.bg} ${STATUS_CONFIG[detalheModal.nfce.status]?.text}`}>
                    {STATUS_CONFIG[detalheModal.nfce.status]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#705A4D]">Valor</p>
                  <p className="font-bold text-[#3E2723]">{formatCurrency(detalheModal.nfce.valor_total)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#705A4D]">Número</p>
                  <p className="font-semibold text-[#3E2723]">{detalheModal.nfce.numero_nfce || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#705A4D]">Protocolo</p>
                  <p className="font-semibold text-[#3E2723]">{detalheModal.nfce.protocolo || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[#705A4D]">Data Emissão</p>
                  <p className="font-semibold text-[#3E2723]">
                    {detalheModal.nfce.data_emissao ? new Date(detalheModal.nfce.data_emissao).toLocaleString('pt-BR') : '—'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[#705A4D] mb-1">Chave de Acesso</p>
                  <p className="font-mono text-xs bg-[#F5F5F5] p-2 rounded break-all">
                    {formatarChave(detalheModal.nfce.chave_acesso)}
                  </p>
                </div>
              </div>
              {detalheModal.nfce.qrcode_url && (
                <div className="text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(detalheModal.nfce.qrcode_url)}`}
                    alt="QR Code" className="w-44 h-44 mx-auto rounded"
                  />
                  <p className="text-xs text-[#705A4D] mt-2">Consulte em: www.sefaz.pr.gov.br/nfce</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Cancelamento */}
      <Dialog open={cancelModal.open} onOpenChange={(o) => setCancelModal({ open: o, nfce: cancelModal.nfce })}>
        <DialogContent className="bg-[#FFFDF8] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-red-700 flex items-center gap-2">
              <XCircle size={22} />
              Cancelar NFC-e Nº {cancelModal.nfce?.numero_nfce}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 flex items-start gap-2">
              <Warning size={18} weight="bold" className="flex-shrink-0 mt-0.5" />
              <span>O cancelamento só é permitido dentro do prazo definido pela SEFAZ. Esta ação não pode ser desfeita.</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1">
                Justificativa <span className="text-xs text-[#8B5A3C]">(mínimo 15 caracteres)</span>
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                placeholder="Descreva o motivo do cancelamento..."
                className="w-full px-3 py-2 border border-[#8B5A3C]/30 rounded-lg text-sm resize-none focus:outline-none focus:border-[#6B4423]"
              />
              <p className="text-xs text-[#8B5A3C] mt-1 text-right">{justificativa.length}/15 mín</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCancelModal({ open: false, nfce: null })}
              >
                Voltar
              </Button>
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
                disabled={cancelando || justificativa.trim().length < 15}
                onClick={handleCancelar}
              >
                {cancelando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
