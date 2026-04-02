import React, { forwardRef } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const CupomVenda = forwardRef(({ venda, empresa, logo }, ref) => {
  if (!venda) return null;

  const formatarSabores = (sabores) => {
    if (!sabores || sabores.length === 0) return null;
    return sabores.map(s => `½ ${s.sabor}`).join(' + ');
  };

  const formatarQuantidade = (qtd) => {
    if (qtd === Math.floor(qtd)) return qtd.toString();
    return `${qtd.toFixed(1).replace('.', ',')}`;
  };

  // Calcular totais
  const subtotal = venda.items?.reduce((acc, item) => acc + (item.subtotal || 0), 0) || venda.valor_total;
  const desconto = venda.desconto_valor || 0;
  const total = venda.valor_total || 0;

  return (
    <div ref={ref} className="cupom-venda bg-white p-6 max-w-md mx-auto font-mono text-sm">
      {/* Cabeçalho com dados da empresa */}
      <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
        {logo && (
          <img 
            src={logo} 
            alt="Logo" 
            className="h-16 mx-auto mb-2 object-contain"
          />
        )}
        <h1 className="text-lg font-bold">{empresa?.razao_social || 'SUSSU CHOCOLATES'}</h1>
        {empresa?.nome_fantasia && empresa.nome_fantasia !== empresa.razao_social && (
          <p className="text-sm">{empresa.nome_fantasia}</p>
        )}
        {empresa?.cnpj && (
          <p className="text-xs">CNPJ: {empresa.cnpj}</p>
        )}
        {empresa?.endereco && (
          <p className="text-xs">
            {empresa.endereco}
            {empresa.numero && `, ${empresa.numero}`}
            {empresa.bairro && ` - ${empresa.bairro}`}
          </p>
        )}
        {(empresa?.cidade || empresa?.uf) && (
          <p className="text-xs">
            {empresa.cidade}{empresa.uf && `/${empresa.uf}`}
            {empresa.cep && ` - CEP: ${empresa.cep}`}
          </p>
        )}
        {empresa?.telefone && (
          <p className="text-xs">Tel: {empresa.telefone}</p>
        )}
      </div>

      {/* Informações da venda */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
        <div className="flex justify-between">
          <span className="font-bold">CUPOM DE VENDA</span>
          <span>{venda.tipo_venda === 'direta' ? 'DIRETA' : 'PEDIDO'}</span>
        </div>
        {venda.pedido_numero && (
          <p>Pedido: {venda.pedido_numero}</p>
        )}
        <p>Data: {formatDateTime(venda.data_venda)}</p>
        <p>Cliente: {venda.cliente_nome || 'Consumidor'}</p>
        {venda.cliente_cpf && <p>CPF: {venda.cliente_cpf}</p>}
      </div>

      {/* Itens */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1">Item</th>
              <th className="text-center py-1">Qtd</th>
              <th className="text-right py-1">Unit.</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {venda.items?.map((item, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td className="py-1 pr-2" colSpan={item.sabores?.length > 0 ? 1 : 1}>
                    <span className="text-xs">{item.produto_nome}</span>
                  </td>
                  <td className="text-center py-1">{formatarQuantidade(item.quantidade)}</td>
                  <td className="text-right py-1">{formatCurrency(item.preco_unitario)}</td>
                  <td className="text-right py-1">{formatCurrency(item.subtotal)}</td>
                </tr>
                {item.sabores?.length > 0 && (
                  <tr>
                    <td colSpan="4" className="text-xs text-gray-600 pl-2 pb-1">
                      Sabores: {formatarSabores(item.sabores)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totais */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
        {desconto > 0 && (
          <>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Desconto:</span>
              <span>-{formatCurrency(desconto)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Pagamento */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
        <p className="font-bold">PAGAMENTO</p>
        {venda.formas_pagamento?.length > 0 ? (
          venda.formas_pagamento.map((fp, index) => (
            <div key={index} className="flex justify-between">
              <span>
                {fp.tipo}
                {fp.tipo === 'Cartão de Crédito' && fp.parcelas > 1 && ` (${fp.parcelas}x)`}
              </span>
              <span>{formatCurrency(fp.valor)}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between">
            <span>{venda.forma_pagamento || 'Não informado'}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        )}
        {venda.status_pagamento === 'pendente' && (
          <p className="text-orange-600 font-bold mt-1">* PAGAMENTO PENDENTE (A PRAZO)</p>
        )}
      </div>

      {/* Observações */}
      {venda.observacoes && (
        <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
          <p className="font-bold">OBSERVAÇÕES:</p>
          <p className="text-xs">{venda.observacoes}</p>
        </div>
      )}

      {/* Rodapé */}
      <div className="text-center text-xs pt-2">
        <p>Obrigado pela preferência!</p>
        <p className="mt-2">* Documento sem valor fiscal *</p>
        <p className="text-gray-500 mt-2">
          Impresso em: {new Date().toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Estilos de impressão inline */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .cupom-venda, .cupom-venda * {
            visibility: visible;
          }
          .cupom-venda {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 5mm;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
});

CupomVenda.displayName = 'CupomVenda';

export default CupomVenda;
