import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, X } from '@phosphor-icons/react';
import CupomVenda from './CupomVenda';
import { useEmpresa } from '../../contexts/EmpresaContext';

export default function CupomVendaModal({ open, onClose, venda }) {
  const cupomRef = useRef(null);
  const { empresa, logo } = useEmpresa();

  const handleImprimir = () => {
    const conteudo = cupomRef.current;
    if (!conteudo) return;

    // Criar janela de impressão
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir o cupom.');
      return;
    }

    // HTML do cupom para impressão
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cupom de Venda</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              padding: 10px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #666;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .header img {
              max-height: 50px;
              margin-bottom: 5px;
            }
            .header h1 {
              font-size: 14px;
              margin: 5px 0;
            }
            .header p {
              font-size: 10px;
              margin: 2px 0;
            }
            .info {
              border-bottom: 1px dashed #666;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .info p {
              margin: 3px 0;
            }
            .items {
              border-bottom: 1px dashed #666;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .items table {
              width: 100%;
              border-collapse: collapse;
            }
            .items th {
              text-align: left;
              border-bottom: 1px solid #999;
              padding: 3px 0;
              font-size: 10px;
            }
            .items th:nth-child(2),
            .items td:nth-child(2) {
              text-align: center;
            }
            .items th:nth-child(3),
            .items th:nth-child(4),
            .items td:nth-child(3),
            .items td:nth-child(4) {
              text-align: right;
            }
            .items td {
              padding: 3px 0;
              font-size: 10px;
            }
            .sabores {
              font-size: 9px;
              color: #666;
              padding-left: 10px;
            }
            .totais {
              border-bottom: 1px dashed #666;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .totais .row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .totais .total {
              font-size: 16px;
              font-weight: bold;
            }
            .pagamento {
              border-bottom: 1px dashed #666;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .pagamento .row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .pendente {
              color: #c00;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              font-size: 10px;
              padding-top: 10px;
            }
            .footer .aviso {
              margin-top: 10px;
              color: #666;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${conteudo.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!venda) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Cupom de Venda</span>
            <div className="flex gap-2">
              <Button
                onClick={handleImprimir}
                className="bg-[#6B4423] text-white hover:bg-[#8B5A3C] flex items-center gap-2"
              >
                <Printer size={18} /> Imprimir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <CupomVenda 
            ref={cupomRef}
            venda={venda} 
            empresa={empresa}
            logo={logo}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
