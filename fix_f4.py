f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Substituir linhas 85-87 (indices 84-86)
new_lines = lines[:84] + [
    '    const hoje = new Date();\n',
    '    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());\n',
    '    const inicioSemana = new Date(inicioDia);\n',
    '    inicioSemana.setDate(inicioDia.getDate() - inicioDia.getDay());\n',
    '    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);\n',
    '    return vendas.filter(venda => {\n',
    '      if (filtroStatus === "cancelada" && venda.status_venda !== "cancelada") return false;\n',
    '      if (filtroStatus !== "todos" && filtroStatus !== "cancelada" && venda.status_venda === "cancelada") return false;\n',
    '      if (filtroStatus === "pago" && venda.status_pagamento !== "pago") return false;\n',
    '      if (filtroStatus === "pendente" && venda.status_pagamento !== "pendente") return false;\n',
    '      if (filtroTipo !== "todos" && venda.tipo_venda !== filtroTipo) return false;\n',
    '      if (filtroClienteId && venda.cliente_id !== filtroClienteId) return false;\n',
    '      if (filtroPeriodo !== "todos") {\n',
    '        const dataVenda = new Date(venda.data_venda);\n',
    '        if (filtroPeriodo === "hoje" && dataVenda < inicioDia) return false;\n',
    '        if (filtroPeriodo === "semana" && dataVenda < inicioSemana) return false;\n',
    '        if (filtroPeriodo === "mes" && dataVenda < inicioMes) return false;\n',
    '      }\n',
    '      if (!searchTerm.trim()) return true;\n',
    '      const term = searchTerm.toLowerCase();\n',
    '      return (\n',
] + lines[87:]

open('frontend/src/pages/VendasPage.js', 'w', encoding='utf-8').write(''.join(new_lines))
print("Done")