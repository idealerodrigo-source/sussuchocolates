f = open('frontend/src/pages/RelatoriosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = "              {relatorioVendas.vendas_por_dia?.length > 0 && ("
new = (
    "              <div className=\"bg-[#FFFDF8] border border-orange-200 rounded-xl p-4 mb-4\">\n"
    "                <div className=\"flex items-center justify-between\">\n"
    "                  <div>\n"
    "                    <p className=\"text-sm font-semibold text-orange-600\">Total A Receber</p>\n"
    "                    <p className=\"text-2xl font-bold text-orange-700\">{formatCurrency(devedores.reduce((acc, d) => acc + d.total_pendente, 0))}</p>\n"
    "                    <p className=\"text-xs text-orange-600\">{devedores.length} cliente(s) com saldo pendente</p>\n"
    "                  </div>\n"
    "                  <div className=\"flex gap-2\">\n"
    "                    <button onClick={exportarPdfDevedores} className=\"px-3 py-1.5 text-xs text-red-600 border border-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1\">PDF Devedores</button>\n"
    "                    <button onClick={exportarExcelDevedores} className=\"px-3 py-1.5 text-xs text-green-600 border border-green-600 rounded-lg hover:bg-green-50 flex items-center gap-1\">Excel Devedores</button>\n"
    "                  </div>\n"
    "                </div>\n"
    "              </div>\n\n"
    "              {relatorioVendas.vendas_por_dia?.length > 0 && ("
)
result = content.replace(old, new, 1)
open('frontend/src/pages/RelatoriosPage.js', 'w', encoding='utf-8').write(result)
print("Done" if result != content else "NOT FOUND")