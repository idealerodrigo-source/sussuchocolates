f = open('frontend/src/pages/RelatoriosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

new_funcs = (
    "\n  // Exportar PDF Devedores\n"
    "  const exportarPdfDevedores = () => {\n"
    "    if (!devedores || devedores.length === 0) { toast.error('Nenhum devedor'); return; }\n"
    "    const doc = new jsPDF();\n"
    "    const startY = addPdfHeader(doc, 'RELATORIO DE DEVEDORES', new Date().toLocaleDateString('pt-BR'));\n"
    "    const total = devedores.reduce((acc, d) => acc + d.total_pendente, 0);\n"
    "    doc.setFontSize(11);\n"
    "    doc.text('Total Pendente: ' + formatCurrency(total), 15, startY);\n"
    "    doc.text('Clientes: ' + devedores.length, 15, startY + 6);\n"
    "    const tableData = [...devedores].sort((a,b) => b.total_pendente - a.total_pendente).map(d => [d.cliente_nome, d.num_vendas, formatCurrency(d.total_pendente)]);\n"
    "    autoTable(doc, { startY: startY + 14, head: [['Cliente', 'Vendas', 'Total Pendente']], body: tableData, theme: 'striped', headStyles: { fillColor: [107, 68, 35], textColor: 255 }, columnStyles: { 2: { halign: 'right' } } });\n"
    "    doc.save('Devedores.pdf');\n"
    "    toast.success('PDF exportado!');\n"
    "  };\n"
    "\n"
    "  const exportarExcelDevedores = () => {\n"
    "    if (!devedores || devedores.length === 0) { toast.error('Nenhum devedor'); return; }\n"
    "    const total = devedores.reduce((acc, d) => acc + d.total_pendente, 0);\n"
    "    const wsData = [['SUSSU CHOCOLATES - DEVEDORES'], ['Gerado em: ' + new Date().toLocaleString('pt-BR')], ['Total: ' + formatCurrency(total)], [], ['Cliente', 'Vendas', 'Total Pendente'], ...[...devedores].sort((a,b) => b.total_pendente - a.total_pendente).map(d => [d.cliente_nome, d.num_vendas, d.total_pendente])];\n"
    "    const ws = XLSX.utils.aoa_to_sheet(wsData);\n"
    "    ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 15 }];\n"
    "    const wb = XLSX.utils.book_new();\n"
    "    XLSX.utils.book_append_sheet(wb, ws, 'Devedores');\n"
    "    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });\n"
    "    saveAs(new Blob([excelBuffer]), 'Devedores.xlsx');\n"
    "    toast.success('Excel exportado!');\n"
    "  };\n\n"
)

old = "  const buscarRelatorioVendas = async () => {"
result = content.replace(old, new_funcs + "  const buscarRelatorioVendas = async () => {", 1)
open('frontend/src/pages/RelatoriosPage.js', 'w', encoding='utf-8').write(result)
print("Done" if 'exportarPdfDevedores' in result else "NOT FOUND")
