import React, { useState, useEffect } from 'react';
import { relatoriosAPI, producaoAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { MagnifyingGlass, Factory, Package, Users, ShoppingCart, CheckCircle, FilePdf, FileXls, DownloadSimple, CalendarBlank, Phone, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import {
  COLORS,
  exportarPdfProducaoPendente,
  exportarExcelProducaoPendente,
  exportarPdfProducaoConcluida,
  exportarExcelProducaoConcluida,
  exportarPdfProducaoPorDataEntrega,
  exportarExcelProducaoPorDataEntrega,
  exportarPdfPedidosResumo,
  exportarExcelPedidosResumo
} from '../components/relatorios';

// Função utilitária para arredondar números com problemas de ponto flutuante
const arredondar = (num, casas = 1) => Math.round((num || 0) * Math.pow(10, casas)) / Math.pow(10, casas);

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState('por-data-entrega');
  const [relatorioVendas, setRelatorioVendas] = useState(null);
  const [relatorioProducao, setRelatorioProducao] = useState(null);
  const [relatorioClientes, setRelatorioClientes] = useState(null);
  const [producaoPendente, setProducaoPendente] = useState(null);
  const [producaoConcluida, setProducaoConcluida] = useState(null);
  const [pedidosResumo, setPedidosResumo] = useState(null);
  const [producaoPorDataEntrega, setProducaoPorDataEntrega] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
  });

  // Carregar relatórios automaticamente ao acessar cada aba
  useEffect(() => {
    if (activeTab === 'por-data-entrega') {
      buscarProducaoPorDataEntrega();
    } else if (activeTab === 'a-produzir') {
      buscarProducaoPendente();
    } else if (activeTab === 'produzidos') {
      buscarProducaoConcluida();
    } else if (activeTab === 'pedidos-resumo') {
      buscarPedidosResumo();
    } else if (activeTab === 'vendas') {
      buscarRelatorioVendas();
    } else if (activeTab === 'producao') {
      buscarRelatorioProducao();
    } else if (activeTab === 'clientes') {
      buscarRelatorioClientes();
    }
  }, [activeTab]);

  const buscarProducaoPorDataEntrega = async (dataInicio = null, dataFim = null) => {
    setLoading(true);
    try {
      const params = {};
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;
      const response = await producaoAPI.relatorioPorDataEntrega(params);
      setProducaoPorDataEntrega(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarProducaoPendente = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.producaoPendente();
      setProducaoPendente(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarProducaoConcluida = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.producaoConcluida(filtros.data_inicio, filtros.data_fim);
      setProducaoConcluida(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarPedidosResumo = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.pedidosResumo();
      setPedidosResumo(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarRelatorioVendas = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.vendas(filtros.data_inicio, filtros.data_fim);
      setRelatorioVendas(response.data);
      toast.success('Relatório gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarRelatorioProducao = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.producao(filtros.data_inicio, filtros.data_fim);
      setRelatorioProducao(response.data);
      toast.success('Relatório gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const buscarRelatorioClientes = async () => {
    setLoading(true);
    try {
      const response = await relatoriosAPI.clientes();
      setRelatorioClientes(response.data);
      toast.success('Relatório gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  // ============ FUNÇÕES DE EXPORTAÇÃO ============

  // Função auxiliar para adicionar cabeçalho da empresa no PDF
  const addPdfHeader = (doc, titulo, subtitulo = '') => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Fundo do cabeçalho
    doc.setFillColor(245, 230, 211); // Bege
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Nome da empresa
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(62, 39, 35); // Marrom escuro
    doc.text(EMPRESA.nome, 15, 15);
    
    // Dados da empresa
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 68, 35); // Marrom médio
    doc.text(`Tel: ${EMPRESA.telefone} | ${EMPRESA.endereco}`, 15, 22);
    doc.text(`Email: ${EMPRESA.email}`, 15, 27);
    
    // Título do relatório
    doc.setFillColor(107, 68, 35); // Marrom
    doc.rect(0, 43, pageWidth, 12, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, 15, 51);
    
    // Data de geração
    const dataGeracao = new Date().toLocaleString('pt-BR');
    doc.setFontSize(9);
    doc.text(`Gerado em: ${dataGeracao}`, pageWidth - 60, 51);
    
    if (subtitulo) {
      doc.setFontSize(10);
      doc.setTextColor(107, 68, 35);
      doc.text(subtitulo, 15, 62);
      return 70;
    }
    
    return 60;
  };

  // Exportar para PDF - Itens a Produzir
  const exportarPdfProducaoPendente = () => {
    if (!producaoPendente?.itens?.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const doc = new jsPDF();
    const startY = addPdfHeader(doc, 'RELATÓRIO DE ITENS A PRODUZIR');

    // Resumo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(62, 39, 35);
    doc.text(`Solicitado: ${producaoPendente.quantidade_total_solicitada || 0} | Produzido: ${producaoPendente.quantidade_total_produzida || 0} | Faltante: ${producaoPendente.quantidade_total_faltante || 0}`, 15, startY);

    // Tabela
    const tableData = producaoPendente.itens.map((item, index) => [
      index + 1,
      item.produto_nome,
      item.quantidade_solicitada || 0,
      item.quantidade_produzida || 0,
      item.quantidade_faltante || 0,
      item.pedidos?.map(p => `${p.pedido_numero} (${p.quantidade_faltante})`).join(', ') || '-'
    ]);

    autoTable(doc, {
      startY: startY + 8,
      head: [['#', 'Produto', 'Solicitado', 'Produzido', 'Faltante', 'Pedidos']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [107, 68, 35], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [62, 39, 35] },
      alternateRowStyles: { fillColor: [250, 245, 235] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 'auto' }
      }
    });

    doc.save('Relatorio_Itens_a_Produzir.pdf');
    toast.success('PDF exportado com sucesso!');
  };

  // Exportar para Excel - Itens a Produzir
  const exportarExcelProducaoPendente = () => {
    if (!producaoPendente?.itens?.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const wsData = [
      ['SUSSU CHOCOLATES - RELATÓRIO DE ITENS A PRODUZIR'],
      [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      [],
      ['#', 'Produto', 'Qtd Solicitada', 'Qtd Produzida', 'Qtd Faltante', 'Pedidos'],
      ...producaoPendente.itens.map((item, index) => [
        index + 1,
        item.produto_nome,
        item.quantidade_solicitada || 0,
        item.quantidade_produzida || 0,
        item.quantidade_faltante || 0,
        item.pedidos?.map(p => `${p.pedido_numero} - ${p.cliente_nome} (faltam ${p.quantidade_faltante})`).join('; ') || '-'
      ]),
      [],
      ['', 'TOTAL', producaoPendente.quantidade_total_solicitada || 0, producaoPendente.quantidade_total_produzida || 0, producaoPendente.quantidade_total_faltante || 0, '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 5 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 60 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens a Produzir');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'Relatorio_Itens_a_Produzir.xlsx');
    toast.success('Excel exportado com sucesso!');
  };

  // Exportar para PDF - Itens Produzidos
  const exportarPdfProducaoConcluida = () => {
    if (!producaoConcluida?.itens?.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const doc = new jsPDF();
    const periodo = filtros.data_inicio && filtros.data_fim 
      ? `Período: ${new Date(filtros.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(filtros.data_fim).toLocaleDateString('pt-BR')}`
      : 'Todos os períodos';
    const startY = addPdfHeader(doc, 'RELATÓRIO DE ITENS PRODUZIDOS', periodo);

    doc.setFontSize(10);
    doc.setTextColor(62, 39, 35);
    doc.text(`Total Produzido: ${producaoConcluida.quantidade_total_produzida} unidades`, 15, startY);

    const tableData = producaoConcluida.itens.map((item, index) => [
      index + 1,
      item.produto_nome,
      item.quantidade_total,
      item.producoes_count
    ]);

    autoTable(doc, {
      startY: startY + 8,
      head: [['#', 'Produto', 'Qtd Produzida', 'Nº Produções']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [47, 133, 90], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [62, 39, 35] },
      alternateRowStyles: { fillColor: [209, 250, 229] }
    });

    doc.save('Relatorio_Itens_Produzidos.pdf');
    toast.success('PDF exportado com sucesso!');
  };

  // Exportar para Excel - Itens Produzidos
  const exportarExcelProducaoConcluida = () => {
    if (!producaoConcluida?.itens?.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const periodo = filtros.data_inicio && filtros.data_fim 
      ? `Período: ${new Date(filtros.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(filtros.data_fim).toLocaleDateString('pt-BR')}`
      : 'Todos os períodos';

    const wsData = [
      ['SUSSU CHOCOLATES - RELATÓRIO DE ITENS PRODUZIDOS'],
      [periodo],
      [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      [],
      ['#', 'Produto', 'Quantidade Produzida', 'Nº Produções'],
      ...producaoConcluida.itens.map((item, index) => [
        index + 1,
        item.produto_nome,
        item.quantidade_total,
        item.producoes_count
      ]),
      [],
      ['', 'TOTAL', producaoConcluida.quantidade_total_produzida, '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens Produzidos');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), 'Relatorio_Itens_Produzidos.xlsx');
    toast.success('Excel exportado com sucesso!');
  };

  // Exportar para PDF - Resumo Pedidos
  const exportarPdfPedidosResumo = () => {
    if (!pedidosResumo?.itens?.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const doc = new jsPDF();
    const startY = addPdfHeader(doc, 'RELATÓRIO RESUMO DE PEDIDOS');

    doc.setFontSize(10);
    doc.setTextColor(62, 39, 35);
    doc.text(`Total: ${pedidosResumo.quantidade_total} unidades | Valor: ${formatCurrency(pedidosResumo.valor_total)}`, 15, startY);

    const tableData = pedidosResumo.itens.map((item, index) => [
      index + 1,
      item.produto_nome,
      item.quantidade_total,
      item.pedidos_count,
      formatCurrency(item.valor_total)
    ]);

    autoTable(doc, {
      startY: startY + 8,
      head: [['#', 'Produto', 'Qtd Total', 'Nº Pedidos', 'Valor Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [107, 68, 35], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [62, 39, 35] },
      columnStyles: {
        4: { halign: 'right' }
      },
      foot: [['', 'TOTAL', pedidosResumo.quantidade_total, '', formatCurrency(pedidosResumo.valor_total)]],
      footStyles: { fillColor: [245, 230, 211], textColor: [62, 39, 35], fontStyle: 'bold' }
    });

    doc.save('Relatorio_Resumo_Pedidos.pdf');
    toast.success('PDF exportado com sucesso!');
  };

  // Exportar para Excel - Resumo Pedidos
  const exportarExcelPedidosResumo = () => {
    if (!pedidosResumo?.itens?.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const wsData = [
      ['SUSSU CHOCOLATES - RELATÓRIO RESUMO DE PEDIDOS'],
      [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      [],
      ['#', 'Produto', 'Quantidade Total', 'Nº Pedidos', 'Valor Total'],
      ...pedidosResumo.itens.map((item, index) => [
        index + 1,
        item.produto_nome,
        item.quantidade_total,
        item.pedidos_count,
        item.valor_total
      ]),
      [],
      ['', 'TOTAL', pedidosResumo.quantidade_total, '', pedidosResumo.valor_total]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 18 }, { wch: 12 }, { wch: 15 }];

    // Formatar coluna de valor como moeda
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 4; R <= range.e.r; ++R) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: 4 })];
      if (cell && typeof cell.v === 'number') {
        cell.z = 'R$ #,##0.00';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo Pedidos');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), 'Relatorio_Resumo_Pedidos.xlsx');
    toast.success('Excel exportado com sucesso!');
  };

  // Exportar para PDF - Vendas
  const exportarPdfVendas = () => {
    if (!relatorioVendas) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const doc = new jsPDF();
    const periodo = filtros.data_inicio && filtros.data_fim 
      ? `Período: ${new Date(filtros.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(filtros.data_fim).toLocaleDateString('pt-BR')}`
      : 'Todos os períodos';
    const startY = addPdfHeader(doc, 'RELATÓRIO DE VENDAS', periodo);

    doc.setFontSize(11);
    doc.setTextColor(62, 39, 35);
    doc.text(`Total de Vendas: ${relatorioVendas.total_vendas}`, 15, startY);
    doc.text(`Valor Total: ${formatCurrency(relatorioVendas.valor_total)}`, 15, startY + 6);
    doc.text(`Ticket Médio: ${formatCurrency(relatorioVendas.ticket_medio)}`, 15, startY + 12);

    if (relatorioVendas.vendas_por_dia?.length) {
      const tableData = relatorioVendas.vendas_por_dia.map(v => [
        v.data,
        v.quantidade || 1,
        formatCurrency(v.valor)
      ]);

      autoTable(doc, {
        startY: startY + 20,
        head: [['Data', 'Quantidade', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [107, 68, 35], textColor: 255 },
        columnStyles: { 2: { halign: 'right' } }
      });
    }

    doc.save('Relatorio_Vendas.pdf');
    toast.success('PDF exportado com sucesso!');
  };

  // Exportar para Excel - Vendas
  const exportarExcelVendas = () => {
    if (!relatorioVendas) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const periodo = filtros.data_inicio && filtros.data_fim 
      ? `Período: ${new Date(filtros.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(filtros.data_fim).toLocaleDateString('pt-BR')}`
      : 'Todos os períodos';

    const wsData = [
      ['SUSSU CHOCOLATES - RELATÓRIO DE VENDAS'],
      [periodo],
      [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      [],
      ['Total de Vendas:', relatorioVendas.total_vendas],
      ['Valor Total:', relatorioVendas.valor_total],
      ['Ticket Médio:', relatorioVendas.ticket_medio],
      [],
      ['Data', 'Quantidade', 'Valor'],
      ...(relatorioVendas.vendas_por_dia || []).map(v => [v.data, v.quantidade || 1, v.valor])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), 'Relatorio_Vendas.xlsx');
    toast.success('Excel exportado com sucesso!');
  };

  const tabs = [
    { id: 'por-data-entrega', label: 'Por Data de Entrega', icon: CalendarBlank },
    { id: 'a-produzir', label: 'Itens a Produzir', icon: Factory },
    { id: 'produzidos', label: 'Itens Produzidos', icon: CheckCircle },
    { id: 'pedidos-resumo', label: 'Resumo Pedidos', icon: ShoppingCart },
    { id: 'vendas', label: 'Vendas', icon: Package },
    { id: 'producao', label: 'Produção Geral', icon: Factory },
    { id: 'clientes', label: 'Clientes', icon: Users },
  ];

  return (
    <div data-testid="relatorios-page">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#3E2723] mb-2">Relatórios</h1>
        <p className="text-base font-sans text-[#705A4D]">Visualize relatórios e análises de produção</p>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-1 border-b border-[#8B5A3C]/15">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-sans font-medium transition-colors text-sm ${
                activeTab === tab.id
                  ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
                  : 'text-[#705A4D] hover:text-[#6B4423]'
              }`}
            >
              <tab.icon size={18} weight={activeTab === tab.id ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: POR DATA DE ENTREGA */}
      {activeTab === 'por-data-entrega' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-2xl font-serif font-semibold text-[#3E2723]">Itens a Produzir por Data de Entrega</h2>
          </div>

          {/* Filtros de Período */}
          <div className="bg-[#F5E6D3]/50 rounded-xl p-4 border border-[#8B5A3C]/20">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">
                  <CalendarBlank size={16} className="inline mr-1" />
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                  className="px-4 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">
                  <CalendarBlank size={16} className="inline mr-1" />
                  Data Final
                </label>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                  className="px-4 py-2 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => buscarProducaoPorDataEntrega(filtros.data_inicio, filtros.data_fim)} 
                  disabled={loading}
                  className="bg-[#6B4423] text-white hover:bg-[#8B5A3C]"
                >
                  <MagnifyingGlass size={18} className="mr-2" />
                  Buscar
                </Button>
                <Button 
                  onClick={() => {
                    setFiltros({ data_inicio: '', data_fim: '' });
                    buscarProducaoPorDataEntrega();
                  }} 
                  disabled={loading}
                  variant="outline"
                  className="text-[#6B4423] border-[#6B4423]"
                >
                  Limpar
                </Button>
              </div>
              {/* Atalhos de período */}
              <div className="flex gap-2 ml-auto">
                <Button 
                  onClick={() => {
                    const hoje = new Date().toISOString().split('T')[0];
                    setFiltros({ data_inicio: hoje, data_fim: hoje });
                    buscarProducaoPorDataEntrega(hoje, hoje);
                  }} 
                  size="sm"
                  variant="outline"
                  className="text-[#6B4423] border-[#6B4423]/50 text-xs"
                >
                  Hoje
                </Button>
                <Button 
                  onClick={() => {
                    const hoje = new Date();
                    const amanha = new Date(hoje);
                    amanha.setDate(amanha.getDate() + 1);
                    const amanhaStr = amanha.toISOString().split('T')[0];
                    setFiltros({ data_inicio: amanhaStr, data_fim: amanhaStr });
                    buscarProducaoPorDataEntrega(amanhaStr, amanhaStr);
                  }} 
                  size="sm"
                  variant="outline"
                  className="text-[#6B4423] border-[#6B4423]/50 text-xs"
                >
                  Amanhã
                </Button>
                <Button 
                  onClick={() => {
                    const hoje = new Date();
                    const inicioSemana = new Date(hoje);
                    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                    const fimSemana = new Date(inicioSemana);
                    fimSemana.setDate(fimSemana.getDate() + 6);
                    const inicioStr = inicioSemana.toISOString().split('T')[0];
                    const fimStr = fimSemana.toISOString().split('T')[0];
                    setFiltros({ data_inicio: inicioStr, data_fim: fimStr });
                    buscarProducaoPorDataEntrega(inicioStr, fimStr);
                  }} 
                  size="sm"
                  variant="outline"
                  className="text-[#6B4423] border-[#6B4423]/50 text-xs"
                >
                  Esta Semana
                </Button>
                <Button 
                  onClick={() => {
                    const hoje = new Date();
                    const proximaSemana = new Date(hoje);
                    proximaSemana.setDate(hoje.getDate() + 7);
                    const hojeStr = hoje.toISOString().split('T')[0];
                    const proxSemanaStr = proximaSemana.toISOString().split('T')[0];
                    setFiltros({ data_inicio: hojeStr, data_fim: proxSemanaStr });
                    buscarProducaoPorDataEntrega(hojeStr, proxSemanaStr);
                  }} 
                  size="sm"
                  variant="outline"
                  className="text-[#6B4423] border-[#6B4423]/50 text-xs"
                >
                  Próximos 7 dias
                </Button>
              </div>
            </div>
            {(filtros.data_inicio || filtros.data_fim) && (
              <p className="text-sm text-[#6B4423] mt-2">
                Período: {filtros.data_inicio ? new Date(filtros.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'} 
                {' → '} 
                {filtros.data_fim ? new Date(filtros.data_fim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}
              </p>
            )}
          </div>

          {/* Botões de exportação */}
          <div className="flex gap-2 justify-end">
            {producaoPorDataEntrega?.por_data_entrega?.length > 0 && (
                <>
                  <Button 
                    onClick={() => {
                      const doc = new jsPDF();
                      let startY = addPdfHeader(doc, 'RELATÓRIO DE PRODUÇÃO POR DATA DE ENTREGA');
                      
                      producaoPorDataEntrega.por_data_entrega.forEach((dataGrupo, idx) => {
                        if (idx > 0) {
                          startY = doc.internal.pageSize.height - 60;
                          if (doc.lastAutoTable && doc.lastAutoTable.finalY > startY - 30) {
                            doc.addPage();
                            startY = 20;
                          } else {
                            startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : startY;
                          }
                        }
                        
                        // Título da data
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(107, 68, 35);
                        doc.text(`📅 ${dataGrupo.data_formatada}`, 15, startY);
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'normal');
                        doc.text(`${dataGrupo.total_itens} itens | ${dataGrupo.total_quantidade} unidades`, 15, startY + 6);
                        
                        // Tabela de itens
                        const tableData = [];
                        dataGrupo.pedidos.forEach(pedido => {
                          pedido.itens.forEach(item => {
                            tableData.push([
                              pedido.pedido_numero,
                              pedido.cliente_nome,
                              item.produto_nome,
                              item.sabores || '-',
                              item.quantidade
                            ]);
                          });
                        });
                        
                        autoTable(doc, {
                          startY: startY + 12,
                          head: [['Pedido', 'Cliente', 'Produto', 'Sabores', 'Qtd']],
                          body: tableData,
                          theme: 'striped',
                          headStyles: { fillColor: [107, 68, 35], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                          bodyStyles: { textColor: [62, 39, 35], fontSize: 8 },
                          alternateRowStyles: { fillColor: [250, 245, 235] },
                          columnStyles: {
                            0: { cellWidth: 25 },
                            1: { cellWidth: 40 },
                            2: { cellWidth: 50 },
                            3: { cellWidth: 40 },
                            4: { cellWidth: 15, halign: 'center' }
                          }
                        });
                      });
                      
                      doc.save('Relatorio_Producao_Por_Data_Entrega.pdf');
                      toast.success('PDF exportado com sucesso!');
                    }} 
                    variant="outline" 
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <FilePdf size={18} className="mr-2" weight="fill" />
                    PDF
                  </Button>
                  <Button 
                    onClick={() => {
                      const wsData = [
                        ['SUSSU CHOCOLATES - RELATÓRIO DE PRODUÇÃO POR DATA DE ENTREGA'],
                        [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
                        [],
                      ];
                      
                      producaoPorDataEntrega.por_data_entrega.forEach(dataGrupo => {
                        wsData.push([]);
                        wsData.push([`DATA DE ENTREGA: ${dataGrupo.data_formatada}`]);
                        wsData.push(['Pedido', 'Cliente', 'Telefone', 'Produto', 'Sabores', 'Quantidade']);
                        
                        dataGrupo.pedidos.forEach(pedido => {
                          pedido.itens.forEach(item => {
                            wsData.push([
                              pedido.pedido_numero,
                              pedido.cliente_nome,
                              pedido.cliente_telefone || '-',
                              item.produto_nome,
                              item.sabores || '-',
                              item.quantidade
                            ]);
                          });
                        });
                        
                        wsData.push(['', '', '', '', 'TOTAL:', dataGrupo.total_quantidade]);
                      });
                      
                      const ws = XLSX.utils.aoa_to_sheet(wsData);
                      ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 30 }, { wch: 12 }];
                      
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Por Data Entrega');
                      
                      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                      saveAs(new Blob([excelBuffer]), 'Relatorio_Producao_Por_Data_Entrega.xlsx');
                      toast.success('Excel exportado com sucesso!');
                    }} 
                    variant="outline" 
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <FileXls size={18} className="mr-2" weight="fill" />
                    Excel Completo
                  </Button>
                  <Button 
                    onClick={() => {
                      // Excel com RESUMO agregado por produto (o que produzir)
                      const wsData = [
                        ['SUSSU CHOCOLATES - RESUMO DE PRODUÇÃO'],
                        ['O QUE PRODUZIR - QUANTIDADES AGREGADAS POR PRODUTO'],
                        [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
                        [],
                        ['Data Entrega', 'Produto', 'Sabores', 'Quantidade Total'],
                      ];
                      
                      producaoPorDataEntrega.por_data_entrega.forEach(dataGrupo => {
                        dataGrupo.resumo_produtos?.forEach(produto => {
                          wsData.push([
                            dataGrupo.data_formatada,
                            produto.produto_nome,
                            produto.sabores || '-',
                            produto.quantidade_total
                          ]);
                        });
                        // Linha vazia entre datas
                        wsData.push([]);
                      });
                      
                      // Adiciona totais gerais
                      wsData.push([]);
                      wsData.push(['TOTAL GERAL', '', '', producaoPorDataEntrega.total_quantidade]);
                      
                      const ws = XLSX.utils.aoa_to_sheet(wsData);
                      ws['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 35 }, { wch: 18 }];
                      
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Resumo Produção');
                      
                      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                      saveAs(new Blob([excelBuffer]), 'Resumo_Producao.xlsx');
                      toast.success('Resumo de produção exportado!');
                    }} 
                    variant="outline" 
                    className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                  >
                    <FileXls size={18} className="mr-2" weight="fill" />
                    Resumo Produção
                  </Button>
                </>
              )}
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#6B4423] border-r-transparent"></div>
              <p className="mt-3 text-[#705A4D]">Carregando relatório...</p>
            </div>
          )}

          {!loading && producaoPorDataEntrega && (
            <>
              {/* Cards de resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-[#6B4423] to-[#8B5A3C] text-white rounded-xl p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">Datas de Entrega</p>
                      <p className="text-3xl font-bold">{producaoPorDataEntrega.total_datas}</p>
                    </div>
                    <CalendarBlank size={40} className="opacity-60" weight="fill" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-white rounded-xl p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">Itens Pendentes</p>
                      <p className="text-3xl font-bold">{producaoPorDataEntrega.total_itens_pendentes}</p>
                    </div>
                    <Factory size={40} className="opacity-60" weight="fill" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-[#2F855A] to-[#48BB78] text-white rounded-xl p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">Total Unidades</p>
                      <p className="text-3xl font-bold">{producaoPorDataEntrega.total_quantidade}</p>
                    </div>
                    <Package size={40} className="opacity-60" weight="fill" />
                  </div>
                </div>
              </div>

              {/* Lista por data de entrega */}
              {producaoPorDataEntrega.por_data_entrega?.length > 0 ? (
                <div className="space-y-6">
                  {producaoPorDataEntrega.por_data_entrega.map((dataGrupo, idx) => (
                    <div key={idx} className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                      {/* Cabeçalho da data */}
                      <div className={`px-6 py-4 ${
                        dataGrupo.data_entrega === null 
                          ? 'bg-yellow-50 border-b-2 border-yellow-400' 
                          : new Date(dataGrupo.data_entrega) < new Date(new Date().toISOString().split('T')[0])
                            ? 'bg-red-50 border-b-2 border-red-400'
                            : 'bg-[#E8D5C4]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CalendarBlank size={28} weight="fill" className={
                              dataGrupo.data_entrega === null 
                                ? 'text-yellow-600' 
                                : new Date(dataGrupo.data_entrega) < new Date(new Date().toISOString().split('T')[0])
                                  ? 'text-red-600'
                                  : 'text-[#6B4423]'
                            } />
                            <div>
                              <h3 className={`text-xl font-serif font-semibold ${
                                dataGrupo.data_entrega === null 
                                  ? 'text-yellow-700' 
                                  : new Date(dataGrupo.data_entrega) < new Date(new Date().toISOString().split('T')[0])
                                    ? 'text-red-700'
                                    : 'text-[#3E2723]'
                              }`}>
                                {dataGrupo.data_formatada}
                                {dataGrupo.data_entrega === null && (
                                  <span className="ml-2 text-sm font-normal bg-yellow-200 px-2 py-0.5 rounded">
                                    <Warning size={14} className="inline mr-1" />
                                    Definir data
                                  </span>
                                )}
                                {dataGrupo.data_entrega && new Date(dataGrupo.data_entrega) < new Date(new Date().toISOString().split('T')[0]) && (
                                  <span className="ml-2 text-sm font-normal bg-red-200 px-2 py-0.5 rounded">
                                    <Warning size={14} className="inline mr-1" />
                                    Atrasado
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-[#705A4D]">{dataGrupo.pedidos.length} pedido(s)</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-[#3E2723]">{dataGrupo.total_quantidade}</p>
                            <p className="text-xs text-[#705A4D]">unidades</p>
                          </div>
                        </div>
                      </div>

                      {/* RESUMO AGREGADO POR PRODUTO */}
                      <div className="px-6 py-4 bg-gradient-to-r from-[#6B4423]/5 to-[#8B5A3C]/5 border-b border-[#8B5A3C]/15">
                        <h4 className="text-sm font-semibold text-[#6B4423] mb-3 flex items-center gap-2">
                          <Factory size={18} weight="fill" />
                          Resumo de Produção - O que produzir:
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {dataGrupo.resumo_produtos?.map((produto, prodIdx) => (
                            <div key={prodIdx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#8B5A3C]/15 shadow-sm">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#3E2723] truncate">{produto.produto_nome}</p>
                                {produto.sabores && (
                                  <p className="text-xs text-[#705A4D] truncate">{produto.sabores}</p>
                                )}
                              </div>
                              <div className="ml-3 flex-shrink-0">
                                <span className="bg-[#D97706] text-white px-3 py-1 rounded-full text-sm font-bold">
                                  {produto.quantidade_total % 1 === 0 ? produto.quantidade_total : produto.quantidade_total.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pedidos desta data */}
                      <div className="divide-y divide-[#8B5A3C]/10">
                        {dataGrupo.pedidos.map((pedido, pedidoIdx) => (
                          <div key={pedidoIdx} className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="inline-block bg-[#6B4423] text-white px-3 py-1 rounded-full text-sm font-bold">
                                  {pedido.pedido_numero}
                                </span>
                                <h4 className="text-lg font-medium text-[#3E2723] mt-2">{pedido.cliente_nome}</h4>
                                {pedido.cliente_telefone && (
                                  <p className="text-sm text-[#705A4D] flex items-center gap-1 mt-1">
                                    <Phone size={14} />
                                    {pedido.cliente_telefone}
                                  </p>
                                )}
                                {pedido.observacoes && (
                                  <p className="text-xs text-[#8B5A3C] mt-1 italic">Obs: {pedido.observacoes}</p>
                                )}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                pedido.status === 'em_producao' ? 'bg-blue-100 text-blue-700' :
                                pedido.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {pedido.status === 'em_producao' ? 'Em Produção' : 
                                 pedido.status === 'pendente' ? 'Pendente' : pedido.status}
                              </span>
                            </div>

                            {/* Itens do pedido */}
                            <div className="bg-[#F5E6D3]/50 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-[#E8D5C4]/50">
                                  <tr>
                                    <th className="text-left px-3 py-2 font-medium text-[#6B4423]">Produto</th>
                                    <th className="text-left px-3 py-2 font-medium text-[#6B4423]">Sabores</th>
                                    <th className="text-center px-3 py-2 font-medium text-[#6B4423]">Qtd</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pedido.itens.map((item, itemIdx) => (
                                    <tr key={itemIdx} className="border-t border-[#8B5A3C]/10">
                                      <td className="px-3 py-2 text-[#3E2723] font-medium">{item.produto_nome}</td>
                                      <td className="px-3 py-2 text-[#705A4D]">{item.sabores || '-'}</td>
                                      <td className="px-3 py-2 text-center">
                                        <span className="bg-[#D97706]/20 text-[#D97706] px-3 py-1 rounded-full font-bold">
                                          {item.quantidade}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-12 text-center">
                  <CheckCircle size={64} className="mx-auto mb-4 text-[#2F855A]" weight="fill" />
                  <p className="text-xl font-serif text-[#3E2723]">Nenhum item pendente de produção!</p>
                  <p className="text-[#705A4D] mt-2">Todas as produções estão em dia.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: ITENS A PRODUZIR */}
      {activeTab === 'a-produzir' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-2xl font-serif font-semibold text-[#3E2723]">Itens Pendentes de Produção</h2>
            <div className="flex gap-2">
              <Button onClick={buscarProducaoPendente} disabled={loading} variant="outline" className="text-[#6B4423] border-[#6B4423]">
                <MagnifyingGlass size={18} className="mr-2" />
                Atualizar
              </Button>
              {producaoPendente?.itens?.length > 0 && (
                <>
                  <Button onClick={exportarPdfProducaoPendente} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                    <FilePdf size={18} className="mr-2" weight="fill" />
                    PDF
                  </Button>
                  <Button onClick={exportarExcelProducaoPendente} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                    <FileXls size={18} className="mr-2" weight="fill" />
                    Excel
                  </Button>
                </>
              )}
            </div>
          </div>

          {producaoPendente && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Tipos de Produtos</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{producaoPendente.total_itens}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total Solicitado</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{arredondar(producaoPendente.quantidade_total_solicitada)}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#2F855A] mb-2">Total Produzido</p>
                  <p className="text-3xl font-serif font-bold text-[#2F855A]">{arredondar(producaoPendente.quantidade_total_produzida)}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#D97706]/20 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#D97706] mb-2">Total Faltante</p>
                  <p className="text-3xl font-serif font-bold text-[#D97706]">{arredondar(producaoPendente.quantidade_total_faltante)}</p>
                </div>
              </div>

              {producaoPendente.itens?.length > 0 && (
                <>
                  <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Quantidade Faltante por Produto</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={producaoPendente.itens.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                        <XAxis type="number" tick={{ fill: '#705A4D', fontSize: 12 }} />
                        <YAxis type="category" dataKey="produto_nome" tick={{ fill: '#705A4D', fontSize: 11 }} width={150} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFDF8',
                            border: '1px solid #8B5A3C40',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="quantidade_faltante" fill="#D97706" name="Faltante" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#8B5A3C]/15 bg-[#E8D5C4]">
                      <h3 className="text-xl font-serif font-semibold text-[#3E2723]">Lista Detalhada de Produção</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#F5E6D3]">
                          <tr>
                            <th className="text-left px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                            <th className="text-center px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Solicitado</th>
                            <th className="text-center px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Produzido</th>
                            <th className="text-center px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Faltante</th>
                            <th className="text-left px-4 py-3 text-sm font-sans font-semibold text-[#3E2723]">Pedidos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {producaoPendente.itens.map((item, index) => (
                            <tr key={index} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                              <td className="px-4 py-3 text-sm text-[#4A3B32] font-sans font-medium">{item.produto_nome}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-[#3E2723] text-sm font-semibold">
                                  {arredondar(item.quantidade_solicitada)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-[#2F855A]/20 text-[#2F855A] px-3 py-1 rounded-full text-sm font-bold">
                                  {arredondar(item.quantidade_produzida)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-[#D97706]/20 text-[#D97706] px-3 py-1 rounded-full text-sm font-bold">
                                  {arredondar(item.quantidade_faltante)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#705A4D]">
                                {item.pedidos?.map((p, i) => (
                                  <span key={i} className="inline-block bg-[#8B5A3C]/10 px-2 py-1 rounded mr-1 mb-1">
                                    {p.pedido_numero}: faltam {arredondar(p.quantidade_faltante)} ({p.cliente_nome})
                                  </span>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {producaoPendente.itens?.length === 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-12 text-center">
                  <CheckCircle size={64} className="mx-auto mb-4 text-[#2F855A]" weight="fill" />
                  <p className="text-xl font-serif text-[#3E2723]">Nenhum item pendente de produção!</p>
                  <p className="text-[#705A4D] mt-2">Todas as produções estão em dia.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: ITENS PRODUZIDOS */}
      {activeTab === 'produzidos' && (
        <div className="space-y-6">
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Início</label>
                <input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={buscarProducaoConcluida} disabled={loading} className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>

          {producaoConcluida && (
            <>
              <div className="flex justify-end gap-2 -mt-2">
                {producaoConcluida.itens?.length > 0 && (
                  <>
                    <Button onClick={exportarPdfProducaoConcluida} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                      <FilePdf size={18} className="mr-2" weight="fill" />
                      PDF
                    </Button>
                    <Button onClick={exportarExcelProducaoConcluida} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                      <FileXls size={18} className="mr-2" weight="fill" />
                      Excel
                    </Button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Tipos de Produtos</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{producaoConcluida.total_tipos_produto}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total Produzido</p>
                  <p className="text-3xl font-serif font-bold text-[#2F855A]">{producaoConcluida.quantidade_total_produzida}</p>
                </div>
              </div>

              {producaoConcluida.itens?.length > 0 && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                      <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Produção por Produto</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={producaoConcluida.itens.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                          <XAxis dataKey="produto_nome" tick={{ fill: '#705A4D', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFDF8',
                              border: '1px solid #8B5A3C40',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="quantidade_total" fill="#2F855A" name="Quantidade" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                      <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Distribuição</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={producaoConcluida.itens.slice(0, 6)}
                            dataKey="quantidade_total"
                            nameKey="produto_nome"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ produto_nome, percent }) => `${produto_nome?.substring(0, 15)} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {producaoConcluida.itens.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} unidades`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#8B5A3C]/15 bg-[#E8D5C4]">
                      <h3 className="text-xl font-serif font-semibold text-[#3E2723]">Lista de Produção Concluída</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#F5E6D3]">
                          <tr>
                            <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                            <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Qtd Produzida</th>
                            <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Nº Produções</th>
                          </tr>
                        </thead>
                        <tbody>
                          {producaoConcluida.itens.map((item, index) => (
                            <tr key={index} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                              <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{item.produto_nome}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-[#2F855A]/20 text-[#2F855A] px-3 py-1 rounded-full text-sm font-bold">
                                  {item.quantidade_total}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center text-sm text-[#705A4D]">{item.producoes_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {producaoConcluida.itens?.length === 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-12 text-center">
                  <Factory size={64} className="mx-auto mb-4 text-[#8B5A3C]" />
                  <p className="text-xl font-serif text-[#3E2723]">Nenhuma produção concluída no período</p>
                  <p className="text-[#705A4D] mt-2">Ajuste os filtros de data para ver resultados.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: RESUMO PEDIDOS */}
      {activeTab === 'pedidos-resumo' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-2xl font-serif font-semibold text-[#3E2723]">Resumo de Itens dos Pedidos Ativos</h2>
            <div className="flex gap-2">
              <Button onClick={buscarPedidosResumo} disabled={loading} variant="outline" className="text-[#6B4423] border-[#6B4423]">
                <MagnifyingGlass size={18} className="mr-2" />
                Atualizar
              </Button>
              {pedidosResumo?.itens?.length > 0 && (
                <>
                  <Button onClick={exportarPdfPedidosResumo} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                    <FilePdf size={18} className="mr-2" weight="fill" />
                    PDF
                  </Button>
                  <Button onClick={exportarExcelPedidosResumo} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                    <FileXls size={18} className="mr-2" weight="fill" />
                    Excel
                  </Button>
                </>
              )}
            </div>
          </div>

          {pedidosResumo && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Tipos de Produtos</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{pedidosResumo.total_tipos_produto}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Unidades Totais</p>
                  <p className="text-3xl font-serif font-bold text-[#D97706]">{pedidosResumo.quantidade_total}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Valor Total</p>
                  <p className="text-3xl font-serif font-bold text-[#6B4423]">{formatCurrency(pedidosResumo.valor_total)}</p>
                </div>
              </div>

              {pedidosResumo.itens?.length > 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#8B5A3C]/15 bg-[#E8D5C4]">
                    <h3 className="text-xl font-serif font-semibold text-[#3E2723]">Itens dos Pedidos (Pendentes + Em Produção)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#F5E6D3]">
                        <tr>
                          <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Produto</th>
                          <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Qtd Total</th>
                          <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Nº Pedidos</th>
                          <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidosResumo.itens.map((item, index) => (
                          <tr key={index} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                            <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{item.produto_nome}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-[#6B4423]/20 text-[#6B4423] px-3 py-1 rounded-full text-sm font-bold">
                                {item.quantidade_total}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-[#705A4D]">{item.pedidos_count}</td>
                            <td className="px-6 py-4 text-right text-sm text-[#4A3B32] font-medium">{formatCurrency(item.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: VENDAS */}
      {activeTab === 'vendas' && (
        <div className="space-y-6">
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Início</label>
                <input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={buscarRelatorioVendas} disabled={loading} className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>

          {relatorioVendas && (
            <>
              <div className="flex justify-end gap-2 -mt-2">
                <Button onClick={exportarPdfVendas} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                  <FilePdf size={18} className="mr-2" weight="fill" />
                  PDF
                </Button>
                <Button onClick={exportarExcelVendas} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                  <FileXls size={18} className="mr-2" weight="fill" />
                  Excel
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total de Vendas</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{relatorioVendas.total_vendas}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Valor Total</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{formatCurrency(relatorioVendas.valor_total)}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Ticket Médio</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{formatCurrency(relatorioVendas.ticket_medio)}</p>
                </div>
              </div>

              {relatorioVendas.vendas_por_dia?.length > 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Vendas por Dia</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={relatorioVendas.vendas_por_dia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                      <XAxis dataKey="data" tick={{ fill: '#705A4D', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFDF8', border: '1px solid #8B5A3C40', borderRadius: '8px' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="valor" stroke="#6B4423" strokeWidth={2} name="Valor" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: PRODUÇÃO GERAL */}
      {activeTab === 'producao' && (
        <div className="space-y-6">
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-serif font-semibold text-[#3E2723] mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Início</label>
                <input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] font-sans"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={buscarRelatorioProducao} disabled={loading} className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>

          {relatorioProducao && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total Produções</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{relatorioProducao.total_producoes}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Concluídas</p>
                  <p className="text-3xl font-serif font-bold text-[#2F855A]">{relatorioProducao.concluidas}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Em Andamento</p>
                  <p className="text-3xl font-serif font-bold text-[#D97706]">{relatorioProducao.em_andamento}</p>
                </div>
              </div>

              {relatorioProducao.por_produto?.length > 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Produção por Produto</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={relatorioProducao.por_produto}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#8B5A3C20" />
                      <XAxis dataKey="produto" tick={{ fill: '#705A4D', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#705A4D', fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFDF8', border: '1px solid #8B5A3C40', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#6B4423" name="Quantidade" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: CLIENTES */}
      {activeTab === 'clientes' && (
        <div className="space-y-6">
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
            <Button onClick={buscarRelatorioClientes} disabled={loading} className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
              <MagnifyingGlass size={20} weight="bold" className="mr-2" />
              Gerar Relatório
            </Button>
          </div>

          {relatorioClientes && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Total de Clientes</p>
                  <p className="text-3xl font-serif font-bold text-[#3E2723]">{relatorioClientes.total_clientes}</p>
                </div>
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                  <p className="text-xs font-sans uppercase tracking-wider font-semibold text-[#8B5A3C] mb-2">Clientes Ativos</p>
                  <p className="text-3xl font-serif font-bold text-[#2F855A]">{relatorioClientes.clientes_ativos}</p>
                </div>
              </div>

              {relatorioClientes.top_clientes?.length > 0 && (
                <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#8B5A3C]/15">
                    <h3 className="text-xl font-serif font-semibold text-[#3E2723]">Top 10 Clientes</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#E8D5C4]">
                        <tr>
                          <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Cliente</th>
                          <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Total Compras</th>
                          <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorioClientes.top_clientes.map((cliente, index) => (
                          <tr key={index} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                            <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{cliente.cliente_nome}</td>
                            <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right">{cliente.total_compras}</td>
                            <td className="px-6 py-4 text-sm text-[#4A3B32] font-sans text-right font-medium">{formatCurrency(cliente.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
