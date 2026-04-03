import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

// Dados da empresa para cabeçalho dos relatórios
export const EMPRESA = {
  nome: 'SUSSU CHOCOLATES',
  telefone: '(43) 99967-6206',
  endereco: 'Rua Quintino Bocaiuva, 737, Jacarezinho - PR, CEP: 86400-000',
  email: 'sussuchocolates@hotmail.com'
};

// Cores padrão para gráficos
export const COLORS = ['#6B4423', '#8B5A3C', '#A67C5B', '#C4A77D', '#D4B896', '#E8D5C4'];

/**
 * Adiciona cabeçalho padrão da empresa no PDF
 */
export const addPdfHeader = (doc, titulo, subtitulo = '') => {
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

/**
 * Exportar para PDF - Itens a Produzir
 */
export const exportarPdfProducaoPendente = (producaoPendente) => {
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

/**
 * Exportar para Excel - Itens a Produzir
 */
export const exportarExcelProducaoPendente = (producaoPendente) => {
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
  ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Itens a Produzir');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, 'Relatorio_Itens_a_Produzir.xlsx');
  toast.success('Excel exportado com sucesso!');
};

/**
 * Exportar para PDF - Itens Produzidos
 */
export const exportarPdfProducaoConcluida = (producaoConcluida, filtros) => {
  if (!producaoConcluida?.itens?.length) {
    toast.error('Nenhum dado para exportar');
    return;
  }

  const doc = new jsPDF();
  const periodo = filtros.data_inicio && filtros.data_fim 
    ? `Período: ${new Date(filtros.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(filtros.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : '';
  const startY = addPdfHeader(doc, 'RELATÓRIO DE ITENS PRODUZIDOS', periodo);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(62, 39, 35);
  doc.text(`Total de itens produzidos: ${producaoConcluida.quantidade_total || 0}`, 15, startY);

  const tableData = producaoConcluida.itens.map((item, index) => [
    index + 1,
    item.produto_nome,
    item.quantidade,
    item.responsavel || '-',
    item.data_conclusao ? new Date(item.data_conclusao).toLocaleString('pt-BR') : '-'
  ]);

  autoTable(doc, {
    startY: startY + 8,
    head: [['#', 'Produto', 'Quantidade', 'Responsável', 'Data Conclusão']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [107, 68, 35], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: [62, 39, 35] },
    alternateRowStyles: { fillColor: [250, 245, 235] }
  });

  doc.save('Relatorio_Itens_Produzidos.pdf');
  toast.success('PDF exportado com sucesso!');
};

/**
 * Exportar para Excel - Itens Produzidos
 */
export const exportarExcelProducaoConcluida = (producaoConcluida, filtros) => {
  if (!producaoConcluida?.itens?.length) {
    toast.error('Nenhum dado para exportar');
    return;
  }

  const periodo = filtros.data_inicio && filtros.data_fim 
    ? `Período: ${new Date(filtros.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(filtros.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : 'Todos os períodos';

  const wsData = [
    ['SUSSU CHOCOLATES - RELATÓRIO DE ITENS PRODUZIDOS'],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [periodo],
    [],
    ['#', 'Produto', 'Quantidade', 'Responsável', 'Data Conclusão'],
    ...producaoConcluida.itens.map((item, index) => [
      index + 1,
      item.produto_nome,
      item.quantidade,
      item.responsavel || '-',
      item.data_conclusao ? new Date(item.data_conclusao).toLocaleString('pt-BR') : '-'
    ]),
    [],
    ['', 'TOTAL', producaoConcluida.quantidade_total || 0, '', '']
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Itens Produzidos');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, 'Relatorio_Itens_Produzidos.xlsx');
  toast.success('Excel exportado com sucesso!');
};

/**
 * Exportar para PDF - Por Data de Entrega
 */
export const exportarPdfProducaoPorDataEntrega = (producaoPorDataEntrega, filtros) => {
  if (!producaoPorDataEntrega?.pedidos?.length) {
    toast.error('Nenhum dado para exportar');
    return;
  }

  const doc = new jsPDF('landscape');
  const periodo = filtros.data_inicio && filtros.data_fim 
    ? `Período: ${new Date(filtros.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(filtros.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : '';
  const startY = addPdfHeader(doc, 'RELATÓRIO DE PRODUÇÃO POR DATA DE ENTREGA', periodo);

  const tableData = producaoPorDataEntrega.pedidos.map((pedido, index) => [
    index + 1,
    pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-',
    pedido.pedido_numero || '-',
    pedido.cliente_nome || '-',
    pedido.cliente_telefone || '-',
    pedido.itens?.map(i => `${i.produto_nome} (${i.quantidade})`).join('\n') || '-',
    pedido.status || '-'
  ]);

  autoTable(doc, {
    startY: startY + 5,
    head: [['#', 'Data Entrega', 'Pedido', 'Cliente', 'Telefone', 'Itens', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [107, 68, 35], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { textColor: [62, 39, 35], fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 245, 235] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 30 },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 25 }
    }
  });

  doc.save('Relatorio_Por_Data_Entrega.pdf');
  toast.success('PDF exportado com sucesso!');
};

/**
 * Exportar para Excel - Por Data de Entrega
 */
export const exportarExcelProducaoPorDataEntrega = (producaoPorDataEntrega, filtros) => {
  if (!producaoPorDataEntrega?.pedidos?.length) {
    toast.error('Nenhum dado para exportar');
    return;
  }

  const periodo = filtros.data_inicio && filtros.data_fim 
    ? `Período: ${new Date(filtros.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(filtros.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : 'Todos os períodos';

  const wsData = [
    ['SUSSU CHOCOLATES - RELATÓRIO DE PRODUÇÃO POR DATA DE ENTREGA'],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [periodo],
    [],
    ['#', 'Data Entrega', 'Pedido', 'Cliente', 'Telefone', 'Itens', 'Status'],
    ...producaoPorDataEntrega.pedidos.map((pedido, index) => [
      index + 1,
      pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-',
      pedido.pedido_numero || '-',
      pedido.cliente_nome || '-',
      pedido.cliente_telefone || '-',
      pedido.itens?.map(i => `${i.produto_nome} (${i.quantidade})`).join('; ') || '-',
      pedido.status || '-'
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 60 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Por Data Entrega');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, 'Relatorio_Por_Data_Entrega.xlsx');
  toast.success('Excel exportado com sucesso!');
};

/**
 * Exportar para PDF - Resumo de Pedidos
 */
export const exportarPdfPedidosResumo = (pedidosResumo) => {
  if (!pedidosResumo) {
    toast.error('Nenhum dado para exportar');
    return;
  }

  const doc = new jsPDF();
  const startY = addPdfHeader(doc, 'RESUMO DE PEDIDOS');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(62, 39, 35);
  
  let y = startY + 5;
  doc.text(`Total de Pedidos: ${pedidosResumo.total_pedidos || 0}`, 15, y);
  y += 8;
  doc.text(`Valor Total: R$ ${(pedidosResumo.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 15, y);
  y += 12;

  // Status dos Pedidos
  doc.setFontSize(11);
  doc.text('Status dos Pedidos:', 15, y);
  y += 8;

  const statusData = Object.entries(pedidosResumo.por_status || {}).map(([status, quantidade]) => [
    status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    quantidade
  ]);

  if (statusData.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Status', 'Quantidade']],
      body: statusData,
      theme: 'striped',
      headStyles: { fillColor: [107, 68, 35], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [62, 39, 35] },
      alternateRowStyles: { fillColor: [250, 245, 235] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'center' }
      },
      margin: { left: 15, right: 15 }
    });
  }

  doc.save('Resumo_Pedidos.pdf');
  toast.success('PDF exportado com sucesso!');
};

/**
 * Exportar para Excel - Resumo de Pedidos
 */
export const exportarExcelPedidosResumo = (pedidosResumo) => {
  if (!pedidosResumo) {
    toast.error('Nenhum dado para exportar');
    return;
  }

  const wsData = [
    ['SUSSU CHOCOLATES - RESUMO DE PEDIDOS'],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [],
    ['Total de Pedidos', pedidosResumo.total_pedidos || 0],
    ['Valor Total', `R$ ${(pedidosResumo.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    [],
    ['STATUS', 'QUANTIDADE'],
    ...Object.entries(pedidosResumo.por_status || {}).map(([status, quantidade]) => [
      status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      quantidade
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resumo Pedidos');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, 'Resumo_Pedidos.xlsx');
  toast.success('Excel exportado com sucesso!');
};
