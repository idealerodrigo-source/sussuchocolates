/**
 * DANFE NFC-e — Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
 * Layout conforme Manual de Orientação SEFAZ (NT 2019.001)
 */
import { toast } from 'sonner';

const EMPRESA = {
  nome: '09.328.682 SUZETE CANDIDO XAVIER',
  fantasia: 'Sussu Chocolates',
  cnpj: '09.328.682/0001-30',
  ie: '904.290.17-30',
  endereco: 'Rua Quintino Bocaiuva, 737 - Centro',
  cidade: 'Jacarezinho - PR',
  cep: '86.400-000',
  telefone: '(43) 99967-6206',
  regime: 'Simples Nacional',
};

function formatarCNPJ(cnpj) {
  const n = cnpj.replace(/\D/g, '');
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatarChave(chave) {
  return (chave || '').replace(/(\d{4})/g, '$1 ').trim();
}

function formatCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(dt) {
  if (!dt) return '';
  try {
    return new Date(dt).toLocaleString('pt-BR');
  } catch { return String(dt); }
}

export function gerarHtmlDANFE(venda) {
  const isHomo = !venda.nfce_protocolo || venda.nfce_protocolo === '';
  const chave = venda.nfce_chave || '';
  const chaveFormatada = formatarChave(chave);
  const subtotal = (venda.items || []).reduce((a, i) => a + (i.subtotal || 0), 0);
  const desconto = venda.valor_desconto || 0;
  const total = venda.valor_total || 0;

  const formas = venda.formas_pagamento?.length > 0
    ? venda.formas_pagamento
    : [{ tipo: venda.forma_pagamento || 'Outros', valor: total }];

  const itensHtml = (venda.items || []).map((item, i) => `
    <tr>
      <td style="padding:3px 4px;border-bottom:1px dashed #ccc;font-size:11px">${String(i+1).padStart(3,'0')}</td>
      <td style="padding:3px 4px;border-bottom:1px dashed #ccc;font-size:11px">${item.produto_nome || ''}</td>
      <td style="padding:3px 4px;border-bottom:1px dashed #ccc;font-size:11px;text-align:center">${item.ncm || '18069000'}</td>
      <td style="padding:3px 4px;border-bottom:1px dashed #ccc;font-size:11px;text-align:center">${Number(item.quantidade||0).toFixed(3)}</td>
      <td style="padding:3px 4px;border-bottom:1px dashed #ccc;font-size:11px;text-align:center">${item.unidade_comercial || 'UN'}</td>
      <td style="padding:3px 4px;border-bottom:1px dashed #ccc;font-size:11px;text-align:right">${formatCurrency(item.preco_unitario)}</td>
      <td style="padding:3px 4px;border-bottom:1px dashed #ccc;font-size:11px;text-align:right"><b>${formatCurrency(item.subtotal)}</b></td>
    </tr>
  `).join('');

  const pagamentosHtml = formas.map(fp => `
    <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0">
      <span>${fp.tipo}</span>
      <span><b>${formatCurrency(fp.valor)}</b></span>
    </div>
  `).join('');

  const qrCodeUrl = venda.nfce_qrcode
    ? `<div style="text-align:center;margin:12px 0">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(venda.nfce_qrcode)}"
             style="width:180px;height:180px" alt="QR Code NFC-e" />
        <p style="font-size:9px;color:#666;margin:4px 0">Consulte a autenticidade em:</p>
        <p style="font-size:9px;font-weight:bold">www.sefaz.pr.gov.br/nfce</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFE NFC-e — ${EMPRESA.fantasia}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 72mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .hr-solid { border: none; border-top: 1px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 10px; text-align: left; background: #f0f0f0; padding: 3px 4px; border-bottom: 1px solid #000; }
    .homo { background: #fff3cd; border: 1px solid #ffc107; padding: 4px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; text-align: center; margin: 6px 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Botão imprimir (some na impressão) -->
  <div class="no-print" style="text-align:center;margin-bottom:10px">
    <button onclick="window.print()" style="background:#6B4423;color:white;border:none;padding:8px 24px;border-radius:6px;cursor:pointer;font-size:14px">
      🖨️ Imprimir DANFE
    </button>
  </div>

  <!-- Cabeçalho -->
  <div class="center">
    <div class="bold" style="font-size:14px">${EMPRESA.fantasia}</div>
    <div style="font-size:10px">${EMPRESA.nome}</div>
    <div style="font-size:10px">CNPJ: ${EMPRESA.cnpj}</div>
    <div style="font-size:10px">IE: ${EMPRESA.ie}</div>
    <div style="font-size:10px">${EMPRESA.endereco}</div>
    <div style="font-size:10px">${EMPRESA.cidade} — CEP: ${EMPRESA.cep}</div>
    <div style="font-size:10px">Tel: ${EMPRESA.telefone}</div>
  </div>

  <hr class="hr-solid">
  <div class="center bold" style="font-size:13px">DANFE NFC-e</div>
  <div class="center" style="font-size:10px">Documento Auxiliar da NFC-e</div>
  <div class="center" style="font-size:10px">Modelo 65 — Série 1 — Nº ${venda.nfce_numero || '—'}</div>

  ${isHomo ? `<div class="homo">⚠️ EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL</div>` : ''}

  <hr class="hr">

  <!-- Dados do Destinatário -->
  <div style="font-size:11px">
    <div><b>Data/Hora emissão:</b> ${formatDateTime(venda.data_venda)}</div>
    <div><b>Consumidor:</b> ${venda.cliente_nome || 'CONSUMIDOR FINAL'}</div>
  </div>

  <hr class="hr">

  <!-- Itens -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Descrição</th>
        <th>NCM</th>
        <th style="text-align:center">Qtd</th>
        <th style="text-align:center">Un</th>
        <th style="text-align:right">V.Unit</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itensHtml}
    </tbody>
  </table>

  <hr class="hr">

  <!-- Totais -->
  <div style="font-size:11px">
    <div style="display:flex;justify-content:space-between">
      <span>Qtd. total de itens:</span>
      <span>${(venda.items || []).length}</span>
    </div>
    ${desconto > 0 ? `
    <div style="display:flex;justify-content:space-between">
      <span>Subtotal:</span>
      <span>${formatCurrency(subtotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;color:green">
      <span>Desconto:</span>
      <span>-${formatCurrency(desconto)}</span>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;border-top:1px solid #000;margin-top:4px;padding-top:4px">
      <span>TOTAL:</span>
      <span>${formatCurrency(total)}</span>
    </div>
  </div>

  <hr class="hr">

  <!-- Pagamento -->
  <div style="font-size:11px">
    <div class="bold" style="margin-bottom:3px">FORMA DE PAGAMENTO</div>
    ${pagamentosHtml}
  </div>

  <hr class="hr">

  <!-- Tributos (Lei 12.741/2012) -->
  <div class="center" style="font-size:9px;color:#555">
    Valor aproximado dos tributos: R$ 0,00 (0,00%)
    Fonte: IBPT
  </div>

  <hr class="hr">

  <!-- Protocolo -->
  ${venda.nfce_protocolo ? `
  <div style="font-size:10px;text-align:center">
    <div class="bold">PROTOCOLO DE AUTORIZAÇÃO</div>
    <div>${venda.nfce_protocolo}</div>
  </div>
  <hr class="hr">` : ''}

  <!-- Chave de Acesso -->
  <div style="font-size:9px;text-align:center">
    <div class="bold" style="margin-bottom:3px">CHAVE DE ACESSO</div>
    <div style="word-break:break-all;font-family:monospace;font-size:9px;background:#f5f5f5;padding:4px;border-radius:3px">
      ${chaveFormatada || '—'}
    </div>
  </div>

  <!-- QR Code -->
  ${qrCodeUrl}

  <!-- Rodapé -->
  <hr class="hr-solid">
  <div class="center" style="font-size:9px;color:#555">
    <div>Consulte em: <b>www.sefaz.pr.gov.br/nfce</b></div>
    <div style="margin-top:4px">${EMPRESA.regime}</div>
    <div>Obrigado pela preferência!</div>
  </div>
</body>
</html>`;
}

export function imprimirDANFE(venda) {
  if (!venda) return;
  const html = gerarHtmlDANFE(venda);
  const win = window.open('', '_blank', 'width=400,height=700,scrollbars=yes');
  if (!win) {
    toast.error('Popup bloqueado. Permita popups para imprimir.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 800);
}
