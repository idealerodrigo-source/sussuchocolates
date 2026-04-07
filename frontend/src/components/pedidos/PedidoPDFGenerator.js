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

export const generatePedidoPDF = async (pedido, clientes) => {
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
    
    // Adicionar logo ao PDF
    const canvas = document.createElement('canvas');
    canvas.width = logoImg.width;
    canvas.height = logoImg.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(logoImg, 0, 0);
    const logoBase64 = canvas.toDataURL('image/png');
    
    // Fundo do cabeçalho
    doc.setFillColor(...bege);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Adicionar logo (proporção mantida)
    const logoWidth = 35;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoBase64, 'PNG', 15, 5, logoWidth, logoHeight);
    logoLoaded = true;
  } catch (e) {
    console.log('Não foi possível carregar o logo, usando texto');
    // Fundo do cabeçalho sem logo
    doc.setFillColor(...bege);
    doc.rect(0, 0, pageWidth, 45, 'F');
  }
  
  // Dados da empresa (ao lado do logo ou no topo)
  const textStartX = logoLoaded ? 55 : 15;
  const headerHeight = logoLoaded ? 50 : 45;
  
  doc.setFontSize(logoLoaded ? 18 : 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text(EMPRESA.nome, textStartX, logoLoaded ? 15 : 18);
  
  // Linha decorativa
  doc.setDrawColor(...marromMedio);
  doc.setLineWidth(0.5);
  doc.line(textStartX, logoLoaded ? 19 : 22, pageWidth - 15, logoLoaded ? 19 : 22);
  
  // Dados da empresa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...marromMedio);
  doc.text(`Tel: ${EMPRESA.telefone}`, textStartX, logoLoaded ? 25 : 28);
  doc.text(`${EMPRESA.endereco}, ${EMPRESA.cidade}`, textStartX, logoLoaded ? 30 : 33);
  doc.text(`CEP: ${EMPRESA.cep}`, textStartX, logoLoaded ? 35 : 38);
  doc.text(`Email: ${EMPRESA.email}`, textStartX, logoLoaded ? 40 : 43);
  
  // ===== DADOS DO PEDIDO =====
  doc.setFillColor(...marromMedio);
  doc.rect(0, headerHeight + 3, pageWidth, 10, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`PEDIDO Nº ${pedido.numero}`, 15, headerHeight + 10);
  
  const dataPedido = new Date(pedido.data_pedido).toLocaleDateString('pt-BR');
  doc.text(`Data: ${dataPedido}`, pageWidth - 50, headerHeight + 10);
  
  // ===== DADOS DO CLIENTE =====
  let yPos = headerHeight + 23;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text('DADOS DO CLIENTE', 15, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Buscar dados completos do cliente
  const cliente = clientes.find(c => c.id === pedido.cliente_id);
  
  doc.text(`Nome: ${pedido.cliente_nome}`, 15, yPos);
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
  }
  
  if (pedido.data_entrega) {
    const dataEntrega = new Date(pedido.data_entrega).toLocaleDateString('pt-BR');
    doc.setFont('helvetica', 'bold');
    doc.text(`Data de Entrega Prevista: ${dataEntrega}`, 15, yPos);
    yPos += 5;
  }
  
  yPos += 5;
  
  // ===== ITENS DO PEDIDO =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text('ITENS DO PEDIDO', 15, yPos);
  yPos += 3;
  
  // Tabela de itens
  const tableData = pedido.items.map((item, index) => [
    index + 1,
    item.produto_nome,
    item.quantidade,
    formatCurrency(item.preco_unitario),
    formatCurrency(item.subtotal)
  ]);
  
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
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // ===== TOTAL =====
  doc.setFillColor(...bege);
  doc.rect(pageWidth - 80, yPos - 5, 65, 12, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marromEscuro);
  doc.text('TOTAL:', pageWidth - 75, yPos + 3);
  doc.text(formatCurrency(pedido.valor_total), pageWidth - 20, yPos + 3, { align: 'right' });
  
  yPos += 15;
  
  // ===== OBSERVAÇÕES =====
  if (pedido.observacoes) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...marromEscuro);
    doc.text('OBSERVAÇÕES', 15, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(pedido.observacoes, pageWidth - 30);
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
  
  // Salvar o PDF
  doc.save(`Pedido_${pedido.numero}_${pedido.cliente_nome.replace(/\s+/g, '_')}.pdf`);
  toast.success('PDF gerado com sucesso!');
};

export const enviarWhatsApp = (pedido, clientes) => {
  const cliente = clientes.find(c => c.id === pedido.cliente_id);
  if (!cliente?.telefone) {
    toast.error('Cliente não possui telefone cadastrado');
    return;
  }
  
  const telefone = cliente.telefone.replace(/\D/g, '');
  const telefoneFormatado = telefone.startsWith('55') ? telefone : `55${telefone}`;
  
  const itensTexto = pedido.items.map(item => 
    `• ${item.quantidade}x ${item.produto_nome} - ${formatCurrency(item.subtotal)}`
  ).join('\n');
  
  const dataEntrega = pedido.data_entrega 
    ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR')
    : 'A combinar';
  
  const mensagem = `*SUSSU CHOCOLATES* 🍫\n\n` +
    `Olá ${pedido.cliente_nome}!\n\n` +
    `Segue o resumo do seu pedido *${pedido.numero}*:\n\n` +
    `${itensTexto}\n\n` +
    `*Total: ${formatCurrency(pedido.valor_total)}*\n\n` +
    `📅 Entrega: ${dataEntrega}\n\n` +
    `${pedido.observacoes ? `📝 Obs: ${pedido.observacoes}\n\n` : ''}` +
    `Obrigado pela preferência! 💛`;
  
  const urlWhatsApp = `https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;
  window.open(urlWhatsApp, '_blank');
};
