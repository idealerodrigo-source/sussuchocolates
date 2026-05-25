f = open('frontend/src/pages/RelatoriosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = "    if (relatorioVendas.vendas_por_dia?.length) {\n      const tableData = relatorioVendas.vendas_por_dia.map(v => [\n        v.data,\n        v.quantidade || 1,\n        formatCurrency(v.valor)\n      ]);\n\n      autoTable(doc, {\n        startY: startY + 20,\n        head: [['Data', 'Quantidade', 'Valor']],\n        body: tableData,\n        theme: 'striped',\n        headStyles: { fillColor: [107, 68, 35], textColor: 255 },\n        columnStyles: { 2: { halign: 'right' } }\n      });\n    }\n\n    doc.save('Relatorio_Vendas.pdf');"

new = "    const listaVendas = relatorioVendas.vendas_lista || [];\n    if (listaVendas.length) {\n      const tableData = listaVendas.map(v => [\n        v.data,\n        v.cliente,\n        v.tipo === 'pedido' ? 'Pedido' : 'Direta',\n        v.forma_pagamento,\n        v.status_pagamento === 'pago' ? 'Pago' : 'A Receber',\n        formatCurrency(v.valor_total)\n      ]);\n      autoTable(doc, {\n        startY: startY + 20,\n        head: [['Data', 'Cliente', 'Tipo', 'Pagamento', 'Status', 'Valor']],\n        body: tableData,\n        theme: 'striped',\n        headStyles: { fillColor: [107, 68, 35], textColor: 255 },\n        columnStyles: { 5: { halign: 'right' } },\n        styles: { fontSize: 8 }\n      });\n    }\n\n    doc.save('Relatorio_Vendas.pdf');"

result = content.replace(old, new, 1)

old2 = "      ['Data', 'Quantidade', 'Valor'],\n      ...(relatorioVendas.vendas_por_dia || []).map(v => [v.data, v.quantidade || 1, v.valor])"
new2 = "      ['Data', 'Cliente', 'Tipo', 'Pagamento', 'Status', 'Valor'],\n      ...(relatorioVendas.vendas_lista || []).map(v => [v.data, v.cliente, v.tipo, v.forma_pagamento, v.status_pagamento === 'pago' ? 'Pago' : 'A Receber', v.valor_total])"
result = result.replace(old2, new2, 1)

open('frontend/src/pages/RelatoriosPage.js', 'w', encoding='utf-8').write(result)
print("Done" if result != content else "NOT FOUND")