import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'sonner';

// Dados da empresa Sussu Chocolates
const EMPRESA = {
  nome: 'SUSSU CHOCOLATES',
  telefone: '(43) 99967-6206',
  endereco: 'Rua Quintino Bocaiuva, 737',
  cidade: 'Jacarezinho - PR',
  cep: '86400-000',
  email: 'sussuchocolates@hotmail.com'
};

const formatarSaboresPDF = (sabores) => {
  if (!sabores || sabores.length === 0) return '';
  return sabores.map(s => `${s.quantidade === 0.5 ? '½' : s.quantidade} ${s.sabor || s.nome}`).join(' + ');
};

export const generateVendaPDF = async (venda, clientes = []) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cores da marca
  const marromEscuro = [62, 39, 35]; // #3E2723
  const marromMedio = [107, 68, 35]; // #6B4423
  const bege = [245, 230, 211]; // #F5E6D3

  // Carregar o logo
  let logoLoaded = false;
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
      logoImg.src = '/logo-sussu.png';
    });

    const canvas = document.createElement('canvas');
    canvas.width = logoImg.width;
    canvas.height = logoImg.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(logoImg, 0, 0);
    const logoBase64 = canvas.toDataURL('image/png');

    doc.setFillColor(...bege);
    doc.rect(0, 0, pageWidth, 50, 'F');

    const logoWidth = 35;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoBase64, 'PNG', 15, 5, logoWidth, logoHeight);
    logoLoaded = true;
  } catch (e) {
    console.log('Não foi possível carregar o logo, usando texto');
    doc.setFillColor(...bege);
    doc.rect(0, 0, pageWidth, 45, 'F');
  }

  const textStartX = logoLoaded ? 55 : 15;
  const headerHeight = logoLoaded ? 50 : 45;

  doc.setFontSize(logoLoaded ? 18 : 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text(EMPRESA.nome, textStartX, logoLoaded ? 15 : 18);

  doc.setDrawColor(...marromMedio);
  doc.setLineWidth(0.5);
  doc.line(textStartX, logoLoaded ? 19 : 22, pageWidth - 15, logoLoaded ? 19 : 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...marromMedio);
  doc.text(`Tel: ${EMPRESA.telefone}`, textStartX, logoLoaded ? 25 : 28);
  doc.text(`${EMPRESA.endereco}, ${EMPRESA.cidade}`, textStartX, logoLoaded ? 30 : 33);
  doc.text(`CEP: ${EMPRESA.cep}`, textStartX, logoLoaded ? 35 : 38);
  doc.text(`Email: ${EMPRESA.email}`, textStartX, logoLoaded ? 40 : 43);

  // ===== DADOS DA VENDA =====
  doc.setFillColor(...marromMedio);
  doc.rect(0, headerHeight + 3, pageWidth, 10, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const tituloVenda = venda.status_venda === 'cancelada'
    ? `VENDA CANCELADA — ${venda.tipo_venda === 'direta' ? 'DIRETA' : 'PEDIDO'}`
    : `VENDA — ${venda.tipo_venda === 'direta' ? 'DIRETA' : 'PEDIDO'}`;
  doc.text(tituloVenda, 15, headerHeight + 10);

  const dataVenda = new Date(venda.data_venda).toLocaleString('pt-BR');
  doc.text(`${dataVenda}`, pageWidth - 15, headerHeight + 10, { align: 'right' });

  // ===== DADOS DO CLIENTE =====
  let yPos = headerHeight + 23;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text('DADOS DO CLIENTE', 15, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const cliente = clientes.find(c => c.id === venda.cliente_id);

  doc.text(`Nome: ${venda.cliente_nome || 'Consumidor'}`, 15, yPos);
  yPos += 5;

  if (cliente) {
    if (cliente.telefone) {
      doc.text(`Telefone: ${cliente.telefone}`, 15, yPos);
      yPos += 5;
    }
    if (cliente.email) {
      doc.text(`Email: ${cliente.email}`, 15, yPos);
      yPos += 5;
    }
    if (cliente.endereco) {
      doc.text(`Endereço: ${cliente.endereco}`, 15, yPos);
      yPos += 5;
    }
    if (cliente.cpf_cnpj) {
      doc.text(`CPF/CNPJ: ${cliente.cpf_cnpj}`, 15, yPos);
      yPos += 5;
    }
  }

  yPos += 4;

  // ===== ITENS DA VENDA =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text('ITENS DA VENDA', 15, yPos);
  yPos += 3;

  const tableData = (venda.items || []).map((item, index) => {
    const sabores = formatarSaboresPDF(item.sabores);
    const nomeProduto = sabores ? `${item.produto_nome}\n${sabores}` : item.produto_nome;
    return [
      index + 1,
      nomeProduto,
      item.quantidade,
      formatCurrency(item.preco_unitario),
      formatCurrency(item.subtotal)
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Produto', 'Qtd', 'Preço Unit.', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: marromMedio,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      textColor: marromEscuro,
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [250, 245, 235]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 15, right: 15 }
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // ===== TOTAIS =====
  const subtotalVenda = venda.subtotal ?? (venda.items || []).reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const valorDesconto = venda.valor_desconto || 0;

  if (valorDesconto > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...marromEscuro);
    doc.text('Subtotal:', pageWidth - 75, yPos);
    doc.text(formatCurrency(subtotalVenda), pageWidth - 20, yPos, { align: 'right' });
    yPos += 5;
    doc.setTextColor(34, 139, 75);
    doc.text('Desconto:', pageWidth - 75, yPos);
    doc.text(`-${formatCurrency(valorDesconto)}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
  }

  doc.setFillColor(...bege);
  doc.rect(pageWidth - 80, yPos - 5, 65, 12, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text('TOTAL:', pageWidth - 75, yPos + 3);
  doc.text(formatCurrency(venda.valor_total), pageWidth - 20, yPos + 3, { align: 'right' });

  yPos += 18;

  // ===== PAGAMENTO =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text('PAGAMENTO', 15, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (venda.formas_pagamento && venda.formas_pagamento.length > 0) {
    venda.formas_pagamento.forEach((fp) => {
      const parcelasTxt = fp.tipo === 'Cartão de Crédito' && fp.parcelas > 1 ? ` (${fp.parcelas}x)` : '';
      doc.text(`${fp.tipo}${parcelasTxt}`, 15, yPos);
      doc.text(formatCurrency(fp.valor), pageWidth - 15, yPos, { align: 'right' });
      yPos += 5;
    });
  } else {
    const parcelasTxt = venda.forma_pagamento === 'Cartão de Crédito' && venda.parcelas > 1 ? ` (${venda.parcelas}x)` : '';
    doc.text(`${venda.forma_pagamento || 'Não informado'}${parcelasTxt}`, 15, yPos);
    doc.text(formatCurrency(venda.valor_total), pageWidth - 15, yPos, { align: 'right' });
    yPos += 5;
  }

  if (venda.status_pagamento === 'pendente') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6);
    const pendente = venda.valor_pendente ?? venda.valor_total;
    doc.text(`SALDO PENDENTE: ${formatCurrency(pendente)}`, 15, yPos);
    yPos += 5;
    if (venda.data_previsao_pagamento) {
      doc.setFont('helvetica', 'normal');
      const prev = new Date(venda.data_previsao_pagamento).toLocaleDateString('pt-BR');
      doc.text(`Previsão de pagamento: ${prev}`, 15, yPos);
      yPos += 5;
    }
  } else if (venda.valor_pago_parcial != null && venda.valor_pago_parcial < venda.valor_total) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...marromEscuro);
    doc.text(`Pago até o momento: ${formatCurrency(venda.valor_pago_parcial)}`, 15, yPos);
    yPos += 5;
  }

  doc.setTextColor(...marromEscuro);
  yPos += 4;

  // ===== STATUS DA VENDA / CANCELAMENTO =====
  if (venda.status_venda === 'cancelada') {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 30, 30);
    doc.text('VENDA CANCELADA', 15, yPos);
    yPos += 6;
    if (venda.motivo_cancelamento) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const splitMotivo = doc.splitTextToSize(`Motivo: ${venda.motivo_cancelamento}`, pageWidth - 30);
      doc.text(splitMotivo, 15, yPos);
      yPos += splitMotivo.length * 5 + 3;
    }
    doc.setTextColor(...marromEscuro);
  }

  // ===== NFC-e =====
  if (venda.nfce_emitida) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NFC-e emitida', 15, yPos);
    if (venda.nfce_numero) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Número: ${venda.nfce_numero}`, 55, yPos);
    }
    yPos += 5;
    if (venda.nfce_chave) {
      doc.setFontSize(8);
      doc.text(`Chave: ${venda.nfce_chave}`, 15, yPos);
      yPos += 5;
    }
  }

  // ===== OBSERVAÇÕES =====
  if (venda.observacoes_pagamento) {
    yPos += 3;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...marromEscuro);
    doc.text('OBSERVAÇÕES', 15, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(venda.observacoes_pagamento, pageWidth - 30);
    doc.text(splitObs, 15, yPos);
    yPos += splitObs.length * 5 + 5;
  }

  // ===== RODAPÉ =====
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...marromMedio);
  doc.setLineWidth(0.3);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...marromMedio);
  doc.text('Obrigado pela preferência!', pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text(`${EMPRESA.nome} - Chocolates Artesanais`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  const nomeArquivo = (venda.cliente_nome || 'cliente').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const dataArquivo = new Date(venda.data_venda).toISOString().slice(0, 10);
  doc.save(`Venda_${dataArquivo}_${nomeArquivo}.pdf`);
  toast.success('PDF gerado com sucesso!');
};
